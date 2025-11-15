/**
 * Stop-Motion Recorder Module
 * 
 * Allows manual frame-by-frame recording by capturing graph state snapshots on demand.
 * Users can click a button to record each frame, make manual changes, then record
 * the next frame, building up a stop-motion animation.
 * 
 * Supports both direct canvas capture and graph state capture with interpolation.
 */

import { VideoEncoder } from './video-encoder';
import { Graph } from '../models';
import {
  diffGraphStates,
  applyGraphState,
  interpolateNodePositions,
  createEdgeAnimationDrawables,
  createArrowAnimationDrawables,
} from './interpolation';

export interface GraphState {
  nodes: Map<number, { x: number; y: number; radius: number; strokeWidth: number; fillColor: string; strokeColor: string }>;
  edges: Array<{ fromId: number; toId: number; color: string; weight: number }>;
  arrows: Array<{ fromId: number; toId: number; color: string; width: number; headAtStart: boolean; headAtEnd: boolean }>;
  zigzagSpacing?: number;
  zigzagLength?: number;
  zigzagEndLengths?: number;
}

export interface StopMotionFrame {
  imageData: ImageData;
  graphState: GraphState;
  timestamp: number;
  duration: number; // Duration in ms for the transition TO this frame from the previous frame
}

export interface StopMotionRecorderOptions {
  canvas: HTMLCanvasElement;
  frameDuration?: number; // Default duration in ms to display each captured frame
  renderCallback?: (graph: Graph, extraElements?: any[]) => void; // Callback to render with a specific graph and extra elements
  scaleFactor?: number; // Scale factor for high-resolution rendering (default: 2)
}

/**
 * Records frames manually for stop-motion animation
 */
export class StopMotionRecorder {
  public readonly options: StopMotionRecorderOptions;
  private ctx: CanvasRenderingContext2D;
  private cels: StopMotionFrame[] = [];
  private frameDuration: number;
  private isRecording: boolean = false;
  private graphStateProvider: (() => GraphState) | null = null;
  private renderCallback: ((graph: Graph, extraElements?: any[]) => void) | null = null;

  constructor(options: StopMotionRecorderOptions) {
    this.options = options;
    this.frameDuration = options.frameDuration || 500; // Default 0.5 seconds per frame
    this.renderCallback = options.renderCallback || null;
    // scaleFactor is stored in options but not as a member variable since it's used in the render callback
    
    const ctx = options.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = ctx;
  }

  /**
   * Set a function that provides the current graph state
   * This enables interpolation between frames
   */
  setGraphStateProvider(provider: () => GraphState): void {
    this.graphStateProvider = provider;
  }

  /**
   * Set a callback function that renders the application
   * This enables using the full rendering pipeline including background and borders
   */
  setRenderCallback(callback: (graph: Graph, extraElements?: any[]) => void): void {
    this.renderCallback = callback;
  }

  /**
   * Start a new stop-motion recording session
   */
  start(): void {
    if (this.isRecording) {
      console.warn('Stop-motion recording already in progress');
      return;
    }
    
    this.cels = [];
    this.isRecording = true;
    console.log('Stop-motion recording started');
  }

  /**
   * Capture the current canvas state as a frame
   * Also captures the graph state if a provider is set
   * 
   * @param customDuration Optional duration (in ms) for the transition TO this frame from the previous frame.
   *                       This controls how long the animation/interpolation will take when transitioning
   *                       TO this captured state. Set this BEFORE capturing to control the timing of the
   *                       incoming transition. For example:
   *                       - Large changes + large duration = smooth, slow animation
   *                       - Small changes + small duration = quick, snappy animation
   *                       This enables creating videos with approximately regular movement speed.
   */
  captureFrame(customDuration?: number): void {
    if (!this.isRecording) {
      throw new Error('Not currently recording. Call start() first.');
    }

    // Capture the current canvas as ImageData
    const sourceImageData = this.ctx.getImageData(
      0,
      0,
      this.options.canvas.width,
      this.options.canvas.height
    );

    // Create a new ImageData object with a copy of the data
    // This is critical because ImageData can share underlying buffers
    const imageData = new ImageData(
      new Uint8ClampedArray(sourceImageData.data),
      sourceImageData.width,
      sourceImageData.height
    );

    // Capture graph state if provider is set
    const graphState = this.graphStateProvider ? this.graphStateProvider() : this.getEmptyGraphState();

    this.cels.push({
      imageData,
      graphState,
      timestamp: Date.now(),
      duration: customDuration !== undefined ? customDuration : this.frameDuration,
    });

    console.log(`Frame ${this.cels.length} captured (duration: ${customDuration !== undefined ? customDuration : this.frameDuration}ms)`);
  }

  /**
   * Get an empty graph state (for backward compatibility)
   */
  private getEmptyGraphState(): GraphState {
    return {
      nodes: new Map(),
      edges: [],
      arrows: [],
      zigzagSpacing: 4,
      zigzagLength: 3,
      zigzagEndLengths: 1.5,
    };
  }

  /**
   * Remove the last captured frame
   */
  removeLastFrame(): boolean {
    if (this.cels.length === 0) {
      return false;
    }
    
    this.cels.pop();
    console.log(`Last frame removed. ${this.cels.length} frames remaining`);
    return true;
  }

  /**
   * Stop recording and prepare for encoding
   */
  stop(): void {
    if (!this.isRecording) {
      console.warn('Not currently recording');
      return;
    }
    
    this.isRecording = false;
    console.log(`Stop-motion recording stopped. ${this.cels.length} frames captured`);
  }

  /**
   * Get the number of captured frames
   */
  getFrameCount(): number {
    return this.cels.length;
  }

  /**
   * Check if currently recording
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Set the frame duration for the final video
   */
  setFrameDuration(durationMs: number): void {
    this.frameDuration = durationMs;
  }

  /**
   * Get the current frame duration
   */
  getFrameDuration(): number {
    return this.frameDuration;
  }

  /**
   * Clear all captured frames
   */
  clear(): void {
    this.cels = [];
    console.log('All frames cleared');
  }

  /**
   * Generate interpolated frames between captured frames
   * 
   * This method creates smooth transitions by:
   * 1. Interpolating node positions between keyframes
   * 2. Showing edges/arrows that appear as growing partial lines
   * 3. Showing edges/arrows that disappear as shrinking partial lines
   * 4. Rendering with full application rendering pipeline (background, border, etc.)
   * 
   * @param fps Target frames per second for the video
   * @returns Array of render functions for each interpolated frame
   */
  private generateInterpolatedFrames(
    fps: number
  ): Array<{ render: (ctx: CanvasRenderingContext2D) => void; durationMs: number }> {
    const frameDurationMs = 1000 / fps;
    const videoFrames: Array<{ render: (ctx: CanvasRenderingContext2D) => void; durationMs: number }> = [];

    if (!this.renderCallback) {
      throw new Error('Render callback not set. Call setRenderCallback() before using interpolation.');
    }

    // Create a temporary graph for rendering interpolated states
    // Note: zigzag properties will be set from graphState for each frame during rendering

    // Iterate through pairs of captured frames
    for (let i = 0; i < this.cels.length - 1; i++) {
      const startFrame = this.cels[i];
      const endFrame = this.cels[i + 1];

      // Calculate how many intermediate frames we need based on the duration
      // Use endFrame.duration: this is the duration set BEFORE capturing the end frame,
      // representing how long we want the transition TO this frame to take
      const transitionDurationMs = endFrame.duration;
      const numIntermediateFrames = Math.max(1, Math.round(transitionDurationMs / frameDurationMs));

      // Calculate the diff once for this transition
      const diff = diffGraphStates(startFrame.graphState, endFrame.graphState);

      // Generate intermediate frames
      for (let j = 0; j < numIntermediateFrames; j++) {
        const progress = j / numIntermediateFrames;

        // Create a render function that captures the current progress and states
        const render = (ctx: CanvasRenderingContext2D) => {
          // Create a new temporary graph for this frame
          const tempGraph = new Graph();
          
          // Set zigzag properties from the captured state
          if (startFrame.graphState.zigzagSpacing !== undefined) {
            tempGraph.zigzagSpacing = startFrame.graphState.zigzagSpacing;
          }
          if (startFrame.graphState.zigzagLength !== undefined) {
            tempGraph.zigzagLength = startFrame.graphState.zigzagLength;
          }
          if (startFrame.graphState.zigzagEndLengths !== undefined) {
            tempGraph.zigzagEndLengths = startFrame.graphState.zigzagEndLengths;
          }
          
          // Create a hybrid state that:
          // - Has nodes from start frame (will be interpolated)
          // - Only has edges/arrows that exist in BOTH frames (common elements)
          const hybridState: GraphState = {
            nodes: startFrame.graphState.nodes,
            edges: startFrame.graphState.edges.filter(edge => {
              // Only include edges that are NOT being added or removed
              const edgeKey = (fromId: number, toId: number, color: string) => 
                `${Math.min(fromId, toId)}-${Math.max(fromId, toId)}-${color}`;
              const key = edgeKey(edge.fromId, edge.toId, edge.color);
              
              const isAdded = diff.addedEdges.some(e => 
                edgeKey(e.fromId, e.toId, e.color) === key
              );
              const isRemoved = diff.removedEdges.some(e => 
                edgeKey(e.fromId, e.toId, e.color) === key
              );
              
              return !isAdded && !isRemoved;
            }),
            arrows: startFrame.graphState.arrows.filter(arrow => {
              // Only include arrows that are NOT being added or removed
              const arrowKey = (fromId: number, toId: number, color: string) => 
                `${fromId}-${toId}-${color}`;
              const key = arrowKey(arrow.fromId, arrow.toId, arrow.color);
              
              const isAdded = diff.addedArrows.some(a => 
                arrowKey(a.fromId, a.toId, a.color) === key
              );
              const isRemoved = diff.removedArrows.some(a => 
                arrowKey(a.fromId, a.toId, a.color) === key
              );
              
              return !isAdded && !isRemoved;
            }),
          };

          // Apply the hybrid state
          applyGraphState(tempGraph, hybridState);

          // Interpolate node positions
          interpolateNodePositions(
            tempGraph,
            startFrame.graphState,
            endFrame.graphState,
            progress,
            diff.commonNodes
          );

          // Get edge and arrow animation drawables for appearing/disappearing elements
          const edgeDrawables = createEdgeAnimationDrawables(tempGraph, diff, progress);
          const arrowDrawables = createArrowAnimationDrawables(tempGraph, diff, progress);

          // Combine extra drawables
          const extraDrawables = [...edgeDrawables, ...arrowDrawables];

          // Use the render callback to render everything to the main canvas (background, graph, border, etc.)
          this.renderCallback!(tempGraph, extraDrawables);
          
          // Now copy from the main canvas to the video encoder's context
          ctx.drawImage(this.options.canvas, 0, 0);
        };

        videoFrames.push({
          render,
          durationMs: frameDurationMs,
        });
      }
    }

    // Add the final frame (hold on the last captured frame)
    // Render it the same way as interpolated frames for consistent styling
    const lastFrame = this.cels[this.cels.length - 1];
    videoFrames.push({
      render: (ctx: CanvasRenderingContext2D) => {
        // Create a new temporary graph for the final frame
        const tempGraph = new Graph();
        
        // Set zigzag properties from the captured state
        if (lastFrame.graphState.zigzagSpacing !== undefined) {
          tempGraph.zigzagSpacing = lastFrame.graphState.zigzagSpacing;
        }
        if (lastFrame.graphState.zigzagLength !== undefined) {
          tempGraph.zigzagLength = lastFrame.graphState.zigzagLength;
        }
        if (lastFrame.graphState.zigzagEndLengths !== undefined) {
          tempGraph.zigzagEndLengths = lastFrame.graphState.zigzagEndLengths;
        }
        
        // Apply the final graph state
        applyGraphState(tempGraph, lastFrame.graphState);
        
        // Render using the same callback for consistency
        this.renderCallback!(tempGraph, []);
        
        // Copy from the main canvas to the video encoder's context
        ctx.drawImage(this.options.canvas, 0, 0);
      },
      durationMs: lastFrame.duration,
    });

    return videoFrames;
  }

  /**
   * Encode the captured frames into a video
   * @param interpolate Whether to interpolate between frames
   * @param onProgress Progress callback
   */
  async encode(
    interpolate: boolean = false,
    onProgress?: (current: number, total: number) => void
  ): Promise<Blob> {
    if (this.cels.length === 0) {
      throw new Error('No frames to encode. Capture some frames first.');
    }

    console.log(`Encoding ${this.cels.length} frames (interpolate: ${interpolate})`);

    const fps = 30; // Standard 30 fps for video

    // Create encoder
    const encoder = new VideoEncoder({
      width: this.options.canvas.width,
      height: this.options.canvas.height,
      fps: fps,
      videoBitsPerSecond: 5000000,
    });

    let videoFrames;

    if (interpolate) {
      // Generate interpolated frames at 30 fps
      videoFrames = this.generateInterpolatedFrames(fps);
    } else {
      // Convert frames to render functions (no interpolation)
      videoFrames = this.cels.map((frame) => ({
        render: (ctx: CanvasRenderingContext2D) => {
          // Create a temporary canvas to draw the ImageData
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = frame.imageData.width;
          tempCanvas.height = frame.imageData.height;
          const tempCtx = tempCanvas.getContext('2d');
          
          if (tempCtx) {
            tempCtx.putImageData(frame.imageData, 0, 0);
            ctx.drawImage(tempCanvas, 0, 0);
          }
        },
        durationMs: frame.duration,
      }));
    }

    // Encode the video
    const blob = await encoder.encodeVideo(videoFrames, onProgress);
    
    console.log(`Video encoded: ${blob.size} bytes`);
    return blob;
  }

  /**
   * Encode and download the video
   * @param interpolate Whether to interpolate between frames
   * @param filename Output filename
   */
  async download(
    interpolate: boolean = false,
    filename: string = 'stop-motion-animation.webm'
  ): Promise<void> {
    const blob = await this.encode(interpolate);
    
    // Download the blob
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 500);
  }

  /**
   * Get all captured frames (for advanced usage like interpolation)
   */
  getFrames(): StopMotionFrame[] {
    return this.cels;
  }
}


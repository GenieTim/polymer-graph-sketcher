import { MovieMaker } from "../animation/movie-maker";
import { VideoEncoder } from "../animation/video-encoder";
import { StopMotionRecorder } from "../animation/stop-motion-recorder";
import { Node, Graph, Edge, Arrow } from "../models";
import { Container } from "../core/Container";
import { Application } from "../core/Application";
import { interpolateWithPBC, getBoxSize, GlobalSettings } from "../utils";
import type { UIFacade } from "./UIFacade";
import { CanvasFacade } from "./CanvasFacade";

/**
 * Facade for movie recording operations
 * Simplifies complex movie recording workflows
 */
export class MovieFacade {
  private movieMaker: MovieMaker | null = null;
  private stopMotionRecorder: StopMotionRecorder | null = null;
  private recordingEdges: Array<{
    type: "add" | "remove";
    fromNode: Node;
    toNode: Node;
    color: string;
    weight: number;
  }> = [];
  private isRecordingEdges: boolean = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private container: Container
  ) {}

  /**
   * Initialize the movie maker
   */
  initialize(): void {
    this.movieMaker = new MovieMaker({
      canvas: this.canvas,
      recorderOptions: {
        fps: 60,
        videoBitsPerSecond: 5000000,
      },
      animatorOptions: {
        targetFPS: 60,
      },
    });
  }

  /**
   * Get the movie maker instance
   */
  getMovieMaker(): MovieMaker | null {
    return this.movieMaker;
  }

  /**
   * Check if currently recording
   */
  get isRecording(): boolean {
    return this.isRecordingEdges;
  }

  /**
   * Get recorded edge count
   */
  get recordedEdgeCount(): number {
    return this.recordingEdges.length;
  }

  /**
   * Get serializable animation data for export/storage
   */
  getSerializableAnimationData(): any {
    const result: any = {};

    // Get stop-motion data if available
    if (this.stopMotionRecorder) {
      const frames = this.stopMotionRecorder.getFrames();
      if (frames.length > 0) {
        result.stopMotion = {
          frames: frames.map(frame => ({
            graphState: {
              nodes: Array.from(frame.graphState.nodes.entries()).map(([id, node]) => ({
                id,
                x: node.x,
                y: node.y,
                radius: node.radius,
                strokeWidth: node.strokeWidth,
                fillColor: node.fillColor,
                strokeColor: node.strokeColor,
              })),
              edges: frame.graphState.edges,
              arrows: frame.graphState.arrows,
              zigzagSpacing: frame.graphState.zigzagSpacing,
              zigzagLength: frame.graphState.zigzagLength,
              zigzagEndLengths: frame.graphState.zigzagEndLengths,
            },
            duration: frame.duration,
            timestamp: frame.timestamp,
          })),
          frameDuration: this.stopMotionRecorder.getFrameDuration(),
          isRecording: this.stopMotionRecorder.getIsRecording(),
        };
      }
    }

    // Get recorded edges data if available
    if (this.recordingEdges.length > 0 || this.isRecordingEdges) {
      result.recordedEdges = {
        edges: this.recordingEdges.map(edge => ({
          type: edge.type,
          fromNodeId: edge.fromNode.id,
          toNodeId: edge.toNode.id,
          color: edge.color,
          weight: edge.weight,
        })),
        isRecording: this.isRecordingEdges,
      };
    }

    return Object.keys(result).length > 0 ? result : null;
  }

  /**
   * Restore animation data from serialized format
   */
  restoreAnimationData(data: any, graph: Graph): void {
    const uiFacade = this.container.get<UIFacade>("ui");
    
    // Restore stop-motion frames
    if (data.stopMotion && data.stopMotion.frames) {
      const recorder = this.getStopMotionRecorder();
      
      // Clear existing frames
      recorder.clear();
      
      // Set frame duration
      if (data.stopMotion.frameDuration !== undefined) {
        recorder.setFrameDuration(data.stopMotion.frameDuration);
      }
      
      // Restore each frame
      // Note: We need to reconstruct the frames manually since they include ImageData
      // which cannot be serialized. We'll restore just the graph state.
      data.stopMotion.frames.forEach((frameData: any) => {
        // Convert nodes array back to Map
        const nodesMap = new Map();
        frameData.graphState.nodes.forEach((node: any) => {
          nodesMap.set(node.id, {
            x: node.x,
            y: node.y,
            radius: node.radius,
            strokeWidth: node.strokeWidth,
            fillColor: node.fillColor,
            strokeColor: node.strokeColor,
          });
        });

        // Create a dummy ImageData (will need to be re-captured for actual use)
        const dummyImageData = new ImageData(1, 1);

        // Add frame to recorder's internal state
        (recorder as any).cels.push({
          imageData: dummyImageData,
          graphState: {
            nodes: nodesMap,
            edges: frameData.graphState.edges,
            arrows: frameData.graphState.arrows,
            zigzagSpacing: frameData.graphState.zigzagSpacing,
            zigzagLength: frameData.graphState.zigzagLength,
            zigzagEndLengths: frameData.graphState.zigzagEndLengths,
          },
          duration: frameData.duration,
          timestamp: frameData.timestamp,
        });
      });

      // Restore recording state
      if (data.stopMotion.isRecording) {
        (recorder as any).isRecording = true;
      }
      
      const frameCount = data.stopMotion.frames.length;
      console.log(`Restored ${frameCount} stop-motion frames`);
      
      // Update UI to show restored frames
      if (data.stopMotion.isRecording) {
        uiFacade.updateStopMotionIndicator(
          `Recording... (${frameCount} frame${frameCount !== 1 ? 's' : ''})`,
          "red"
        );
        // Enable appropriate buttons for recording state
        this.updateStopMotionButtons(true, frameCount);
      } else if (frameCount > 0) {
        uiFacade.updateStopMotionIndicator(
          `${frameCount} frame${frameCount !== 1 ? 's' : ''} captured`,
          "green"
        );
        // Enable appropriate buttons for stopped state with frames
        this.updateStopMotionButtons(false, frameCount);
      }
    }

    // Restore recorded edges
    if (data.recordedEdges && data.recordedEdges.edges) {
      this.recordingEdges = data.recordedEdges.edges.map((edgeData: any) => {
        const fromNode = graph.getNode(edgeData.fromNodeId);
        const toNode = graph.getNode(edgeData.toNodeId);
        
        return {
          type: edgeData.type as "add" | "remove",
          fromNode: fromNode,
          toNode: toNode,
          color: edgeData.color,
          weight: edgeData.weight,
        };
      });
      
      // Restore recording state
      this.isRecordingEdges = data.recordedEdges.isRecording || false;
      
      console.log(`Restored ${this.recordingEdges.length} recorded edges`);
    }
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (a.parentNode) {
        a.parentNode.removeChild(a);
      }
      URL.revokeObjectURL(url);
    }, 500);
  }

  /**
   * Helper method to encode video frames using VideoEncoder
   * Reduces code duplication across different movie creation methods
   */
  private async encodeVideoFrames(
    frames: Array<{ action: () => void; duration: number }>,
    onProgress?: (current: number, total: number) => void
  ): Promise<Blob> {
    const encoder = new VideoEncoder({
      width: this.canvas.width,
      height: this.canvas.height,
      fps: 60,
      videoBitsPerSecond: 5000000,
    });

    const videoFrames = frames.map((frame) => ({
      render: (ctx: CanvasRenderingContext2D) => {
        // Execute the action which updates the graph and renders to main canvas
        frame.action();
        // Copy the main canvas to the encoder's canvas
        ctx.drawImage(this.canvas, 0, 0);
      },
      durationMs: frame.duration,
    }));

    return await encoder.encodeVideo(videoFrames, onProgress);
  }

  /**
   * Create and download movie of simulation steps
   */
  async createSimulationMovie(
    simulationType: string,
    stepCount: number,
    stepDuration: number,
    adaptiveStepDuration: boolean
  ): Promise<void> {
    if (!this.movieMaker) {
      throw new Error("Movie maker not initialized");
    }

    const graph = this.container.get<Graph>("graph");
    const app = this.container.get<Application>("app");
    const uiFacade = this.container.get<UIFacade>("ui");
    const simulations = this.container.get<any>("simulations");

    // Get simulation function
    let simulationStep: () => void;
    let simulationName: string;

    if (simulationType === "force_balance") {
      simulationStep = () => simulations.doForceBalanceStep(graph);
      simulationName = "Force Balance";
    } else if (simulationType === "position_equilibration") {
      simulationStep = () => simulations.doPositionEquilibrationStep(graph);
      simulationName = "Position Equilibration";
    } else {
      throw new Error("Invalid simulation type");
    }

    // Save node positions to restore later
    const savedPositions = new Map<number, { x: number; y: number }>();
    graph.getAllNodes().forEach((node: Node) => {
      savedPositions.set(node.id, {
        x: node.coordinates.x,
        y: node.coordinates.y,
      });
    });

    try {
      let stepDurations = Array(stepCount).fill(stepDuration);

      if (adaptiveStepDuration) {
        // Do all steps once to measure distances, and compute adaptive durations
        const initialPositions = savedPositions;
        let previousPositions = initialPositions;

        const meanDistances: number[] = [];
        for (let i = 0; i < stepCount; i++) {
          simulationStep();

          // Calculate mean node displacement
          let totalDistance = 0;
          graph.getAllNodes().forEach((node: Node) => {
            const prevPos = previousPositions.get(node.id);
            if (prevPos) {
              const dx = node.coordinates.x - prevPos.x;
              const dy = node.coordinates.y - prevPos.y;
              totalDistance += Math.sqrt(dx * dx + dy * dy);
            }
          });
          const meanDistance = totalDistance / graph.getAllNodes().length;
          meanDistances.push(meanDistance);

          // Update previous positions
          const currentPositions = new Map<number, { x: number; y: number }>();
          graph.getAllNodes().forEach((node: Node) => {
            currentPositions.set(node.id, {
              x: node.coordinates.x,
              y: node.coordinates.y,
            });
          });
          previousPositions = currentPositions;
        }

        // Compute adaptive durations inversely proportional to mean distances
        const totalTargetTime = stepCount * stepDuration;
        const totalMeanDistance = meanDistances.reduce((a, b) => a + b, 0);
        stepDurations = meanDistances.map((dist) => {
          return dist > 0
            ? Math.min(
                totalTargetTime,
                (totalTargetTime / totalMeanDistance) * dist
              )
            : stepDuration;
        });

        // Restore initial positions before actual recording
        graph.getAllNodes().forEach((node: Node) => {
          const saved = initialPositions.get(node.id);
          if (saved) {
            node.coordinates.x = saved.x;
            node.coordinates.y = saved.y;
          }
        });
      }

      // Create animation frames
      const frames: any[] = [];

      if (adaptiveStepDuration) {
        // With adaptive durations, we need to interpolate when steps would take too long
        for (let i = 0; i < stepCount; i++) {
          const targetDuration = stepDurations[i];
          const numInterpolationFrames = Math.max(
            1,
            Math.ceil(targetDuration / stepDuration)
          );

          // Store initial positions
          const startPositions = new Map<number, { x: number; y: number }>();
          graph.getAllNodes().forEach((node: Node) => {
            startPositions.set(node.id, {
              x: node.coordinates.x,
              y: node.coordinates.y,
            });
          });

          // Perform the simulation step to get target positions
          simulationStep();

          // Store target positions
          const endPositions = new Map<number, { x: number; y: number }>();
          graph.getAllNodes().forEach((node: Node) => {
            endPositions.set(node.id, {
              x: node.coordinates.x,
              y: node.coordinates.y,
            });
          });

          // Reset to start positions
          graph.getAllNodes().forEach((node: Node) => {
            const start = startPositions.get(node.id);
            if (start) {
              node.coordinates.x = start.x;
              node.coordinates.y = start.y;
            }
          });

          // Create interpolated frames
          // Note: loop creates numInterpolationFrames+1 frames
          const actualFrameCount = numInterpolationFrames + 1;
          const frameDuration = targetDuration / actualFrameCount;

          for (let j = 0; j <= numInterpolationFrames; j++) {
            const progress = j / numInterpolationFrames;

            frames.push({
              action: () => {
                const boxSize = getBoxSize();
                graph.getAllNodes().forEach((node: Node) => {
                  const start = startPositions.get(node.id);
                  const end = endPositions.get(node.id);
                  if (start && end) {
                    const interpolated = interpolateWithPBC(
                      start,
                      end,
                      progress,
                      boxSize
                    );
                    node.coordinates.x = interpolated.x;
                    node.coordinates.y = interpolated.y;
                  }
                });
                app.render();
              },
              duration: frameDuration,
            });
          }

          // Reset to end positions
          graph.getAllNodes().forEach((node: Node) => {
            const end = endPositions.get(node.id);
            if (end) {
              node.coordinates.x = end.x;
              node.coordinates.y = end.y;
            }
          });
        }
      } else {
        // Without adaptive durations, just use the simulation steps directly
        for (let i = 0; i < stepCount; i++) {
          frames.push({
            action: () => {
              simulationStep();
              app.render();
            },
            duration: stepDuration,
          });
        }
      }

      uiFacade.updateMovieStatus(
        `Encoding ${simulationName} simulation (${stepCount} steps${
          adaptiveStepDuration ? " with adaptive duration" : ""
        })...`
      );

      try {
        const blob = await this.encodeVideoFrames(frames, (current, total) => {
          uiFacade.updateMovieStatus(
            `Encoding: ${current}/${total} frames (${Math.round(
              (current / total) * 100
            )}%)`
          );
        });

        this.downloadBlob(blob, `${simulationType}-simulation.webm`);

        uiFacade.updateMovieStatus("Movie saved successfully!");
        setTimeout(() => uiFacade.updateMovieStatus(""), 3000);
      } catch (error) {
        console.error("Error creating movie:", error);
        throw new Error("Error creating movie: " + error);
      }
    } finally {
      // Restore node positions
      graph.getAllNodes().forEach((node: Node) => {
        const saved = savedPositions.get(node.id);
        if (saved) {
          node.coordinates.x = saved.x;
          node.coordinates.y = saved.y;
        }
      });
    }
  }

  /**
   * Initialize or get the stop-motion recorder
   */
  private getStopMotionRecorder(): StopMotionRecorder {
    if (!this.stopMotionRecorder) {
      const scaleFactor = 2;

      this.stopMotionRecorder = new StopMotionRecorder({
        canvas: this.canvas,
        frameDuration: 500, // Default 500ms per frame
        scaleFactor: scaleFactor,
      });

      // Set up graph state provider for interpolation
      const graph = this.container.get<Graph>("graph");
      const app = this.container.get<Application>("app");

      this.stopMotionRecorder.setGraphStateProvider(() => {
        const nodes = new Map();
        graph.getAllNodes().forEach((node: Node) => {
          nodes.set(node.id, {
            x: node.coordinates.x,
            y: node.coordinates.y,
            radius: node.radius,
            strokeWidth: node.strokeWidth,
            fillColor: node.fillColor,
            strokeColor: node.strokeColor,
          });
        });

        const edges = graph.getAllEdges().map((edge: Edge) => ({
          fromId: edge.fromId,
          toId: edge.toId,
          color: edge.color,
          weight: edge.weight,
        }));

        const arrows = graph.getAllArrows().map((arrow: Arrow) => ({
          fromId: arrow.fromId,
          toId: arrow.toId,
          color: arrow.color,
          width: arrow.width,
          headAtStart: arrow.headAtStart,
          headAtEnd: arrow.headAtEnd,
        }));

        return {
          nodes,
          edges,
          arrows,
          zigzagSpacing: graph.zigzagSpacing,
          zigzagLength: graph.zigzagLength,
          zigzagEndLengths: graph.zigzagEndLengths,
        };
      });

      // Set up render callback for interpolation
      // This is called during encoding to render intermediate frames
      // Store the export scale factor to apply to temporary graphs
      let exportScaleFactor = 1;
      (this.stopMotionRecorder as any)._setExportScaleFactor = (factor: number) => {
        exportScaleFactor = factor;
      };
      
      this.stopMotionRecorder.setRenderCallback((tempGraph, extraElements) => {
        const originalGraph = this.container.get<Graph>("graph");
        
        // Set the scaling factor on the temporary graph
        // This ensures interpolated frames are rendered at the same scale as the export
        // The tempGraph was created from captured (unscaled) state, so we apply the export scale
        (tempGraph as any).scalingFactor = {
          x: exportScaleFactor,
          y: exportScaleFactor
        };
        
        // Temporarily swap in the interpolated graph
        this.container.register("graph", tempGraph);

        try {
          // Render with the temporary graph and extra elements
          app.render({ x: 1, y: 1 }, extraElements || []);
        } finally {
          // Restore original graph
          this.container.register("graph", originalGraph);
        }
      });
    }
    return this.stopMotionRecorder;
  }

  /**
   * Start a stop-motion recording session
   */
  startStopMotionRecording(): void {
    const recorder = this.getStopMotionRecorder();
    recorder.start();
    console.log("Stop-motion recording started");
  }

  /**
   * Capture the current canvas state as a frame
   */
  captureStopMotionFrame(customDuration?: number): number {
    const recorder = this.getStopMotionRecorder();
    recorder.captureFrame(customDuration);
    return recorder.getFrameCount();
  }

  /**
   * Remove the last captured frame
   */
  removeLastStopMotionFrame(): number {
    const recorder = this.getStopMotionRecorder();
    recorder.removeLastFrame();
    return recorder.getFrameCount();
  }

  /**
   * Stop the stop-motion recording session
   */
  stopStopMotionRecording(): number {
    const recorder = this.getStopMotionRecorder();
    const frameCount = recorder.getFrameCount();
    recorder.stop();
    console.log(`Stop-motion recording stopped with ${frameCount} frames`);
    return frameCount;
  }

  /**
   * Get the number of captured stop-motion frames
   */
  getStopMotionFrameCount(): number {
    const recorder = this.getStopMotionRecorder();
    return recorder.getFrameCount();
  }

  /**
   * Check if stop-motion recording is active
   */
  isStopMotionRecording(): boolean {
    const recorder = this.getStopMotionRecorder();
    return recorder.getIsRecording();
  }

  /**
   * Set the frame duration for stop-motion playback
   */
  setStopMotionFrameDuration(durationMs: number): void {
    const recorder = this.getStopMotionRecorder();
    recorder.setFrameDuration(durationMs);
  }

  /**
   * Get the current stop-motion frame duration
   */
  getStopMotionFrameDuration(): number {
    const recorder = this.getStopMotionRecorder();
    return recorder.getFrameDuration();
  }

  /**
   * Clear all captured stop-motion frames
   */
  clearStopMotionFrames(): void {
    const recorder = this.getStopMotionRecorder();
    recorder.clear();
  }

  /**
   * Update stop-motion button states based on recording state
   * @param isRecording Whether recording is active
   * @param frameCount Number of frames captured
   */
  private updateStopMotionButtons(isRecording: boolean, frameCount: number): void {
    const startBtn = document.getElementById("startStopMotionBtn") as HTMLButtonElement;
    const captureBtn = document.getElementById("captureFrameBtn") as HTMLButtonElement;
    const removeBtn = document.getElementById("removeLastFrameBtn") as HTMLButtonElement;
    const stopBtn = document.getElementById("stopStopMotionBtn") as HTMLButtonElement;
    const clearBtn = document.getElementById("clearStopMotionFramesBtn") as HTMLButtonElement;

    if (isRecording) {
      // Recording is active
      if (startBtn) startBtn.disabled = true;
      if (captureBtn) captureBtn.disabled = false;
      if (removeBtn) removeBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = false;
      if (clearBtn) clearBtn.disabled = true;
    } else {
      // Recording is stopped
      if (startBtn) startBtn.disabled = false;
      if (captureBtn) captureBtn.disabled = true;
      if (removeBtn) removeBtn.disabled = frameCount === 0;
      if (stopBtn) stopBtn.disabled = true;
      if (clearBtn) clearBtn.disabled = frameCount === 0;
    }
  }

  /**
   * Create and download the stop-motion movie
   */
  async createStopMotionMovie(
    interpolate: boolean = false,
    filename?: string
  ): Promise<void> {
    const recorder = this.getStopMotionRecorder();
    const uiFacade = this.container.get<UIFacade>("ui");
    const canvasFacade = this.container.get<CanvasFacade>("canvas");
    const graph = this.container.get<Graph>("graph");
    const app = this.container.get<Application>("app");
    const settings = this.container.get<GlobalSettings>("settings");

    const frameCount = recorder.getFrameCount();
    if (frameCount === 0) {
      throw new Error("No frames captured! Capture some frames first.");
    }

    uiFacade.updateMovieStatus(
      `Encoding stop-motion animation (${frameCount} frames)...`
    );

    try {
      // Use withScaledCanvas to scale everything consistently (same as PNG export)
      const exportScaleFactor = settings.imageScaleFactor;
      await canvasFacade.withScaledCanvas(
        async () => {
          app.renderModeInteractive.value = false;
          
          // Set the export scale factor for the render callback
          // This ensures interpolated frames use the correct scaling
          (recorder as any)._setExportScaleFactor(exportScaleFactor);

          try {
            const blob = await recorder.encode(
              interpolate,
              (current: number, total: number) => {
                uiFacade.updateMovieStatus(
                  `Encoding: ${current}/${total} frames (${Math.round(
                    (current / total) * 100
                  )}%)`
                );
              }
            );

            // Download the video
            const finalFilename = filename || "stop-motion-animation.webm";
            this.downloadBlob(blob, finalFilename);

            uiFacade.updateMovieStatus("Stop-motion movie saved successfully!");
            setTimeout(() => uiFacade.updateMovieStatus(""), 3000);
          } finally {
            app.renderModeInteractive.value = true;
            // Reset export scale factor
            (recorder as any)._setExportScaleFactor(1);
          }
        },
        exportScaleFactor, // Use same scale factor as PNG export
        app,
        graph,
        settings
      );
    } catch (error) {
      console.error("Error creating stop-motion movie:", error);
      uiFacade.updateMovieStatus("Error creating movie!");
      throw error;
    }
  }
}

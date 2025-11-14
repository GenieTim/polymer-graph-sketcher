/**
 * Stop-Motion Recorder Module
 * 
 * Allows manual frame-by-frame recording by capturing canvas snapshots on demand.
 * Users can click a button to record each frame, make manual changes, then record
 * the next frame, building up a stop-motion animation.
 */

import { VideoEncoder } from './video-encoder';

export interface StopMotionFrame {
  imageData: ImageData;
  timestamp: number;
}

export interface StopMotionRecorderOptions {
  canvas: HTMLCanvasElement;
  frameDuration?: number; // Duration in ms to display each captured frame
}

/**
 * Records frames manually for stop-motion animation
 */
export class StopMotionRecorder {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private frames: StopMotionFrame[] = [];
  private frameDuration: number;
  private isRecording: boolean = false;

  constructor(options: StopMotionRecorderOptions) {
    this.canvas = options.canvas;
    this.frameDuration = options.frameDuration || 500; // Default 0.5 seconds per frame
    
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = ctx;
  }

  /**
   * Start a new stop-motion recording session
   */
  start(): void {
    if (this.isRecording) {
      console.warn('Stop-motion recording already in progress');
      return;
    }
    
    this.frames = [];
    this.isRecording = true;
    console.log('Stop-motion recording started');
  }

  /**
   * Capture the current canvas state as a frame
   */
  captureFrame(): void {
    if (!this.isRecording) {
      throw new Error('Not currently recording. Call start() first.');
    }

    // Capture the current canvas as ImageData
    const sourceImageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    // Create a new ImageData object with a copy of the data
    // This is critical because ImageData can share underlying buffers
    const imageData = new ImageData(
      new Uint8ClampedArray(sourceImageData.data),
      sourceImageData.width,
      sourceImageData.height
    );

    this.frames.push({
      imageData,
      timestamp: Date.now(),
    });

    console.log(`Frame ${this.frames.length} captured`);
  }

  /**
   * Remove the last captured frame
   */
  removeLastFrame(): boolean {
    if (this.frames.length === 0) {
      return false;
    }
    
    this.frames.pop();
    console.log(`Last frame removed. ${this.frames.length} frames remaining`);
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
    console.log(`Stop-motion recording stopped. ${this.frames.length} frames captured`);
  }

  /**
   * Get the number of captured frames
   */
  getFrameCount(): number {
    return this.frames.length;
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
    this.frames = [];
    console.log('All frames cleared');
  }

  /**
   * Encode the captured frames into a video
   */
  async encode(
    onProgress?: (current: number, total: number) => void
  ): Promise<Blob> {
    if (this.frames.length === 0) {
      throw new Error('No frames to encode. Capture some frames first.');
    }

    console.log(`Encoding ${this.frames.length} frames at ${this.frameDuration}ms per frame`);

    // Create encoder
    const encoder = new VideoEncoder({
      width: this.canvas.width,
      height: this.canvas.height,
      fps: 30, // Standard 30 fps for video
      videoBitsPerSecond: 5000000,
    });

    // Convert frames to render functions
    const videoFrames = this.frames.map((frame) => ({
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
      durationMs: this.frameDuration,
    }));

    // Encode the video
    const blob = await encoder.encodeVideo(videoFrames, onProgress);
    
    console.log(`Video encoded: ${blob.size} bytes`);
    return blob;
  }

  /**
   * Encode and download the video
   */
  async download(filename: string = 'stop-motion-animation.webm'): Promise<void> {
    const blob = await this.encode();
    
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
}

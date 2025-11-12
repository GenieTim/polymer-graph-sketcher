/**
 * Video Encoder Module
 * 
 * Handles offline video encoding using a hidden canvas and MediaRecorder.
 * Generates videos with precise timing using frame accumulation.
 * 
 * Key behavior:
 * - ALL animation frames are executed (e.g., simulation steps always run)
 * - Video frames are captured only when accumulated time ≥ video frame duration
 * - This ensures complete animation with accurate timing
 */

export interface VideoEncoderOptions {
  width: number;
  height: number;
  fps?: number;
  videoBitsPerSecond?: number;
  mimeType?: string;
}

export interface RenderFunction {
  (ctx: CanvasRenderingContext2D): void;
}

/**
 * Encodes video frames with precise timing control
 */
export class VideoEncoder {
  private options: Required<VideoEncoderOptions>;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  constructor(options: VideoEncoderOptions) {
    this.options = {
      width: options.width,
      height: options.height,
      fps: options.fps || 30,
      videoBitsPerSecond: options.videoBitsPerSecond || 5000000,
      mimeType: options.mimeType || 'video/webm;codecs=vp9',
    };
  }

  /**
   * Initialize the encoder
   */
  private init(): void {
    if (this.canvas) return;

    // Create a hidden canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;
    this.canvas.style.display = 'none';
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d', { alpha: false });

    if (!this.ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }

    // Create stream from canvas - use 0 for manual frame capture
    const capturedStream = this.canvas.captureStream(0) as MediaStream;
    this.stream = capturedStream;

    // Select supported mime type
    let mimeType = this.options.mimeType;
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      console.warn(`${mimeType} not supported, trying vp8`);
      mimeType = 'video/webm;codecs=vp8';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.warn(`${mimeType} not supported, using default`);
        mimeType = 'video/webm';
      }
    }

    // Create MediaRecorder
    this.mediaRecorder = new MediaRecorder(capturedStream, {
      mimeType,
      videoBitsPerSecond: this.options.videoBitsPerSecond,
    });

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data?.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.recordedChunks = [];
  }

  /**
   * Encode a video from a sequence of render functions
   * Each render function is called with the canvas context and should draw one frame
   */
  async encodeVideo(
    frames: Array<{ render: RenderFunction; durationMs: number }>,
    onProgress?: (current: number, total: number) => void
  ): Promise<Blob> {
    this.init();

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.ctx || !this.stream || !this.canvas) {
        reject(new Error('Encoder not initialized'));
        return;
      }

      const msPerFrame = 1000 / this.options.fps;
      let frameIndex = 0;
      let currentFrame = 0;

      // Setup completion handler
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        console.log(`Video encoded: ${blob.size} bytes, ${frameIndex} video frames from ${currentFrame} animation frames`);
        this.cleanup();
        resolve(blob);
      };

      // Start recording
      this.mediaRecorder.start();

      // Get video track for manual frame requests
      const videoTrack = this.stream.getVideoTracks()[0] as any;
      const supportsRequestFrame = videoTrack && typeof videoTrack.requestFrame === 'function';
      
      console.log(`Starting video encoding: ${frames.length} frames, ${this.options.fps} fps, requestFrame support: ${supportsRequestFrame}`);

      // Process frames with smart frame accumulation
      let accumulatedTime = 0; // Track accumulated time for short frames
      
      const processNextFrame = async () => {
        if (currentFrame >= frames.length) {
          // All frames processed, wait for final frames to be captured
          await new Promise(resolve => setTimeout(resolve, 500));
          this.mediaRecorder!.stop();
          return;
        }

        const frame = frames[currentFrame];
        
        // ALWAYS execute the render function to update state (e.g., simulation steps)
        // This ensures all animation frames are processed even if not captured as video frames
        frame.render(this.ctx!);
        
        accumulatedTime += frame.durationMs;
        
        // Calculate how many video frames we should output for accumulated time
        const videoFramesNeeded = Math.floor(accumulatedTime / msPerFrame);

        if (videoFramesNeeded >= 1) {
          // We have enough accumulated time to capture video frames
          
          // Wait for the browser to actually render the canvas
          await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
          
          // Request frame captures
          if (supportsRequestFrame) {
            for (let i = 0; i < videoFramesNeeded; i++) {
              videoTrack.requestFrame();
              // Small delay between frame requests for reliability
              await new Promise(resolve => setTimeout(resolve, 5));
            }
          } else {
            // Fallback: wait for automatic capture (shouldn't happen with captureStream(0))
            const waitTime = videoFramesNeeded * msPerFrame;
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          
          frameIndex += videoFramesNeeded;
          
          // Subtract the time we've "used" but keep the remainder
          accumulatedTime -= videoFramesNeeded * msPerFrame;
        }
        // If videoFramesNeeded < 1, we still executed the render but didn't capture it
        // The next frame will show the accumulated changes

        // Report progress
        if (currentFrame % 100 === 0 || currentFrame === frames.length - 1) {
          console.log(`Progress: ${currentFrame + 1}/${frames.length} animation frames → ${frameIndex} video frames`);
        }
        onProgress?.(currentFrame + 1, frames.length);

        // Move to next frame
        currentFrame++;

        // Continue processing
        processNextFrame();
      };

      // Start processing
      processNextFrame();
    });
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.stream = null;
    this.mediaRecorder = null;
    this.ctx = null;
    this.canvas = null;
  }

  /**
   * Create a render function that copies from a source canvas
   */
  static createCanvasCopyRenderer(sourceCanvas: HTMLCanvasElement): RenderFunction {
    return (ctx) => {
      ctx.drawImage(sourceCanvas, 0, 0);
    };
  }
}

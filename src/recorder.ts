/**
 * Movie Recorder Module
 * 
 * Handles recording canvas content to WebM video files.
 * Provides a clean API for starting/stopping recording and managing the output.
 */

export interface RecorderOptions {
  fps?: number;
  videoBitsPerSecond?: number;
  mimeType?: string;
}

export class CanvasRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isRecording: boolean = false;
  private canvas: HTMLCanvasElement;
  private options: RecorderOptions;

  constructor(canvas: HTMLCanvasElement, options: RecorderOptions = {}) {
    this.canvas = canvas;
    this.options = {
      fps: options.fps || 60,
      videoBitsPerSecond: options.videoBitsPerSecond || 2500000,
      mimeType: options.mimeType || 'video/webm;codecs=vp9',
    };
  }

  /**
   * Start recording the canvas
   */
  start(): void {
    if (this.isRecording) {
      console.warn('Recording already in progress');
      return;
    }

    // Clear any previous recordings
    this.recordedChunks = [];

    // Create a stream from the canvas
    this.stream = this.canvas.captureStream(this.options.fps);

    // Check if the preferred mime type is supported, fallback if needed
    let mimeType = this.options.mimeType!;
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      console.warn(`${mimeType} not supported, trying vp8`);
      mimeType = 'video/webm;codecs=vp8';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.warn(`${mimeType} not supported, using default`);
        mimeType = 'video/webm';
      }
    }

    // Create MediaRecorder
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: mimeType,
      videoBitsPerSecond: this.options.videoBitsPerSecond,
    });

    // Handle data available event
    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    // Start recording
    this.mediaRecorder.start();
    this.isRecording = true;
    console.log('Recording started');
  }

  /**
   * Stop recording and return a promise that resolves with the video blob
   */
  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.isRecording || !this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        this.isRecording = false;
        
        // Stop all tracks in the stream
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }
        
        console.log('Recording stopped, blob size:', blob.size);
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Check if currently recording
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Download the recorded video
   */
  async download(filename: string = 'polymer-graph-animation.webm'): Promise<void> {
    if (this.isRecording) {
      const blob = await this.stop();
      this.downloadBlob(blob, filename);
    } else if (this.recordedChunks.length > 0) {
      const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
      this.downloadBlob(blob, filename);
    } else {
      throw new Error('No recording available to download');
    }
  }

  private downloadBlob(blob: Blob, filename: string): void {
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

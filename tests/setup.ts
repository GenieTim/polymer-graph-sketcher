/**
 * Test setup file
 * Configures the testing environment with necessary polyfills and mocks
 */

import { beforeEach, vi } from 'vitest';

// Mock for canvas-related APIs that may not be available in happy-dom
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
});

// Mock HTMLCanvasElement methods if needed
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function(contextId: string) {
    if (contextId === '2d') {
      return {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: 'left',
        textBaseline: 'alphabetic',
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        rect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        scale: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        drawImage: vi.fn(),
        fillText: vi.fn(),
        strokeText: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
        getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => ({
          width: w,
          height: h,
          data: new Uint8ClampedArray(w * h * 4),
        })),
        putImageData: vi.fn(),
        createImageData: vi.fn((w: number, h: number) => ({
          width: w,
          height: h,
          data: new Uint8ClampedArray(w * h * 4),
        })),
        setTransform: vi.fn(),
        resetTransform: vi.fn(),
      } as any;
    }
    return null;
  };

  // Mock captureStream for video recording tests
  HTMLCanvasElement.prototype.captureStream = vi.fn((_frameRate?: number) => {
    const mockStream = {
      id: 'mock-stream',
      active: true,
      getVideoTracks: vi.fn(() => [{
        id: 'mock-video-track',
        kind: 'video',
        label: 'mock video',
        enabled: true,
        muted: false,
        readyState: 'live',
        requestFrame: vi.fn(),
        stop: vi.fn(),
      }]),
      getAudioTracks: vi.fn(() => []),
      getTracks: vi.fn(function(this: any) {
        return [...this.getVideoTracks(), ...this.getAudioTracks()];
      }),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
    };
    return mockStream as any;
  });

  // Mock toDataURL for image export tests
  HTMLCanvasElement.prototype.toDataURL = vi.fn(function(this: HTMLCanvasElement, type?: string) {
    // Return a minimal valid data URL with correct dimensions encoded
    const width = this.width || 800;
    const height = this.height || 600;
    return `data:${type || 'image/png'};base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==,width=${width},height=${height}`;
  });
}

// Mock MediaRecorder for video encoding tests
global.MediaRecorder = class MediaRecorder {
  static isTypeSupported = vi.fn(() => true);
  
  ondataavailable: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onstop: (() => void) | null = null;
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  stream: MediaStream;
  
  constructor(stream: MediaStream, _options?: any) {
    this.stream = stream;
  }
  
  start = vi.fn(() => {
    this.state = 'recording';
    // Simulate recording by triggering ondataavailable after a short delay
    setTimeout(() => {
      if (this.ondataavailable) {
        this.ondataavailable({
          data: new Blob(['mock video data'], { type: 'video/webm' }),
          timecode: 0
        });
      }
    }, 10);
  });
  
  stop = vi.fn(() => {
    this.state = 'inactive';
    setTimeout(() => {
      if (this.onstop) {
        this.onstop();
      }
    }, 10);
  });
  
  pause = vi.fn(() => {
    this.state = 'paused';
  });
  
  resume = vi.fn(() => {
    this.state = 'recording';
  });
  
  requestData = vi.fn();
} as any;

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  setTimeout(callback, 16); // ~60fps
  return 1;
}) as any;

global.cancelAnimationFrame = vi.fn();

// Mock ImageData if not available
if (typeof ImageData === 'undefined') {
  (global as any).ImageData = class ImageData {
    public readonly width: number;
    public readonly height: number;
    public readonly data: Uint8ClampedArray;

    constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
      if (dataOrWidth instanceof Uint8ClampedArray) {
        this.data = dataOrWidth;
        this.width = widthOrHeight;
        this.height = height!;
      } else {
        this.width = dataOrWidth;
        this.height = widthOrHeight;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      }
    }
  };
}

/**
 * Animation Controller Module
 *
 * Manages animation sequences with configurable speeds and frame rates.
 * Provides a declarative API for creating animations.
 */

export interface AnimationFrame {
  /**
   * The action to perform for this frame
   */
  action: () => void;

  /**
   * Duration to display this frame in milliseconds
   */
  duration?: number;
}

export interface AnimationSequence {
  /**
   * Name/description of the animation
   */
  name: string;

  /**
   * Frames to execute in sequence
   */
  frames: AnimationFrame[];

  /**
   * Default duration per frame in milliseconds
   */
  defaultFrameDuration?: number;

  /**
   * Callback when animation completes
   */
  onComplete?: () => void;

  /**
   * Callback for each frame
   */
  onFrame?: (frameIndex: number, totalFrames: number) => void;
}

export interface AnimatorOptions {
  /**
   * Target frames per second for smooth animations
   */
  targetFPS?: number;

  /**
   * Auto-play animations when added
   */
  autoPlay?: boolean;

  /**
   * Offline rendering mode - executes frames immediately without waiting for real time
   * Useful for video recording where you want exact timing
   */
  offlineRendering?: boolean;

  /**
   * Callback to request a frame capture (for offline rendering with video recording)
   */
  onFrameRendered?: () => void;
}

export class Animator {
  private sequences: AnimationSequence[] = [];
  private currentSequenceIndex: number = 0;
  private currentFrameIndex: number = 0;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private options: Required<Omit<AnimatorOptions, 'onFrameRendered'>> & { onFrameRendered?: () => void };
  private subFrameIndex: number = 0;

  constructor(options: AnimatorOptions = {}) {
    this.options = {
      targetFPS: options.targetFPS || 60,
      autoPlay: options.autoPlay !== undefined ? options.autoPlay : true,
      offlineRendering: options.offlineRendering || false,
      onFrameRendered: options.onFrameRendered,
    };
  }

  /**
   * Add an animation sequence to the queue
   */
  addSequence(sequence: AnimationSequence): void {
    // Set default frame duration if not specified
    if (!sequence.defaultFrameDuration) {
      sequence.defaultFrameDuration = 1000 / this.options.targetFPS;
    }

    this.sequences.push(sequence);

    if (this.options.autoPlay && !this.isPlaying) {
      this.play();
    }
  }

  /**
   * Clear all sequences
   */
  clearSequences(): void {
    this.stop();
    this.sequences = [];
    this.currentSequenceIndex = 0;
    this.currentFrameIndex = 0;
  }

  /**
   * Start playing the animation sequences
   */
  play(): void {
    if (this.isPlaying && !this.isPaused) {
      return;
    }

    this.isPlaying = true;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    this.animate();
  }

  /**
   * Pause the animation
   */
  pause(): void {
    this.isPaused = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Resume paused animation
   */
  resume(): void {
    if (!this.isPaused) {
      return;
    }

    this.isPaused = false;
    this.lastFrameTime = performance.now();
    this.animate();
  }

  /**
   * Stop the animation and reset
   */
  stop(): void {
    this.isPlaying = false;
    this.isPaused = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.currentSequenceIndex = 0;
    this.currentFrameIndex = 0;
  }

  /**
   * Check if animation is currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying && !this.isPaused;
  }

  /**
   * Check if animation is paused
   */
  getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Get current animation progress
   */
  getProgress(): { sequence: number; frame: number; total: number } {
    const currentSequence = this.sequences[this.currentSequenceIndex];
    return {
      sequence: this.currentSequenceIndex,
      frame: this.currentFrameIndex,
      total: currentSequence?.frames.length || 0,
    };
  }

  private animate = (): void => {
    if (!this.isPlaying || this.isPaused) {
      return;
    }

    if (this.currentSequenceIndex >= this.sequences.length) {
      // All sequences complete
      this.stop();
      return;
    }

    const currentSequence = this.sequences[this.currentSequenceIndex];
    const currentFrame = currentSequence.frames[this.currentFrameIndex];

    if (!currentFrame) {
      // Current sequence complete, move to next
      if (currentSequence.onComplete) {
        currentSequence.onComplete();
      }
      this.currentSequenceIndex++;
      this.currentFrameIndex = 0;
      this.lastFrameTime = performance.now();
      
      if (this.options.offlineRendering) {
        // Continue immediately in offline mode
        this.animate();
      } else {
        this.animationFrameId = requestAnimationFrame(this.animate);
      }
      return;
    }

    if (this.options.offlineRendering) {
      // Offline rendering mode - execute frames immediately
      const frameDuration =
        currentFrame.duration || currentSequence.defaultFrameDuration || 16;
      const targetFPS = this.options.targetFPS;
      const framesNeeded = Math.max(1, Math.round((frameDuration / 1000) * targetFPS));
      
      // Execute the frame action once
      if (this.subFrameIndex === 0) {
        currentFrame.action();
        
        // Call frame callback
        if (currentSequence.onFrame) {
          currentSequence.onFrame(
            this.currentFrameIndex,
            currentSequence.frames.length
          );
        }
      }
      
      // Request frame capture for video recording
      if (this.options.onFrameRendered) {
        this.options.onFrameRendered();
      }
      
      // Move to next sub-frame or next frame
      this.subFrameIndex++;
      if (this.subFrameIndex >= framesNeeded) {
        this.subFrameIndex = 0;
        this.currentFrameIndex++;
      }
      
      // Continue immediately
      this.animate();
    } else {
      // Real-time rendering mode
      const now = performance.now();
      const frameDuration =
        currentFrame.duration || currentSequence.defaultFrameDuration || 16;
      const elapsed = now - this.lastFrameTime;

      if (elapsed >= frameDuration) {
        // Execute the frame action
        currentFrame.action();

        // Call frame callback
        if (currentSequence.onFrame) {
          currentSequence.onFrame(
            this.currentFrameIndex,
            currentSequence.frames.length
          );
        }

        // Move to next frame
        this.currentFrameIndex++;
        this.lastFrameTime = now;
      }

      this.animationFrameId = requestAnimationFrame(this.animate);
    }
  };
}

/**
 * Animation Builder - Helper class for building common animation patterns
 */
export class AnimationBuilder {
  /**
   * Create an animation sequence from an array of actions with uniform timing
   */
  static fromActions(
    name: string,
    actions: (() => void)[],
    frameDuration: number = 100,
    onComplete?: () => void
  ): AnimationSequence {
    return {
      name,
      frames: actions.map((action) => ({ action })),
      defaultFrameDuration: frameDuration,
      onComplete,
    };
  }

  /**
   * Create an animation that repeats a single action multiple times
   */
  static repeat(
    name: string,
    action: () => void,
    count: number,
    frameDuration: number = 100,
    onComplete?: () => void
  ): AnimationSequence {
    return {
      name,
      frames: Array(count)
        .fill(null)
        .map(() => ({ action })),
      defaultFrameDuration: frameDuration,
      onComplete,
    };
  }

  /**
   * Create an animation with custom timing for each frame
   */
  static withTiming(
    name: string,
    frames: { action: () => void; duration: number }[],
    onComplete?: () => void
  ): AnimationSequence {
    return {
      name,
      frames,
      onComplete,
    };
  }

  /**
   * Create an interpolated animation between states
   */
  static interpolate(
    name: string,
    steps: number,
    interpolationFn: (progress: number) => void,
    totalDuration: number = 1000,
    onComplete?: () => void
  ): AnimationSequence {
    const frameDuration = totalDuration / steps;
    const frames: AnimationFrame[] = [];

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      frames.push({
        action: () => interpolationFn(progress),
        duration: frameDuration,
      });
    }

    return {
      name,
      frames,
      onComplete,
    };
  }
}

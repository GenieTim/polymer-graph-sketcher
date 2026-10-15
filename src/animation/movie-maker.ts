/**
 * Movie Maker Module
 * 
 * Combines animation and recording capabilities to create movies
 * of graph sketching and simulation processes.
 */

import { Animator, AnimationSequence, AnimationBuilder } from './animator';
import { CanvasRecorder, RecorderOptions } from './recorder';

export interface MovieMakerOptions {
  canvas: HTMLCanvasElement;
  recorderOptions?: RecorderOptions;
  animatorOptions?: {
    targetFPS?: number;
  };
}

export interface EdgeAnimationOptions {
  /**
   * Duration for adding each edge in milliseconds
   */
  edgeDuration?: number;
  
  /**
   * Number of interpolation steps per edge
   */
  interpolationSteps?: number;
}

export interface SimulationAnimationOptions {
  /**
   * Duration between simulation steps in milliseconds
   */
  stepDuration?: number;
  
  /**
   * Number of steps to animate
   */
  stepCount?: number;
}

/**
 * Main class for creating animated movies of graph operations
 */
export class MovieMaker {
  private recorder: CanvasRecorder;
  private animator: Animator;
  private isRecordingMovie: boolean = false;

  constructor(options: MovieMakerOptions) {
    this.recorder = new CanvasRecorder(options.canvas, options.recorderOptions);
    this.animator = new Animator({
      targetFPS: options.animatorOptions?.targetFPS || 60,
      autoPlay: false, // We'll control playback manually
      offlineRendering: false, // Will be set to true when recording
      onFrameRendered: () => this.recorder.requestFrame(),
    });
  }

  /**
   * Start recording a movie with the current animation queue
   */
  async startRecording(): Promise<void> {
    if (this.isRecordingMovie) {
      throw new Error('Already recording a movie');
    }

    this.isRecordingMovie = true;
    // Enable offline rendering for accurate timing
    (this.animator as any).options.offlineRendering = true;
    this.recorder.start();
  }

  /**
   * Stop recording and download the movie
   */
  async stopAndDownload(filename?: string): Promise<void> {
    if (!this.isRecordingMovie) {
      throw new Error('Not currently recording');
    }

    // Stop animation if it's still playing
    if (this.animator.getIsPlaying()) {
      this.animator.stop();
    }

    // Disable offline rendering
    (this.animator as any).options.offlineRendering = false;

    // Stop recording and download
    await this.recorder.download(filename);
    this.isRecordingMovie = false;
  }

  /**
   * Add an animation sequence to the queue
   */
  addSequence(sequence: AnimationSequence): void {
    this.animator.addSequence(sequence);
  }

  /**
   * Clear all animation sequences
   */
  clearSequences(): void {
    this.animator.clearSequences();
  }

  /**
   * Play the current animation sequences
   */
  play(): void {
    this.animator.play();
  }

  /**
   * Pause the current animation
   */
  pause(): void {
    this.animator.pause();
  }

  /**
   * Resume paused animation
   */
  resume(): void {
    this.animator.resume();
  }

  /**
   * Stop the animation
   */
  stop(): void {
    this.animator.stop();
  }

  /**
   * Record a complete movie with the provided sequences
   * This is a convenience method that handles the entire workflow
   */
  async recordMovie(
    sequences: AnimationSequence[],
    filename?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Clear any existing sequences
      this.clearSequences();

      // Add all sequences
      sequences.forEach(seq => this.addSequence(seq));

      // Add a final sequence to handle completion
      this.addSequence({
        name: 'completion',
        frames: [{
          action: () => {
            // Give a small delay before stopping
            setTimeout(async () => {
              try {
                await this.stopAndDownload(filename);
                resolve();
              } catch (error) {
                reject(error);
              }
            }, 500);
          },
        }],
        defaultFrameDuration: 100,
      });

      // Start recording
      this.startRecording()
        .then(() => {
          // Start playing animation
          this.play();
        })
        .catch(reject);
    });
  }

  /**
   * Get current recording status
   */
  getIsRecording(): boolean {
    return this.isRecordingMovie;
  }

  /**
   * Get current animation status
   */
  getIsPlaying(): boolean {
    return this.animator.getIsPlaying();
  }

  /**
   * Get animation progress
   */
  getProgress(): { sequence: number; frame: number; total: number } {
    return this.animator.getProgress();
  }

  /**
   * Create animation builder for convenience
   */
  static get AnimationBuilder() {
    return AnimationBuilder;
  }
}

/**
 * Factory functions for creating common animation types
 */
export class MoviePresets {
  /**
   * Create a simulation steps animation
   * This shows simulation steps being executed at a consistent pace
   */
  static createSimulationAnimation(
    simulationStep: () => void,
    redrawCallback: () => void,
    options: SimulationAnimationOptions = {}
  ): AnimationSequence {
    const {
      stepDuration = 300,
      stepCount = 10,
    } = options;

    const frames = [];
    for (let i = 0; i < stepCount; i++) {
      frames.push({
        action: () => {
          simulationStep();
          redrawCallback();
        },
        duration: stepDuration,
      });
    }

    return {
      name: 'Simulation Animation',
      frames,
      defaultFrameDuration: stepDuration,
    };
  }

  /**
   * Create a node addition animation
   */
  static createNodeAdditionAnimation(
    nodesToAdd: Array<() => void>,
    redrawCallback: () => void,
    nodeDuration: number = 200
  ): AnimationSequence {
    return AnimationBuilder.fromActions(
      'Node Addition Animation',
      nodesToAdd.map(action => () => {
        action();
        redrawCallback();
      }),
      nodeDuration
    );
  }

  /**
   * Create a combined animation with multiple phases
   */
  static createCombinedAnimation(
    phases: Array<{
      name: string;
      actions: Array<() => void>;
      frameDuration?: number;
    }>,
    redrawCallback: () => void
  ): AnimationSequence[] {
    return phases.map(phase => 
      AnimationBuilder.fromActions(
        phase.name,
        phase.actions.map(action => () => {
          action();
          redrawCallback();
        }),
        phase.frameDuration || 200
      )
    );
  }
}

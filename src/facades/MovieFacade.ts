import { MovieMaker } from "../movie-maker";
import { Node } from "../graph";

/**
 * Facade for movie recording operations
 * Simplifies complex movie recording workflows
 */
export class MovieFacade {
  private movieMaker: MovieMaker | null = null;
  private recordingEdges: Array<{
    type: 'add' | 'remove';
    fromNode: Node;
    toNode: Node;
    color: string;
    weight: number;
  }> = [];
  private isRecordingEdges: boolean = false;

  constructor(private canvas: HTMLCanvasElement) {}

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
   * Start recording edge additions/deletions
   */
  startRecordingEdges(): void {
    if (this.isRecordingEdges) {
      console.warn("Already recording edges");
      return;
    }

    this.isRecordingEdges = true;
    this.recordingEdges = [];
    console.log("Started recording edge additions");
  }

  /**
   * Stop recording edges
   */
  stopRecordingEdges(): number {
    if (!this.isRecordingEdges) {
      console.warn("Not currently recording edges");
      return 0;
    }

    this.isRecordingEdges = false;
    const count = this.recordingEdges.length;
    console.log(`Stopped recording. ${count} edges recorded.`);
    return count;
  }

  /**
   * Record an edge action
   */
  recordEdgeAction(
    type: 'add' | 'remove',
    fromNode: Node,
    toNode: Node,
    color: string,
    weight: number
  ): void {
    if (!this.isRecordingEdges) {
      return;
    }

    this.recordingEdges.push({
      type,
      fromNode,
      toNode,
      color,
      weight,
    });
  }

  /**
   * Get recorded edges
   */
  getRecordedEdges(): Array<{
    type: 'add' | 'remove';
    fromNode: Node;
    toNode: Node;
    color: string;
    weight: number;
  }> {
    return [...this.recordingEdges];
  }

  /**
   * Clear recorded edges
   */
  clearRecordedEdges(): void {
    this.recordingEdges = [];
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
}

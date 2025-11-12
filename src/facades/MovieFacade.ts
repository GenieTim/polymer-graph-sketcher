import { MovieMaker } from "../animation/movie-maker";
import { VideoEncoder } from "../animation/video-encoder";
import { Node, Graph, Edge } from "../models";
import { Container } from "../core/Container";
import { Application } from "../core/Application";
import { PartialLine } from "../rendering/PartialLine";
import { interpolateWithPBC, getBoxSize } from "../utils";
import type { UIFacade } from "./UIFacade";

/**
 * Facade for movie recording operations
 * Simplifies complex movie recording workflows
 */
export class MovieFacade {
  private movieMaker: MovieMaker | null = null;
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
    type: "add" | "remove",
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
    type: "add" | "remove";
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

  /**
   * Create and download movie of recorded edge additions using VideoEncoder
   */
  async createEdgeAdditionMovie(
    edgeDuration: number,
    interpolationSteps: number = 30
  ): Promise<void> {
    if (this.recordingEdges.length === 0) {
      throw new Error("No edges recorded! Use 'Start Recording Edges' first.");
    }

    const graph = this.container.get<Graph>("graph");
    const app = this.container.get<Application>("app");
    const uiFacade = this.container.get<UIFacade>("ui");

    // Calculate initial state by tracking net changes
    const edgeNetChanges = new Map<string, any>();
    this.recordingEdges.forEach(
      ({ type, fromNode, toNode, color, weight }: any) => {
        const key =
          fromNode.id < toNode.id
            ? `${fromNode.id}-${toNode.id}`
            : `${toNode.id}-${fromNode.id}`;

        edgeNetChanges.set(key, {
          lastAction: type,
          fromNode,
          toNode,
          color,
          weight,
        });
      }
    );

    // Restore to initial state
    const animationPartialEdges: any[] = [];
    edgeNetChanges.forEach((netChange) => {
      const edges = graph.getEdgesInvolvingNodes([
        netChange.fromNode.id,
        netChange.toNode.id,
      ]);
      const matchingEdge = edges.find(
        (edge: Edge) =>
          (edge.fromId === netChange.fromNode.id &&
            edge.toId === netChange.toNode.id) ||
          (edge.fromId === netChange.toNode.id &&
            edge.toId === netChange.fromNode.id)
      );

      if (netChange.lastAction === "add") {
        if (matchingEdge) {
          graph.deleteEdge(matchingEdge);
        }
      } else {
        if (!matchingEdge) {
          graph.addEdge(
            netChange.fromNode.id,
            netChange.toNode.id,
            netChange.color,
            netChange.weight
          );
        }
      }
    });

    app.render();

    // Create animation frames
    const frames: any[] = [];
    this.recordingEdges.forEach(
      ({ type, fromNode, toNode, color, weight }: any, edgeIndex: number) => {
        // Note: loop creates interpolationSteps+1 frames, so divide by that
        const stepDuration = edgeDuration / (interpolationSteps + 1);

        const partialLine = new PartialLine(
          { x: fromNode.coordinates.x, y: fromNode.coordinates.y },
          { x: toNode.coordinates.x, y: toNode.coordinates.y },
          type === "add" ? 0 : 1,
          true,
          color,
          weight,
          graph.zigzagSpacing,
          graph.zigzagLength,
          graph.zigzagEndLengths
        );

        for (let i = 0; i <= interpolationSteps; i++) {
          const progress = i / interpolationSteps;

          frames.push({
            action: () => {
              if (type === "add") {
                if (i === 0) {
                  animationPartialEdges[edgeIndex] = partialLine;
                } else if (i < interpolationSteps) {
                  partialLine.setProgress(progress);
                } else {
                  animationPartialEdges[edgeIndex] = null;
                  graph.addEdge(fromNode.id, toNode.id, color, weight);
                }
              } else {
                if (i === 0) {
                  const edges = graph.getEdgesInvolvingNodes([
                    fromNode.id,
                    toNode.id,
                  ]);
                  const edgeToRemove = edges.find(
                    (edge: Edge) =>
                      (edge.fromId === fromNode.id &&
                        edge.toId === toNode.id) ||
                      (edge.fromId === toNode.id && edge.toId === fromNode.id)
                  );
                  if (edgeToRemove) {
                    graph.deleteEdge(edgeToRemove);
                  }
                  animationPartialEdges[edgeIndex] = partialLine;
                } else if (i < interpolationSteps) {
                  partialLine.setProgress(1 - progress);
                } else {
                  animationPartialEdges[edgeIndex] = null;
                }
              }

              // Update elements to draw with partial edges
              const elements = [...graph.toDrawables()];
              animationPartialEdges.forEach((partial: any) => {
                if (partial) elements.push(partial);
              });
              app.elementsToDraw.value = elements;
              app.render();
            },
            duration: stepDuration,
          });
        }
      }
    );

    const addCount = this.recordingEdges.filter((e: any) => e.type === "add").length;
    const removeCount = this.recordingEdges.filter((e: any) => e.type === "remove").length;
    uiFacade.updateMovieStatus(
      `Encoding edge animation (${addCount} additions, ${removeCount} removals)...`
    );

    try {
      // Use VideoEncoder for precise timing
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

      const blob = await encoder.encodeVideo(videoFrames, (current, total) => {
        uiFacade.updateMovieStatus(
          `Encoding: ${current}/${total} frames (${Math.round((current / total) * 100)}%)`
        );
      });

      // Download the video
      this.downloadBlob(blob, "edge-animation.webm");
      
      uiFacade.updateMovieStatus("Movie saved successfully!");
      setTimeout(() => uiFacade.updateMovieStatus(""), 3000);
    } catch (error) {
      console.error("Error creating movie:", error);
      throw new Error("Error creating movie: " + error);
    } finally {
      animationPartialEdges.length = 0;
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
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 500);
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
                    const interpolated = interpolateWithPBC(start, end, progress, boxSize);
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
        // Use VideoEncoder for precise timing
        const encoder = new VideoEncoder({
          width: this.canvas.width,
          height: this.canvas.height,
          fps: 60,
          videoBitsPerSecond: 5000000,
        });

        const videoFrames = frames.map((frame: any) => ({
          render: (ctx: CanvasRenderingContext2D) => {
            // Execute the action which updates the graph and renders to main canvas
            frame.action();
            // Copy the main canvas to the encoder's canvas
            ctx.drawImage(this.canvas, 0, 0);
          },
          durationMs: frame.duration,
        }));

        const blob = await encoder.encodeVideo(videoFrames, (current, total) => {
          uiFacade.updateMovieStatus(
            `Encoding: ${current}/${total} frames (${Math.round((current / total) * 100)}%)`
          );
        });

        // Download the video
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
}

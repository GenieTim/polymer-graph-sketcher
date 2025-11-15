import { GlobalSettings } from "../utils/GlobalSettings";
import { Graph } from "../models/Graph";
import { Node } from "../models/Node";
import { Edge } from "../models/Edge";
import { Arrow } from "../models/Arrow";

/**
 * Captured state of the canvas and graph before scaling
 * Used to restore everything after scaling operations
 */
interface ScalingState {
  canvasWidth: number;
  canvasHeight: number;
  canvasSizeX: number;
  canvasSizeY: number;
  isScaled: boolean;
  nodeStates: Map<number, {
    x: number;
    y: number;
    radius: number;
    strokeWidth: number;
  }>;
  edgeWeights: Map<string, number>; // key: "fromId-toId"
  arrowWidths: Map<number, number>; // key: arrow id
  zigzagSpacing: number;
  zigzagLength: number;
  zigzagEndLengths: number;
}

/**
 * Service responsible for ALL scaling operations in the application
 * 
 * This service centralizes scaling logic to ensure consistency across:
 * - PNG export
 * - Stop-motion movie export
 * - Other movie exports
 * - Manual canvas resizing
 * 
 * Key responsibilities:
 * 1. Scale canvas dimensions
 * 2. Scale graph element properties (node radius, edge weight, etc.)
 * 3. Scale node positions
 * 4. Save and restore state for temporary scaling operations
 * 5. Provide effective scaling factors for rendering
 * 
 * Design principles:
 * - Single Responsibility: All scaling logic in one place
 * - State Management: Captures and restores state cleanly
 * - No side effects: Clearly defined when state is modified
 */
export class ScalingService {
  private savedState: ScalingState | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private settings: GlobalSettings
  ) {}

  /**
   * Get the effective scaling factor for rendering
   * 
   * During exports (PNG, movie), we use imageScaleFactor
   * During normal rendering, we use the provided scaling or default to 1
   * 
   * @param defaultScaling - Default scaling to use if not in export mode
   * @returns Effective scaling factors for x and y axes
   */
  getEffectiveScaling(defaultScaling = { x: 1, y: 1 }): { x: number; y: number } {
    if (this.settings.isScaled) {
      return {
        x: this.settings.imageScaleFactor,
        y: this.settings.imageScaleFactor
      };
    }
    return defaultScaling;
  }

  /**
   * Get 1D scaling factor (max of x and y) for symmetric elements
   * Used for line widths, radii, etc. that should scale uniformly
   */
  get1DScalingFactor(scaling: { x: number; y: number } = { x: 1, y: 1 }): number {
    const effectiveScaling = this.getEffectiveScaling(scaling);
    return Math.max(effectiveScaling.x, effectiveScaling.y);
  }

  /**
   * Scale the canvas and graph for high-resolution export
   * 
   * This captures the current state and scales:
   * 1. Canvas dimensions
   * 2. Settings.canvasSize
   * 3. Node positions and visual properties
   * 4. Edge visual properties
   * 5. Graph zigzag properties
   * 
   * Call restoreFromScaling() to undo all changes
   * 
   * @param scaleFactor - Factor to scale by (e.g., 2 for 2x resolution)
   * @param graph - Graph to scale
   */
  scaleForExport(scaleFactor: number, graph: Graph): void {
    if (this.savedState !== null) {
      throw new Error("Already in scaled state. Call restoreFromScaling() first.");
    }

    // Capture current state
    const nodeStates = new Map<number, { x: number; y: number; radius: number; strokeWidth: number }>();
    graph.getAllNodes().forEach((node: Node) => {
      nodeStates.set(node.id, {
        x: node.coordinates.x,
        y: node.coordinates.y,
        radius: node.radius,
        strokeWidth: node.strokeWidth,
      });
    });

    const edgeWeights = new Map<string, number>();
    graph.getAllEdges().forEach((edge: Edge) => {
      const key = `${edge.fromId}-${edge.toId}`;
      edgeWeights.set(key, edge.weight);
    });

    const arrowWidths = new Map<number, number>();
    graph.getAllArrows().forEach((arrow: Arrow) => {
      arrowWidths.set(arrow.id, arrow.width);
    });

    this.savedState = {
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      canvasSizeX: this.settings.canvasSize.x,
      canvasSizeY: this.settings.canvasSize.y,
      isScaled: this.settings.isScaled,
      nodeStates,
      edgeWeights,
      arrowWidths,
      zigzagSpacing: graph.zigzagSpacing,
      zigzagLength: graph.zigzagLength,
      zigzagEndLengths: graph.zigzagEndLengths,
    };

    // Scale canvas
    this.canvas.width = this.canvas.width * scaleFactor;
    this.canvas.height = this.canvas.height * scaleFactor;

    // Scale settings
    this.settings.canvasSize.x *= scaleFactor;
    this.settings.canvasSize.y *= scaleFactor;
    this.settings.isScaled = true;

    // Scale graph elements
    this.scaleGraphElements(graph, scaleFactor);
  }

  /**
   * Restore canvas and graph to their state before scaling
   * 
   * This undoes all changes made by scaleForExport()
   * 
   * @param graph - Graph to restore
   */
  restoreFromScaling(graph: Graph): void {
    if (this.savedState === null) {
      throw new Error("No saved scaling state to restore.");
    }

    const state = this.savedState;

    // Restore canvas
    this.canvas.width = state.canvasWidth;
    this.canvas.height = state.canvasHeight;

    // Restore settings
    this.settings.canvasSize.x = state.canvasSizeX;
    this.settings.canvasSize.y = state.canvasSizeY;
    this.settings.isScaled = state.isScaled;

    // Restore graph elements
    graph.getAllNodes().forEach((node: Node) => {
      const savedNode = state.nodeStates.get(node.id);
      if (savedNode) {
        node.coordinates.x = savedNode.x;
        node.coordinates.y = savedNode.y;
        node.radius = savedNode.radius;
        node.strokeWidth = savedNode.strokeWidth;
      }
    });

    graph.getAllEdges().forEach((edge: Edge) => {
      const key = `${edge.fromId}-${edge.toId}`;
      const savedWeight = state.edgeWeights.get(key);
      if (savedWeight !== undefined) {
        edge.weight = savedWeight;
      }
    });

    graph.getAllArrows().forEach((arrow: Arrow) => {
      const savedWidth = state.arrowWidths.get(arrow.id);
      if (savedWidth !== undefined) {
        arrow.width = savedWidth;
      }
    });

    graph.zigzagSpacing = state.zigzagSpacing;
    graph.zigzagLength = state.zigzagLength;
    graph.zigzagEndLengths = state.zigzagEndLengths;

    // Clear saved state
    this.savedState = null;
  }

  /**
   * Check if currently in scaled state
   */
  isInScaledState(): boolean {
    return this.savedState !== null;
  }

  /**
   * Scale graph elements by a factor
   * Internal method used by scaleForExport
   * 
   * @param graph - Graph to scale
   * @param scaleFactor - Factor to scale by
   */
  private scaleGraphElements(graph: Graph, scaleFactor: number): void {
    // Scale nodes
    graph.getAllNodes().forEach((node: Node) => {
      node.coordinates.x *= scaleFactor;
      node.coordinates.y *= scaleFactor;
      node.radius *= scaleFactor;
      node.strokeWidth *= scaleFactor;
    });

    // Scale edges
    graph.getAllEdges().forEach((edge: Edge) => {
      edge.weight *= scaleFactor;
    });

    // Scale arrows
    graph.getAllArrows().forEach((arrow: Arrow) => {
      arrow.width *= scaleFactor;
    });

    // Scale zigzag properties
    graph.zigzagSpacing *= scaleFactor;
    graph.zigzagLength *= scaleFactor;
    graph.zigzagEndLengths *= scaleFactor;
  }

  /**
   * Resize canvas and optionally scale graph elements
   * Used for manual canvas resizing (not export scaling)
   * 
   * @param width - New canvas width
   * @param height - New canvas height
   * @param rescaleElements - Whether to scale graph element visual properties
   * @param graph - Graph to potentially scale
   * @returns Scaling factors applied
   */
  resizeCanvas(
    width: number,
    height: number,
    rescaleElements: boolean,
    graph: Graph
  ): { xScaling: number; yScaling: number } {
    const prevWidth = this.canvas.width;
    const prevHeight = this.canvas.height;

    this.canvas.width = width;
    this.canvas.height = height;

    const xScaling = this.canvas.width / prevWidth;
    const yScaling = this.canvas.height / prevHeight;
    const scaling1D = Math.min(xScaling, yScaling);

    // Always reposition nodes to match new canvas size
    graph.getAllNodes().forEach((node: Node) => {
      node.coordinates.x *= xScaling;
      node.coordinates.y *= yScaling;
      if (rescaleElements) {
        node.radius *= scaling1D;
        node.strokeWidth *= scaling1D;
      }
    });

    if (rescaleElements) {
      graph.getAllEdges().forEach((edge: Edge) => {
        edge.weight *= scaling1D;
      });

      graph.getAllArrows().forEach((arrow: Arrow) => {
        arrow.width *= scaling1D;
      });

      graph.zigzagSpacing *= scaling1D;
      graph.zigzagLength *= scaling1D;
      graph.zigzagEndLengths *= scaling1D;
    }

    return { xScaling, yScaling };
  }

  /**
   * Execute a callback with scaled canvas and graph
   * Automatically scales before and restores after
   * Handles both sync and async callbacks
   * 
   * This is the recommended way to perform high-resolution exports
   * 
   * @param callback - Function to execute while scaled
   * @param scaleFactor - Factor to scale by
   * @param graph - Graph to scale
   * @param disableInteractiveMode - Callback to disable interactive rendering
   * @param enableInteractiveMode - Callback to re-enable interactive rendering
   * @returns Result of the callback
   */
  async withScaling<T>(
    callback: () => T | Promise<T>,
    scaleFactor: number,
    graph: Graph,
    disableInteractiveMode: () => void,
    enableInteractiveMode: () => void
  ): Promise<T> {
    // Disable interactive rendering (selection circles, temporary elements)
    disableInteractiveMode();

    // Scale for export
    this.scaleForExport(scaleFactor, graph);

    try {
      // Execute callback
      const result = await Promise.resolve(callback());
      
      // Restore from scaling
      this.restoreFromScaling(graph);
      
      // Re-enable interactive rendering
      enableInteractiveMode();
      
      return result;
    } catch (error) {
      // Ensure we restore even if there's an error
      this.restoreFromScaling(graph);
      enableInteractiveMode();
      throw error;
    }
  }
}

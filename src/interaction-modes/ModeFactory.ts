import { IInteractionMode } from "./IInteractionMode";
import { VertexMode } from "./VertexMode";
import { EdgeMode } from "./EdgeMode";
import { SelectMode } from "./SelectMode";
import { SelectChainsMode } from "./SelectChainsMode";
import { DeleteVertexMode } from "./DeleteVertexMode";
import { DeleteEdgeMode } from "./DeleteEdgeMode";
import { RandomWalkMode } from "./RandomWalkMode";
import { Point } from "../primitives";

/**
 * Factory for creating and managing interaction modes
 * Implements the Factory pattern
 */
export class InteractionModeFactory {
  private modes = new Map<string, IInteractionMode>();
  private currentMode: IInteractionMode | null = null;

  constructor(
    nodeCounter: { value: number },
    graph: any,
    selection: any,
    doRandomWalk: (startPoint: Point) => any
  ) {
    // Register all available modes
    this.modes.set("vertex", new VertexMode(nodeCounter));
    this.modes.set("edge", new EdgeMode(graph, selection));
    this.modes.set("select", new SelectMode(graph, selection));
    this.modes.set("select_chains", new SelectChainsMode(graph));
    this.modes.set("delete_vertex", new DeleteVertexMode(graph));
    this.modes.set("delete_edge", new DeleteEdgeMode(graph, selection));
    this.modes.set("random_walk", new RandomWalkMode(nodeCounter, doRandomWalk));
  }

  /**
   * Get a mode by name
   */
  getMode(name: string): IInteractionMode | null {
    return this.modes.get(name) || null;
  }

  /**
   * Set the current active mode
   */
  setCurrentMode(name: string): boolean {
    const mode = this.modes.get(name);
    
    if (!mode) {
      console.warn(`Mode '${name}' not found`);
      return false;
    }

    // Call onExit on the previous mode
    if (this.currentMode && this.currentMode.onExit) {
      this.currentMode.onExit();
    }

    this.currentMode = mode;

    // Call onEnter on the new mode
    if (this.currentMode.onEnter) {
      this.currentMode.onEnter();
    }

    return true;
  }

  /**
   * Get the current active mode
   */
  getCurrentMode(): IInteractionMode | null {
    return this.currentMode;
  }

  /**
   * Get all available mode names
   */
  getAvailableModes(): string[] {
    return Array.from(this.modes.keys());
  }

  /**
   * Get a specific mode instance (for setting callbacks, etc.)
   */
  getModeInstance<T extends IInteractionMode>(name: string): T | null {
    return this.modes.get(name) as T || null;
  }
}

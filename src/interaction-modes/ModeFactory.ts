import { InteractionMode } from "./InteractionMode";
import { VertexMode } from "./VertexMode";
import { EdgeMode } from "./EdgeMode";
import { ArrowMode } from "./ArrowMode";
import { SelectMode } from "./SelectMode";
import { SelectChainsMode } from "./SelectChainsMode";
import { DeleteVertexMode } from "./DeleteVertexMode";
import { DeleteEdgeMode } from "./DeleteEdgeMode";
import { DeleteArrowMode } from "./DeleteArrowMode";
import { RandomWalkMode } from "./RandomWalkMode";
import { Point } from "../models";
import { Container } from "../core/Container";
import { UIFacade } from "../facades/UIFacade";

/**
 * Factory for creating and managing interaction modes
 * Implements the Factory pattern
 */
export class InteractionModeFactory {
  private modes = new Map<string, InteractionMode>();
  private currentMode: InteractionMode | null = null;

  constructor(
    nodeCounter: { value: number },
    graph: any,
    selection: any,
    doRandomWalk: (startPoint: Point) => any,
    container: Container
  ) {
    const uiFacade = container.get<UIFacade>("ui");
    
    // Register all available modes
    this.modes.set("vertex", new VertexMode(nodeCounter, uiFacade));
    this.modes.set("edge", new EdgeMode(graph, selection, uiFacade, container));
    this.modes.set("arrow", new ArrowMode(graph, selection, uiFacade, container));
    this.modes.set("select", new SelectMode(graph, selection, container));
    this.modes.set("select_chains", new SelectChainsMode(graph));
    this.modes.set("delete_vertex", new DeleteVertexMode(graph));
    this.modes.set("delete_edge", new DeleteEdgeMode(graph, selection));
    this.modes.set("delete_arrow", new DeleteArrowMode(graph, selection));
    this.modes.set("random_walk", new RandomWalkMode(nodeCounter, doRandomWalk, uiFacade));

    // Initial mode
    this.setCurrentMode("vertex");
  }

  /**
   * Get a mode by name
   */
  getMode(name: string): InteractionMode | null {
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
  getCurrentMode(): InteractionMode | null {
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
  getModeInstance<T extends InteractionMode>(name: string): T | null {
    return this.modes.get(name) as T || null;
  }
}

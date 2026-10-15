import { Graph } from "../models/Graph";
import { GlobalSettings } from "../utils/GlobalSettings";

/**
 * Serialized animation data for stop-motion recordings
 */
export interface SerializedStopMotionFrame {
  graphState: {
    nodes: Array<{ id: number; x: number; y: number; radius: number; strokeWidth: number; fillColor: string; strokeColor: string }>;
    edges: Array<{ fromId: number; toId: number; color: string; weight: number }>;
    arrows: Array<{ fromId: number; toId: number; color: string; width: number; headAtStart: boolean; headAtEnd: boolean }>;
    zigzagSpacing?: number;
    zigzagLength?: number;
    zigzagEndLengths?: number;
  };
  duration: number;
  timestamp: number;
}

/**
 * Serialized edge recording data
 */
export interface SerializedRecordedEdge {
  type: "add" | "remove";
  fromNodeId: number;
  toNodeId: number;
  color: string;
  weight: number;
}

/**
 * Serialized animation data container
 */
export interface SerializedAnimations {
  stopMotion?: {
    frames: SerializedStopMotionFrame[];
    frameDuration: number;
    isRecording: boolean;
  };
  recordedEdges?: {
    edges: SerializedRecordedEdge[];
    isRecording: boolean;
  };
}

/**
 * Serialized state interface for type safety
 */
export interface SerializedState {
  version?: string;
  timestamp?: string;
  graph: any;
  settings: any;
  animations?: SerializedAnimations;
}

/**
 * Service for persisting and loading application state to/from localStorage
 * Also provides centralized serialization for export/import functionality
 * Follows the singleton pattern consistent with the codebase architecture
 */
export class StorageService {
  private static readonly STORAGE_KEY = "polymer-graph-sketcher-state";
  private static readonly STORAGE_VERSION = "1.0";

  /**
   * Serialize the current graph and settings to a JSON-compatible object
   * This is the centralized method used by both localStorage and file export
   * @param graph The graph instance to serialize
   * @param settings The settings instance to serialize
   * @param animations Optional animation data to include
   * @returns Serialized state object
   */
  static serialize(graph: Graph, settings: GlobalSettings, animations?: SerializedAnimations | null): SerializedState {
    const state: SerializedState = {
      version: this.STORAGE_VERSION,
      timestamp: new Date().toISOString(),
      graph: graph,  // Graph already has proper toJSON via its structure
      settings: settings,  // Settings already has proper toJSON via its structure
    };

    // Only include animations if they exist
    if (animations && Object.keys(animations).length > 0) {
      state.animations = animations;
    }

    return state;
  }

  /**
   * Deserialize state and populate graph and settings instances
   * This is the centralized method used by both localStorage and file import
   * @param data The serialized state data
   * @param graph The graph instance to populate
   * @param settings The settings instance to populate
   * @returns Object with success flag and optional animation data
   */
  static deserialize(
    data: SerializedState,
    graph: Graph,
    settings: GlobalSettings
  ): { success: boolean; animations?: SerializedAnimations } {
    try {
      // Version compatibility check
      if (data.version && data.version !== this.STORAGE_VERSION) {
        console.warn(
          `State version mismatch. Expected ${this.STORAGE_VERSION}, got ${data.version}`
        );
        // Could add migration logic here in the future
      }

      // Handle both new format (with settings) and legacy format (graph only)
      if ("settings" in data) {
        // New format with settings
        if (data.graph) {
          graph.fromJSON(data.graph);
        }
        if (data.settings) {
          this.applySettings(data.settings, settings);
        }
      } else {
        // Legacy format - just graph data
        graph.fromJSON(data);
      }

      // Return animation data if present (to be restored by caller)
      return {
        success: true,
        animations: data.animations,
      };
    } catch (error) {
      console.error("Failed to deserialize state:", error);
      return { success: false };
    }
  }

  /**
   * Apply settings from serialized data to a GlobalSettings instance
   * @param data The serialized settings data
   * @param settings The settings instance to populate
   */
  private static applySettings(data: any, settings: GlobalSettings): void {
    if (data.canvasSize) {
      settings.canvasSize.x = data.canvasSize.x;
      settings.canvasSize.y = data.canvasSize.y;
    }
    if (data.backgroundColor !== undefined) {
      settings.backgroundColor = data.backgroundColor;
    }
    if (data.imageScaleFactor !== undefined) {
      settings.imageScaleFactor = data.imageScaleFactor;
    }
    if (data.disablePBC !== undefined) {
      settings.disablePBC = data.disablePBC;
    }
    // Note: isScaled is deliberately not persisted as it's a runtime state
  }

  /**
   * Save the current graph and settings to localStorage
   * @param graph The graph instance to save
   * @param settings The settings instance to save
   * @param animations Optional animation data to save
   */
  static saveState(graph: Graph, settings: GlobalSettings, animations?: SerializedAnimations | null): void {
    try {
      const state = this.serialize(graph, settings, animations);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
      console.log("State saved to localStorage");
    } catch (error) {
      console.error("Failed to save state to localStorage:", error);
      // Don't throw - localStorage failures shouldn't break the app
    }
  }

  /**
   * Load the graph and settings from localStorage
   * @param graph The graph instance to populate
   * @param settings The settings instance to populate
   * @returns Object with success flag and optional animation data
   */
  static loadState(graph: Graph, settings: GlobalSettings): { success: boolean; animations?: SerializedAnimations } {
    try {
      const stateJson = localStorage.getItem(this.STORAGE_KEY);
      if (!stateJson) {
        console.log("No saved state found in localStorage");
        return { success: false };
      }

      const state = JSON.parse(stateJson);
      const result = this.deserialize(state, graph, settings);
      
      if (result.success) {
        console.log(`State loaded from localStorage (saved at ${state.timestamp || "unknown time"})`);
      }
      
      return result;
    } catch (error) {
      console.error("Failed to load state from localStorage:", error);
      return { success: false };
    }
  }

  /**
   * Clear all saved state from localStorage
   */
  static clearState(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log("State cleared from localStorage");
    } catch (error) {
      console.error("Failed to clear state from localStorage:", error);
    }
  }

  /**
   * Check if there is saved state available
   */
  static hasSavedState(): boolean {
    try {
      return localStorage.getItem(this.STORAGE_KEY) !== null;
    } catch (error) {
      console.error("Failed to check for saved state:", error);
      return false;
    }
  }
}

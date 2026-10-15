import { ActionManager } from "../actions";
import { Point } from "../models";

import { Drawable } from "../rendering";

/**
 * Interface for interaction modes using the Strategy pattern
 * Each mode implements how the canvas responds to user interactions
 */
export interface InteractionMode {
  /** The name/identifier of this interaction mode */
  name: string;

  /**
   * Handle canvas click events
   * @param point - The click coordinates
   * @param actionManager - The action manager for undo/redo support
   */
  onCanvasClick(point: Point, actionManager: ActionManager): void;

  /**
   * Optional: Handle mouse down events
   * @param event - The mouse event
   */
  onMouseDown?(event: MouseEvent): void;

  /**
   * Optional: Handle mouse move events
   * @param event - The mouse event
   * @returns true if render is needed, false otherwise
   */
  onMouseMove?(event: MouseEvent): boolean;

  /**
   * Optional: Handle mouse up events
   * @param event - The mouse event
   */
  onMouseUp?(event: MouseEvent): void;

  /**
   * Optional: Called when entering this mode
   */
  onEnter?(): void;

  /**
   * Optional: Called when leaving this mode
   */
  onExit?(): void;

  /**
   * Optional: Get temporary drawable elements for this mode
   * These are visual elements that should be rendered in normal view but not during exports
   * @returns Array of drawable elements
   */
  getTemporaryDrawables?(): Drawable[];
}

import { ActionManager } from "../actions";
import { Point } from "../primitives";

/**
 * Interface for interaction modes using the Strategy pattern
 * Each mode implements how the canvas responds to user interactions
 */
export interface IInteractionMode {
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
   */
  onMouseMove?(event: MouseEvent): void;

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
}

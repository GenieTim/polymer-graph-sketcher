import { Container } from "../core/Container";
import { Point } from "../primitives";
import { GlobalSettings } from "../settings";
import { Node } from "../graph";

/**
 * Controller for canvas-related events
 * Handles mouse interactions with the canvas
 */
export class CanvasController {
  private container: Container;
  private canvas: HTMLCanvasElement;
  private dragStart: Point | null = null;

  constructor(container: Container) {
    this.container = container;
    this.canvas = container.get<any>("canvas").canvas;
  }

  /**
   * Attach event listeners to the canvas
   */
  attachEventListeners(): void {
    this.canvas.addEventListener("click", this.handleClick.bind(this));
    window.addEventListener("mousedown", this.handleMouseDown.bind(this));
    window.addEventListener("mousemove", this.handleMouseMove.bind(this));
    window.addEventListener("mouseup", this.handleMouseUp.bind(this));
  }

  /**
   * Handle canvas click events
   */
  private handleClick(event: MouseEvent): void {
    if (this.dragStart) {
      return;
    }

    const canvasFacade = this.container.get<any>("canvas");
    const point = canvasFacade.clientToCanvasCoordinates(event.clientX, event.clientY);
    
    const modeFactory = this.container.get<any>("modeFactory");
    const currentMode = modeFactory.getCurrentMode();
    const actionManager = this.container.get<any>("actionManager");

    if (currentMode) {
      currentMode.onCanvasClick(point, actionManager);
    }
  }

  /**
   * Handle mouse down events
   */
  private handleMouseDown(event: MouseEvent): void {
    this.dragStart = { x: event.clientX, y: event.clientY };
    
    const modeFactory = this.container.get<any>("modeFactory");
    const currentMode = modeFactory.getCurrentMode();

    if (currentMode && currentMode.onMouseDown) {
      currentMode.onMouseDown(event);
    }
  }

  /**
   * Handle mouse move events (for dragging)
   */
  private handleMouseMove(event: MouseEvent): void {
    if (!this.dragStart) {
      return;
    }

    const modeFactory = this.container.get<any>("modeFactory");
    const currentMode = modeFactory.getCurrentMode();

    if (currentMode && currentMode.onMouseMove) {
      currentMode.onMouseMove(event);
      return;
    }

    // Default drag behavior: move selected nodes
    const dx = event.clientX - this.dragStart.x;
    const dy = event.clientY - this.dragStart.y;
    
    const selection = this.container.get<any>("selection");
    const settings = GlobalSettings.instance;
    const app = this.container.get<any>("app");

    selection.getItemsOfClass(Node).forEach((node: Node) => {
      node.coordinates.x += dx;
      node.coordinates.y += dy;

      // Wrap around boundaries (PBC - Periodic Boundary Conditions)
      if (node.coordinates.x < 0) {
        node.coordinates.x += settings.canvasSize.x;
      }
      if (node.coordinates.x >= settings.canvasSize.x) {
        node.coordinates.x -= settings.canvasSize.x;
      }
      if (node.coordinates.y < 0) {
        node.coordinates.y += settings.canvasSize.y;
      }
      if (node.coordinates.y >= settings.canvasSize.y) {
        node.coordinates.y -= settings.canvasSize.y;
      }
    });

    this.dragStart = { x: event.clientX, y: event.clientY };
    app.render();
  }

  /**
   * Handle mouse up events
   */
  private handleMouseUp(event: MouseEvent): void {
    this.dragStart = null;

    const modeFactory = this.container.get<any>("modeFactory");
    const currentMode = modeFactory.getCurrentMode();

    if (currentMode && currentMode.onMouseUp) {
      currentMode.onMouseUp(event);
    }
  }

  /**
   * Detach all event listeners
   */
  detachEventListeners(): void {
    this.canvas.removeEventListener("click", this.handleClick.bind(this));
    window.removeEventListener("mousedown", this.handleMouseDown.bind(this));
    window.removeEventListener("mousemove", this.handleMouseMove.bind(this));
    window.removeEventListener("mouseup", this.handleMouseUp.bind(this));
  }
}

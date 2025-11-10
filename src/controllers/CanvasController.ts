import { Container } from "../core/Container";
import { Point } from "../models";
import { GlobalSettings } from "../utils/GlobalSettings";
import { Node } from "../models";
import { MoveNodesAction } from "../actions";

/**
 * Controller for canvas-related events
 * Handles mouse interactions with the canvas
 */
export class CanvasController {
  private container: Container;
  private canvas: HTMLCanvasElement;
  private dragStart: Point | null = null;
  private draggedNodes: Node[] = [];
  private originalNodePositions: Point[] = [];
  private isDraggingNode = false;

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
    const point = canvasFacade.clientToCanvasCoordinates(
      event.clientX,
      event.clientY
    );

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

    // First check if we're clicking on a node
    const canvasFacade = this.container.get<any>("canvas");
    const point = canvasFacade.clientToCanvasCoordinates(
      event.clientX,
      event.clientY
    );
    const graph = this.container.get<any>("graph");
    const nodeAtPoint = graph.findNodeByCoordinates(point.x, point.y);

    if (currentMode && currentMode.onMouseDown) {
      // Let the mode handle the event
      currentMode.onMouseDown(event);

      // If we clicked on a node, also prepare for potential dragging
      if (nodeAtPoint) {
        const selection = this.container.get<any>("selection");
        this.draggedNodes = selection.getItemsOfClass(Node);
        this.originalNodePositions = this.draggedNodes.map(
          (node) => new Point(node.coordinates.x, node.coordinates.y)
        );
        this.isDraggingNode = true;
      } else {
        this.isDraggingNode = false;
      }
    } else {
      // Default behavior when no mode handles mouse down
      if (nodeAtPoint) {
        // Store the original positions of selected nodes for undo functionality
        const selection = this.container.get<any>("selection");
        this.draggedNodes = selection.getItemsOfClass(Node);
        this.originalNodePositions = this.draggedNodes.map(
          (node) => new Point(node.coordinates.x, node.coordinates.y)
        );
        this.isDraggingNode = true;
      } else {
        this.isDraggingNode = false;
      }
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

    // If we're dragging a node, handle it regardless of mode
    if (this.isDraggingNode) {
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
      return;
    }

    // Otherwise, let the mode handle it
    if (currentMode && currentMode.onMouseMove) {
      currentMode.onMouseMove(event);
      return;
    }
  }

  /**
   * Handle mouse up events
   */
  private handleMouseUp(event: MouseEvent): void {
    const modeFactory = this.container.get<any>("modeFactory");
    const currentMode = modeFactory.getCurrentMode();

    // If we were dragging nodes, handle that first
    if (this.dragStart && this.isDraggingNode && this.draggedNodes.length > 0) {
      // Create an action for the move operation if nodes were dragged
      const newPositions = this.draggedNodes.map(
        (node) => new Point(node.coordinates.x, node.coordinates.y)
      );

      // Check if any node actually moved
      const hasMoved = this.originalNodePositions.some(
        (origPos, index) =>
          origPos.x !== newPositions[index].x ||
          origPos.y !== newPositions[index].y
      );

      if (hasMoved) {
        const actionManager = this.container.get<any>("actionManager");
        const moveAction = new MoveNodesAction(
          this.draggedNodes,
          this.originalNodePositions,
          newPositions
        );

        // Undo the changes first (they were already applied during dragging)
        moveAction.undo();
        // Then add the action to the action manager (which will redo them)
        actionManager.addAction(moveAction);
      }
    } else if (currentMode && currentMode.onMouseUp) {
      // Otherwise, let the mode handle the mouse up event
      currentMode.onMouseUp(event);
    }

    this.dragStart = null;
    this.draggedNodes = [];
    this.originalNodePositions = [];
    this.isDraggingNode = false;
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

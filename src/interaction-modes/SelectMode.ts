import { InteractionMode } from "./InteractionMode";
import { ActionManager, SelectNodesAction, UnselectNodesAction } from "../actions";
import { Point, Node } from "../models";
import { Drawable, Rectangle } from "../rendering";

/**
 * Select mode - toggles selection of nodes
 * Supports both click selection and rectangle drag selection
 */
export class SelectMode implements InteractionMode {
  name = "select";
  
  // Rectangle selection state
  private isRectangleSelecting = false;
  private rectangleStart: Point | null = null;
  private currentPoint: Point | null = null;

  constructor(
    private graph: any, 
    private selection: any,
    private container: any
  ) {}

  onCanvasClick(point: Point, actionManager: ActionManager): void {
    const newSelectedNodes = this.graph.findNodesByCoordinates(point.x, point.y);
    
    if (newSelectedNodes.length) {
      if (this.selection.hasItems(newSelectedNodes)) {
        actionManager.addAction(new UnselectNodesAction(newSelectedNodes));
      } else {
        actionManager.addAction(new SelectNodesAction(newSelectedNodes));
      }
    }
  }

  onMouseDown(event: MouseEvent): void {
    const canvasFacade = this.container.get("canvas");
    const point = canvasFacade.clientToCanvasCoordinates(event.clientX, event.clientY);
    
    // Check if we're clicking on a node
    const nodeAtPoint = this.graph.findNodeByCoordinates(point.x, point.y);
    
    if (nodeAtPoint) {
      // Don't handle the event - let CanvasController handle node dragging
      // We'll just mark that we're NOT doing rectangle selection
      this.isRectangleSelecting = false;
      return;
    }
    
    // Start rectangle selection if not clicking on a node
    this.isRectangleSelecting = true;
    this.rectangleStart = point;
    this.currentPoint = point;
  }

  onMouseMove(event: MouseEvent): boolean {
    if (!this.isRectangleSelecting || !this.rectangleStart) {
      return false;
    }

    const canvasFacade = this.container.get("canvas");
    this.currentPoint = canvasFacade.clientToCanvasCoordinates(event.clientX, event.clientY);
    
    // Request render - the rectangle will be drawn via getTemporaryDrawables
    return true;
  }

  onMouseUp(event: MouseEvent): void {
    if (!this.isRectangleSelecting || !this.rectangleStart) {
      return;
    }

    const canvasFacade = this.container.get("canvas");
    const finalPoint = canvasFacade.clientToCanvasCoordinates(event.clientX, event.clientY);
    const actionManager = this.container.get("actionManager");
    
    // Calculate final rectangle bounds
    const minX = Math.min(this.rectangleStart.x, finalPoint.x);
    const maxX = Math.max(this.rectangleStart.x, finalPoint.x);
    const minY = Math.min(this.rectangleStart.y, finalPoint.y);
    const maxY = Math.max(this.rectangleStart.y, finalPoint.y);
    
    // Find all nodes within the rectangle
    const nodesInRectangle = this.graph.getAllNodes().filter((node: Node) => {
      return node.coordinates.x >= minX && 
             node.coordinates.x <= maxX && 
             node.coordinates.y >= minY && 
             node.coordinates.y <= maxY;
    });
    
    // Select the nodes if any were found
    if (nodesInRectangle.length > 0) {
      actionManager.addAction(new SelectNodesAction(nodesInRectangle));
    }
    
    // Clean up
    this.isRectangleSelecting = false;
    this.rectangleStart = null;
    this.currentPoint = null;
    
    // Trigger final render
    const app = this.container.get("app");
    app.render();
  }

  onExit(): void {
    // Clean up rectangle selection state when exiting the mode
    this.isRectangleSelecting = false;
    this.rectangleStart = null;
    this.currentPoint = null;
  }

  /**
   * Get temporary drawable elements (selection rectangle during drag)
   */
  getTemporaryDrawables(): Drawable[] {
    if (!this.isRectangleSelecting || !this.rectangleStart || !this.currentPoint) {
      return [];
    }

    // Calculate rectangle dimensions
    const width = this.currentPoint.x - this.rectangleStart.x;
    const height = this.currentPoint.y - this.rectangleStart.y;
    
    // Handle negative dimensions (dragging up/left)
    const topLeft = new Point(
      width >= 0 ? this.rectangleStart.x : this.currentPoint.x,
      height >= 0 ? this.rectangleStart.y : this.currentPoint.y
    );

    return [
      new Rectangle(
        topLeft,
        Math.abs(width),
        Math.abs(height),
        2,
        "#0066cc",
        "rgba(0, 102, 204, 0.1)",
        true // dashed
      )
    ];
  }
}

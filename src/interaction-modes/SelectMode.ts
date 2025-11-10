import { InteractionMode } from "./InteractionMode";
import { ActionManager, SelectNodesAction, UnselectNodesAction } from "../actions";
import { Point, Node } from "../models";
import { Rectangle } from "../rendering";

/**
 * Select mode - toggles selection of nodes
 * Supports both click selection and rectangle drag selection
 */
export class SelectMode implements InteractionMode {
  name = "select";
  
  // Rectangle selection state
  private isRectangleSelecting = false;
  private rectangleStart: Point | null = null;
  private selectionRectangle: Rectangle | null = null;

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
    this.selectionRectangle = new Rectangle(
      point,
      0,
      0,
      2,
      "#0066cc",
      "rgba(0, 102, 204, 0.1)"
    );
    
    // Set dashed line style
    const ctx = canvasFacade.getContext();
    ctx.setLineDash([5, 5]);
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isRectangleSelecting || !this.rectangleStart || !this.selectionRectangle) {
      return;
    }

    const canvasFacade = this.container.get("canvas");
    const currentPoint = canvasFacade.clientToCanvasCoordinates(event.clientX, event.clientY);
    
    // Update rectangle dimensions
    const width = currentPoint.x - this.rectangleStart.x;
    const height = currentPoint.y - this.rectangleStart.y;
    
    // Handle negative dimensions (dragging up/left)
    this.selectionRectangle.topLeft = new Point(
      width >= 0 ? this.rectangleStart.x : currentPoint.x,
      height >= 0 ? this.rectangleStart.y : currentPoint.y
    );
    this.selectionRectangle.width = Math.abs(width);
    this.selectionRectangle.height = Math.abs(height);
    
    // Trigger render to show the rectangle
    const app = this.container.get("app");
    app.render();
    
    // Draw the selection rectangle on top
    const ctx = canvasFacade.getContext();
    ctx.setLineDash([5, 5]);
    this.selectionRectangle.draw(ctx);
    ctx.setLineDash([]);
  }

  onMouseUp(event: MouseEvent): void {
    if (!this.isRectangleSelecting || !this.rectangleStart || !this.selectionRectangle) {
      return;
    }

    const canvasFacade = this.container.get("canvas");
    const currentPoint = canvasFacade.clientToCanvasCoordinates(event.clientX, event.clientY);
    const actionManager = this.container.get("actionManager");
    
    // Calculate final rectangle bounds
    const minX = Math.min(this.rectangleStart.x, currentPoint.x);
    const maxX = Math.max(this.rectangleStart.x, currentPoint.x);
    const minY = Math.min(this.rectangleStart.y, currentPoint.y);
    const maxY = Math.max(this.rectangleStart.y, currentPoint.y);
    
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
    this.selectionRectangle = null;
    
    // Reset line dash
    const ctx = canvasFacade.getContext();
    ctx.setLineDash([]);
    
    // Trigger final render
    const app = this.container.get("app");
    app.render();
  }

  onExit(): void {
    // Clean up rectangle selection state when exiting the mode
    this.isRectangleSelecting = false;
    this.rectangleStart = null;
    this.selectionRectangle = null;
  }
}

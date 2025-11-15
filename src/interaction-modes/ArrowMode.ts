import { InteractionMode } from "./InteractionMode";
import { ActionManager, AddArrowAction, SelectNodesAction } from "../actions";
import { Point } from "../models";
import { Node } from "../models";
import { UIFacade } from "../facades/UIFacade";
import { Drawable, PartialLine } from "../rendering";
import { Container } from "../core/Container";

/**
 * Arrow mode - creates arrows between selected nodes
 */
export class ArrowMode implements InteractionMode {
  name = "arrow";
  private cursorPosition: Point | null = null;

  constructor(
    private graph: any,
    private selection: any,
    private uiFacade: UIFacade,
    private container: Container
  ) {}

  onCanvasClick(point: Point, actionManager: ActionManager): void {
    const newSelectedNode = this.graph.findNodeByCoordinates(point.x, point.y);
    
    if (newSelectedNode !== null) {
      if (!this.selection.empty) {
        // Capture selected nodes BEFORE the action changes the selection
        const selectedNodesBeforeAction = this.selection.getItemsOfClass(Node);
        
        // Add the arrow action
        // AddArrowAction creates arrows FROM newSelectedNode TO each selected node
        actionManager.addAction(
          new AddArrowAction(newSelectedNode, selectedNodesBeforeAction, this.uiFacade)
        );
      } else {
        actionManager.addAction(new SelectNodesAction([newSelectedNode]));
      }
    }
  }

  /**
   * Handle mouse move events to track cursor position
   * @returns true if render is needed
   */
  onMouseMove(event: MouseEvent): boolean {
    const canvasFacade = this.container.get<any>("canvas");
    
    // Convert client coordinates to canvas coordinates
    this.cursorPosition = canvasFacade.clientToCanvasCoordinates(
      event.clientX,
      event.clientY
    );

    // Request render if we have selected nodes (so partial arrows are shown)
    return !this.selection.empty;
  }

  /**
   * Called when entering arrow mode
   */
  onEnter(): void {
    this.cursorPosition = null;
  }

  /**
   * Called when leaving arrow mode
   */
  onExit(): void {
    this.cursorPosition = null;
  }

  /**
   * Get temporary drawable elements (partial arrows from selected nodes to cursor)
   * These are only rendered in normal view, not during exports
   */
  getTemporaryDrawables(): Drawable[] {
    if (!this.cursorPosition || this.selection.empty) {
      return [];
    }

    const selectedNodes = this.selection.getItemsOfClass(Node);
    const partialArrows: Drawable[] = [];

    // Create a partial line from each selected node to the cursor
    selectedNodes.forEach((node: Node) => {
      partialArrows.push(
        new PartialLine(
          new Point(node.coordinates.x, node.coordinates.y),
          this.cursorPosition!,
          1, // full progress
          false, // not zigzagged
          "#888", // gray color to indicate partial/temporary
          2 // line width
        )
      );
    });

    return partialArrows;
  }
}

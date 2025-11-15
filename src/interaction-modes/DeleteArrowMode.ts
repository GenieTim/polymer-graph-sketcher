import { InteractionMode } from "./InteractionMode";
import { ActionManager, DeleteArrowsAction, SelectNodesAction } from "../actions";
import { Point } from "../models";
import { Node } from "../models";

/**
 * Delete arrow mode - deletes arrows between nodes
 */
export class DeleteArrowMode implements InteractionMode {
  name = "delete_arrow";

  constructor(
    private graph: any,
    private selection: any
  ) {}

  onCanvasClick(point: Point, actionManager: ActionManager): void {
    const newSelectedNode = this.graph.findNodeByCoordinates(point.x, point.y);
    
    if (
      (newSelectedNode !== null && !this.selection.empty) ||
      this.selection.length > 1
    ) {
      // Get arrows to delete
      const arrowsToDelete = newSelectedNode
        ? this.graph.getArrowsInvolvingNodes(
            [...this.selection.getItemsOfClass(Node).map((n: Node) => n.id), newSelectedNode.id]
          )
        : this.graph.getArrowsWithBothEndsInNodes(
            this.selection.getItemsOfClass(Node).map((n: Node) => n.id)
          );
      
      if (arrowsToDelete.length > 0) {
        actionManager.addAction(new DeleteArrowsAction(arrowsToDelete));
      }
    } else if (newSelectedNode) {
      actionManager.addAction(new SelectNodesAction([newSelectedNode]));
    }
  }
}

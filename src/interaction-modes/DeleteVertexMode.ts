import { IInteractionMode } from "./IInteractionMode";
import { ActionManager, DeleteNodesAction } from "../actions";
import { Point } from "../primitives";

/**
 * Delete vertex mode - deletes nodes on click
 */
export class DeleteVertexMode implements IInteractionMode {
  name = "delete_vertex";

  constructor(private graph: any) {}

  onCanvasClick(point: Point, actionManager: ActionManager): void {
    const newSelectedNode = this.graph.findNodeByCoordinates(point.x, point.y);
    
    if (newSelectedNode !== null) {
      actionManager.addAction(new DeleteNodesAction([newSelectedNode]));
    }
  }
}

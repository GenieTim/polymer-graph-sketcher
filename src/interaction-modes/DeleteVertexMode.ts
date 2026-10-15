import { InteractionMode } from "./InteractionMode";
import { ActionManager, DeleteNodesAction } from "../actions";
import { Point } from "../models";

/**
 * Delete vertex mode - deletes nodes on click
 */
export class DeleteVertexMode implements InteractionMode {
  name = "delete_vertex";

  constructor(private graph: any) {}

  onCanvasClick(point: Point, actionManager: ActionManager): void {
    const newSelectedNode = this.graph.findNodeByCoordinates(point.x, point.y);
    
    if (newSelectedNode !== null) {
      actionManager.addAction(new DeleteNodesAction([newSelectedNode]));
    }
  }
}

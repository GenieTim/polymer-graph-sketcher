import { InteractionMode } from "./InteractionMode";
import { ActionManager, DeleteEdgesAction, SelectNodesAction } from "../actions";
import { Point } from "../models";
import { Node } from "../models";

/**
 * Delete edge mode - deletes edges between nodes
 */
export class DeleteEdgeMode implements InteractionMode {
  name = "delete_edge";

  constructor(
    private graph: any,
    private selection: any,
    private recordingCallback?: (fromNode: Node, toNode: Node, isRemoval: boolean) => void
  ) {}

  onCanvasClick(point: Point, actionManager: ActionManager): void {
    const newSelectedNode = this.graph.findNodeByCoordinates(point.x, point.y);
    
    if (
      (newSelectedNode !== null && !this.selection.empty) ||
      this.selection.length > 1
    ) {
      // Record edge deletions if callback is provided
      if (this.recordingCallback && newSelectedNode !== null && !this.selection.empty) {
        const edgesToDelete = this.graph.getEdgesInvolvingNodes(
          [...this.selection.getItemsOfClass(Node).map((n: Node) => n.id), newSelectedNode.id]
        );
        
        edgesToDelete.forEach((edge: any) => {
          const fromNode = this.graph.getNode(edge.fromId);
          const toNode = this.graph.getNode(edge.toId);
          this.recordingCallback!(fromNode, toNode, true);
        });
      }
      
      actionManager.addAction(
        new DeleteEdgesAction(this.selection.getItemsOfClass(Node), newSelectedNode)
      );
    } else if (newSelectedNode) {
      actionManager.addAction(new SelectNodesAction([newSelectedNode]));
    }
  }

  /**
   * Set the recording callback for edge deletions
   */
  setRecordingCallback(callback: ((fromNode: Node, toNode: Node, isRemoval: boolean) => void) | undefined): void {
    this.recordingCallback = callback;
  }
}

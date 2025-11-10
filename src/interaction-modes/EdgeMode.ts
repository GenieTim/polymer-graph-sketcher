import { InteractionMode } from "./InteractionMode";
import { ActionManager, AddEdgeAction, SelectNodesAction } from "../actions";
import { Point } from "../models";
import { Node } from "../models";
import { UIFacade } from "../facades/UIFacade";

/**
 * Edge mode - creates edges between selected nodes
 */
export class EdgeMode implements InteractionMode {
  name = "edge";

  constructor(
    private graph: any,
    private selection: any,
    private uiFacade: UIFacade,
    private recordingCallback?: (fromNode: Node, toNode: Node) => void
  ) {}

  onCanvasClick(point: Point, actionManager: ActionManager): void {
    const newSelectedNode = this.graph.findNodeByCoordinates(point.x, point.y);
    
    if (newSelectedNode !== null) {
      if (!this.selection.empty) {
        // Record edges if callback is provided
        if (this.recordingCallback) {
          const selectedNodes = this.selection.getItemsOfClass(Node);
          selectedNodes.forEach((selectedNode: Node) => {
            this.recordingCallback!(selectedNode, newSelectedNode);
          });
        }
        
        actionManager.addAction(
          new AddEdgeAction(newSelectedNode, this.selection.getItemsOfClass(Node), this.uiFacade)
        );
      } else {
        actionManager.addAction(new SelectNodesAction([newSelectedNode]));
      }
    }
  }

  /**
   * Set the recording callback for edge additions
   */
  setRecordingCallback(callback: ((fromNode: Node, toNode: Node) => void) | undefined): void {
    this.recordingCallback = callback;
  }
}

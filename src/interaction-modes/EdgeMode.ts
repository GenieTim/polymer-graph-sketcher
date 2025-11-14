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
        // Capture selected nodes BEFORE the action changes the selection
        const selectedNodesBeforeAction = this.selection.getItemsOfClass(Node);
        
        // Add the edge action first
        // AddEdgeAction creates edges FROM newSelectedNode TO each selected node
        actionManager.addAction(
          new AddEdgeAction(newSelectedNode, selectedNodesBeforeAction, this.uiFacade)
        );
        
        // Record edges AFTER they've been created, using the captured selection
        console.log("EdgeMode: recordingCallback exists:", !!this.recordingCallback);
        if (this.recordingCallback) {
          console.log("EdgeMode: Recording edges for", selectedNodesBeforeAction.length, "selected nodes");
          selectedNodesBeforeAction.forEach((selectedNode: Node) => {
            // Pass nodes in correct order: FROM newSelectedNode TO selectedNode
            console.log("EdgeMode: Calling recordingCallback for", newSelectedNode.id, "->", selectedNode.id);
            this.recordingCallback!(newSelectedNode, selectedNode);
          });
        }
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

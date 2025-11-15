import { InteractionMode } from "./InteractionMode";
import { ActionManager, AddEdgeAction, SelectNodesAction } from "../actions";
import { Point } from "../models";
import { Node } from "../models";
import { UIFacade } from "../facades/UIFacade";
import { Drawable, PartialLine } from "../rendering";
import { Container } from "../core/Container";

/**
 * Edge mode - creates edges between selected nodes
 */
export class EdgeMode implements InteractionMode {
  name = "edge";
  private cursorPosition: Point | null = null;

  constructor(
    private graph: any,
    private selection: any,
    private uiFacade: UIFacade,
    private container: Container,
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

    // Request render if we have selected nodes (so partial edges are shown)
    return !this.selection.empty;
  }

  /**
   * Called when entering edge mode
   */
  onEnter(): void {
    this.cursorPosition = null;
  }

  /**
   * Called when leaving edge mode
   */
  onExit(): void {
    this.cursorPosition = null;
  }

  /**
   * Get temporary drawable elements (partial edges from selected nodes to cursor)
   * These are only rendered in normal view, not during exports
   */
  getTemporaryDrawables(): Drawable[] {
    if (!this.cursorPosition || this.selection.empty) {
      return [];
    }

    const selectedNodes = this.selection.getItemsOfClass(Node);
    const partialEdges: Drawable[] = [];

    // Create a partial line from each selected node to the cursor
    selectedNodes.forEach((node: Node) => {
      partialEdges.push(
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

    return partialEdges;
  }
}

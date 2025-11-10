import { Action } from "./Action";
import { Node, graph } from "../models";
import { Point } from "../models";
import { selection } from "../services/SelectionService";
import { UIFacade } from "../facades/UIFacade";

/**
 * Action that handles the addition of a single node to the graph.
 * This action creates a new node at the specified position with styling properties
 * retrieved from the UI elements, and selects the newly created node.
 */
export class AddNodeAction implements Action {
  /**
   * Creates a new AddNodeAction.
   *
   * @param nodeId - The unique identifier for the new node
   * @param position - The coordinates where the node should be placed
   * @param uiFacade - The UI facade for accessing DOM elements
   */
  constructor(
    private nodeId: number,
    private position: Point,
    private uiFacade: UIFacade
  ) {}

  /**
   * Performs the node addition by:
   * 1. Creating a new node with the specified ID and position
   * 2. Applying styling properties from the UI input elements
   * 3. Adding the node to the graph
   * 4. Selecting the newly created node
   */
  do() {
    graph.setNode(
      new Node(
        this.nodeId,
        this.position,
        this.uiFacade.getInputValueAsNumber("vertexRadius"),
        this.uiFacade.getInputValueAsNumber("vertexStrokeWidth"),
        this.uiFacade.getInputValue("nodeFillColor"),
        this.uiFacade.getInputValue("nodeColor")
      )
    );
    selection.setItem(graph.getNode(this.nodeId));
  }

  /**
   * Undoes the node addition by removing the node from the graph.
   */
  undo() {
    graph.deleteNode(this.nodeId);
  }
}

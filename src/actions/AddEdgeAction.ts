import { Action } from "./Action";
import { Node, graph } from "../models";
import { selection } from "../services/SelectionService";
import { UIFacade } from "../facades/UIFacade";

/**
 * Action that handles the addition of edges from a source node to one or more target nodes.
 * This action creates new edges between the specified nodes using styling properties
 * retrieved from the UI elements, and tracks the created edges to enable undoing.
 */
export class AddEdgeAction implements Action {
  /** Stores the IDs of edges created by this action for later removal during undo */
  private edgeIds: number[] = [];

  /**
   * Creates a new AddEdgeAction.
   *
   * @param fromNode - The source node from which all edges will originate
   * @param affectedNodes - Array of target nodes to which edges will be created from the source node
   * @param uiFacade - The UI facade for accessing DOM elements
   */
  constructor(
    private fromNode: Node,
    private affectedNodes: Node[],
    private uiFacade: UIFacade
  ) {}

  /**
   * Performs the edge addition by creating edges from the source node to each target node,
   * using styling properties from the UI elements. If only one or zero target nodes are specified,
   * selects the source node after edge creation.
   */
  do() {
    this.affectedNodes.forEach((node) => {
      this.edgeIds.push(
        graph.addEdge(
          this.fromNode.id,
          node.id,
          this.uiFacade.getInputValue("edgeColor"),
          this.uiFacade.getInputValueAsNumber("lineWidth")
        )
      );
    });
    if (this.affectedNodes.length <= 1) {
      selection.setItem(this.fromNode);
    }
  }

  /**
   * Undoes the edge addition by removing all edges created by this action
   * in reverse order to maintain consistency, and restores the selection to
   * the previously affected nodes.
   */
  undo() {
    this.edgeIds
      .slice()
      .reverse()
      .forEach((edgeId) => {
        graph.deleteEdge(edgeId);
      });
    selection.setSelectedItems(this.affectedNodes);
  }
}

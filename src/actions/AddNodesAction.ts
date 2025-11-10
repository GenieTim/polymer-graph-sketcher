import { Action } from "./Action";
import { Node, graph } from "../models";
import { selection } from "../services/SelectionService";

/**
 * Action that handles the addition of multiple nodes to the graph.
 * This action creates new nodes with the specified properties and selects them after creation.
 */
export class AddNodesAction implements Action {
  /**
   * Creates a new AddNodesAction.
   *
   * @param nodes - An array of Node objects to be added to the graph
   */
  constructor(private nodes: Node[]) {}

  /**
   * Performs the node addition by:
   * 1. Creating new nodes in the graph with properties from the provided nodes
   * 2. Selecting all the newly created nodes
   */
  do() {
    this.nodes.forEach((node) => {
      graph.setNode(
        new Node(
          node.id,
          node.coordinates,
          node.radius,
          node.strokeWidth,
          node.fillColor,
          node.strokeColor
        )
      );
    });
    selection.setSelectedItems(
      this.nodes.map((node) => {
        return graph.getNode(node.id);
      })
    );
  }

  /**
   * Undoes the node addition by removing all added nodes from the graph.
   */
  undo() {
    this.nodes.forEach((node) => {
      graph.deleteNode(node.id);
    });
  }
}

import { Action } from "./Action";
import { Node, Edge, graph } from "../models";
import { selection } from "../services/SelectionService";

/**
 * Action that handles the deletion of nodes from the graph.
 * When nodes are deleted, any edges connected to those nodes are also removed.
 * This action tracks both the deleted nodes and their connected edges to enable undoing.
 */
export class DeleteNodesAction implements Action {
  /**
   * Stores the edges that are removed as a result of deleting the nodes.
   * These edges are needed for the undo operation.
   */
  private affectedEdges: Edge[] = [];

  /**
   * Creates a new DeleteNodesAction.
   *
   * @param affectedNodes - The nodes to be deleted from the graph
   */
  constructor(private affectedNodes: Node[]) {}

  /**
   * Performs the node deletion by:
   * 1. Collecting all edges connected to the nodes being deleted
   * 2. Removing the nodes from the current selection
   * 3. Deleting the nodes from the graph
   */
  do() {
    this.affectedNodes.forEach((node) => {
      graph.getEdgesInvolvingNode(node.id).forEach((edge) => {
        this.affectedEdges.push(edge);
      });
      selection.removeItem(node);
      graph.deleteNode(node.id);
    });
  }

  /**
   * Restores the previously deleted nodes and their connected edges by:
   * 1. Re-adding the deleted nodes to the graph
   * 2. Adding the nodes back to the selection
   * 3. Re-creating all edges that were connected to the deleted nodes
   */
  undo() {
    this.affectedNodes.forEach((node) => {
      graph.setNode(node);
      selection.addItem(node);
    });
    this.affectedEdges.forEach((edge) => {
      graph.addEdge(edge.fromId, edge.toId, edge.color, edge.weight);
    });
  }
}

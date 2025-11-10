import { Action } from "./Action";
import { Node, Edge, graph } from "../models";
import { selection } from "../services/SelectionService";

/**
 * Action that handles the deletion of edges connected to specified nodes in the graph.
 * This action removes all edges involving the specified nodes and tracks the removed edges
 * to enable undoing the deletion. It can also optionally add an additional node to the selection
 * after deletion.
 */
export class DeleteEdgesAction implements Action {
  /** Stores the edges that are removed by this action for later restoration during undo */
  private edges: Edge[] = [];

  /**
   * Creates a new DeleteEdgesAction.
   *
   * @param affectedNodes - The nodes whose connected edges will be deleted
   * @param additionalNode - An optional node to add to the selection after edge deletion.
   *                         If provided, this node is also included in the set of nodes
   *                         whose edges will be deleted.
   */
  constructor(
    affectedNodes: Node[],
    private additionalNode: Node | null
  ) {
    if (additionalNode) {
      affectedNodes.push(additionalNode);
    }
    this.edges = graph.getEdgesInvolvingNodes(
      affectedNodes.map((node) => node.id)
    );
  }

  /**
   * Performs the edge deletion by removing all edges connected to the specified nodes.
   * If an additional node was specified, adds it to the current selection after deletion.
   */
  do() {
    this.edges.forEach((edge) => {
      graph.deleteEdge(edge);
    });
    if (this.additionalNode) {
      selection.addItem(this.additionalNode);
    }
  }

  /**
   * Undoes the edge deletion by restoring all previously removed edges.
   * If an additional node was added to the selection, removes it from the selection.
   */
  undo() {
    this.edges.forEach((edge) => {
      graph.addEdge(edge.fromId, edge.toId, edge.color, edge.weight);
    });
    if (this.additionalNode) {
      selection.removeItem(this.additionalNode);
    }
  }
}

import { graph } from "../models";
import { selection } from "../services/SelectionService";

function mergeNodes(node1: number, node2: number): void {
  if (node1 === node2) {
    return;
  }
  if (node1 > node2) {
    return mergeNodes(node2, node1);
  }
  const node2Edges = graph.getEdgesInvolvingNode(node2);
  node2Edges.forEach((edge) => {
    if (edge.fromId === node2) {
      edge.fromId = node1;
    } else {
      edge.toId = node1;
    }
  });
  const node1N = graph.getNode(node1);
  const node2N = graph.getNode(node2);
  node1N.coordinates.x = (node1N.coordinates.x + node2N.coordinates.x) / 2;
  node1N.coordinates.y = (node1N.coordinates.y + node2N.coordinates.y) / 2;
  graph.deleteNode(node2);
}

export function collapseEdgesByColor(color: string): void {
  let foundChange: boolean;
  do {
    foundChange = false;
    for (const edge of graph.getAllEdges()) {
      if (edge.color === color) {
        // merge the two nodes into one
        mergeNodes(edge.fromId, edge.toId);
        graph.deleteEdge(edge);
        foundChange = true;
        break;
      }
    }
  } while (foundChange);
  selection.clearSelection();
}

/**
 * Replace the two edges associated with a bifunctional node with a single edge.
 */
export function removeTwofunctionalNodes(): void {
  const nodes = graph.getAllNodes();
  for (const node of nodes) {
    const edges = graph.getEdgesInvolvingNode(node.id);
    if (
      edges.length === 2 &&
      edges[0].color === edges[1].color &&
      edges[0].weight === edges[1].weight
    ) {
      // delete the two edges, add a new edge between the two outer nodes
      graph.deleteEdge(edges[0]);
      graph.deleteEdge(edges[1]);
      graph.addEdge(
        edges[0].fromId == node.id ? edges[0].toId : edges[0].fromId,
        edges[1].fromId == node.id ? edges[1].toId : edges[1].fromId,
        edges[0].color,
        edges[0].weight
      );
      // delete the now unconnected node
      graph.deleteNode(node.id);
    }
  }
}

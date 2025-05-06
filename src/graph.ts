import { Point } from "./primitives";
import { Circle, Drawable, Line } from "./drawables";
import { Selectable } from "./selection";

export class Node implements Selectable {
  id: number;
  coordinates: Point;
  radius: number;
  strokeWidth: number;
  fillColor: string;
  strokeColor: string;

  constructor(
    id: number,
    coordinates: Point,
    radius: number = 5,
    strokeWidth: number = 1,
    fillColor: string = "#000",
    strokeColor: string = "#000"
  ) {
    // validate that `id` is integer
    if (typeof id !== "number" || !Number.isInteger(id) || id < 0) {
      throw new Error(
        "Invalid `id` parameter. It must be a non-negative integer, got `" +
          id +
          "`."
      );
    }

    this.id = id;
    this.coordinates = coordinates;
    this.radius = radius;
    this.strokeWidth = strokeWidth;
    this.fillColor = fillColor;
    this.strokeColor = strokeColor;
  }
}

export class Edge {
  fromId: number;
  toId: number;
  weight: number;
  color: string;
  id: number;

  constructor(
    fromId: number,
    toId: number,
    id: number,
    weight: number = 1,
    color: string = "#000"
  ) {
    this.fromId = fromId;
    this.toId = toId;
    this.id = id;
    this.weight = weight;
    this.color = color;
  }

  getOtherNodeId(nodeId: number): number {
    return this.fromId === nodeId ? this.toId : this.fromId;
  }
}

/**
 * A class representing a graph with nodes and edges.
 */
class Graph {
  private nodes: { [key: string]: Node };
  private edges: Edge[];
  private scalingFactor: Point;
  public zigzagSpacing: number = 4;
  public zigzagLength: number = 3;
  public zigzagEndLengths: number = 1.5;
  private maxNodeId = 0;

  constructor() {
    this.nodes = {};
    this.edges = [];
    this.scalingFactor = new Point(1, 1);
  }

  clear(): void {
    this.nodes = {};
    this.edges = [];
  }

  setNode(node: Node): void {
    this.nodes[node.id] = node;
    this.maxNodeId = Math.max(this.maxNodeId, node.id);
  }

  addEdge(
    fromId: number,
    toId: number,
    color: string = "#000",
    weight: number = 1
  ): number {
    if (!(fromId in this.nodes) || !(toId in this.nodes)) {
      throw new Error("One or both nodes do not exist in the graph.");
    }

    this.edges.push(new Edge(fromId, toId, this.edges.length, weight, color));
    return this.edges.length - 1;
  }

  getNode(id: number): Node {
    // throw error if node does not exist
    if (!(id in this.nodes)) {
      throw new Error(`Node with id "${id}" does not exist.`);
    }
    return this.nodes[id];
  }

  getNrOfNodes(): number {
    return Object.keys(this.nodes).length;
  }

  getNrOfEdges() {
    return this.edges.length;
  }

  getAllNodeIds(): number[] {
    return Object.values(this.nodes).map((node) => node.id);
  }
  getNextNodeId(): number {
    return this.maxNodeId + 1;
  }

  getAllNodes(): Node[] {
    return Object.values(this.nodes);
  }

  getAllEdges(): Edge[] {
    return this.edges;
  }

  getNodesConnectedToNode(id: number): Node[] {
    return this.getEdgesInvolvingNode(id).map(
      (edge) => this.nodes[edge.fromId === id ? edge.toId : edge.fromId]
    );
  }

  /**
   * Follow all edges that start from the given node, and return all connected nodes.
   * Continue until no more unvisited edges are found.
   *
   * @param mainNode the node to find connected nodes from
   */
  deepConnectedTo(mainNode: Node) {
    const visited = new Set<number>();
    const result: Node[] = [];
    const queue: number[] = [mainNode.id];

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (visited.has(currentId)) continue;

      visited.add(currentId);
      result.push(this.getNode(currentId));

      const connectedNodes = this.getEdgesInvolvingNode(currentId)
        .map((edge) => edge.getOtherNodeId(currentId))
        .filter((id) => !visited.has(id));

      queue.push(...connectedNodes);
    }

    return result;
  }

  getEdgesInvolvingNode(id: number): Edge[] {
    return this.edges.filter((edge) => edge.fromId === id || edge.toId === id);
  }

  getEdgesInvolvingNodes(ids: number[]): Edge[] {
    return this.edges.filter(
      (edge) => ids.includes(edge.fromId) && ids.includes(edge.toId)
    );
  }

  cleanupEdges(): void {
    this.edges = this.edges.filter((edge) => edge.fromId !== edge.toId);
  }

  removeDuplicateEdges(): void {
    const seen = new Set();
    this.edges = this.edges.filter((edge) => {
      const combinedId = `${Math.min(edge.fromId, edge.toId)}-${Math.max(
        edge.fromId,
        edge.toId
      )}`;
      if (seen.has(combinedId)) {
        return false;
      }
      seen.add(combinedId);
      return true;
    });
  }

  getEdgesWithBothEndsInNodes(nodeIds: number[]): Edge[] {
    return this.edges.filter(
      (edge) => nodeIds.includes(edge.fromId) && nodeIds.includes(edge.toId)
    );
  }

  fromJSON(json: any): void {
    this.nodes = {};
    this.edges = [];

    for (const [key, node] of Object.entries(json.nodes)) {
      this.setNode(
        new Node(
          (node as any).id,
          (node as any).coordinates,
          (node as any).radius,
          (node as any).strokeWidth,
          (node as any).fillColor,
          (node as any).strokeColor
        )
      );
    }

    for (const edge of json.edges) {
      this.addEdge(edge.fromId, edge.toId, edge.color, edge.weight);
    }

    if ("scalingFactor" in json) {
      this.scalingFactor = new Point(
        json.scalingFactor.x,
        json.scalingFactor.y
      );
    }

    if ("zigzagSpacing" in json) {
      this.zigzagSpacing = json.zigzagSpacing;
    }
    if ("zigzagLength" in json) {
      this.zigzagLength = json.zigzagLength;
    }

    this.cleanupEdges();
  }

  /**
   * Transforms the graph into a list of drawable objects (objects with a `draw(ctx)` method)
   * for rendering.
   *
   * @returns {Array} An array of drawable objects,
   * where each object represents a node or an edge.
   *
   * @throws {Error} Throws an error if a node referenced by an edge
   * does not exist in the graph.
   */
  toDrawables(): Drawable[] {
    const drawables: Drawable[] = [];
    const scalingFactor1D = Math.max(
      this.scalingFactor.x,
      this.scalingFactor.y
    );

    // first the edges to hide them behind the nodes
    for (const edge of this.edges) {
      const fromNode = this.getNode(edge.fromId);
      const toNode = this.getNode(edge.toId);
      if (fromNode && toNode) {
        const scaledCoordinatesFrom = new Point(
          fromNode.coordinates.x * this.scalingFactor.x,
          fromNode.coordinates.y * this.scalingFactor.y
        );
        const scaledCoordinatesTo = new Point(
          toNode.coordinates.x * this.scalingFactor.x,
          toNode.coordinates.y * this.scalingFactor.y
        );

        drawables.push(
          new Line(
            scaledCoordinatesFrom,
            scaledCoordinatesTo,
            true,
            edge.color,
            edge.weight * scalingFactor1D,
            this.zigzagSpacing * scalingFactor1D,
            this.zigzagLength * scalingFactor1D,
            this.zigzagEndLengths * scalingFactor1D
          )
        );
      } else {
        throw new Error(
          `Node with id ${edge.fromId} or ${edge.toId} does not exist in the graph.`
        );
      }
    }

    // then the nodes
    for (const node of Object.values(this.nodes)) {
      const scaledCoordinates = new Point(
        node.coordinates.x * this.scalingFactor.x,
        node.coordinates.y * this.scalingFactor.y
      );
      drawables.push(
        new Circle(
          scaledCoordinates,
          node.radius * scalingFactor1D,
          node.strokeWidth * scalingFactor1D,
          node.fillColor,
          node.strokeColor
        )
      );
    }

    return drawables;
  }

  /**
   * Finds a node in the graph based on given coordinates.
   *
   * @param {number} x - The x-coordinate to search for.
   * @param {number} y - The y-coordinate to search for.
   * @returns {Node[]} The nodes found at the given coordinates, or null if no node is found within 5 units of the given coordinates.
   */
  findNodesByCoordinates(x: number, y: number): Node[] {
    let results: Node[] = [];
    for (const [key, node] of Object.entries(this.nodes)) {
      const distance = Math.sqrt(
        Math.pow(node.coordinates.x - x, 2) +
          Math.pow(node.coordinates.y - y, 2)
      );

      if (distance <= 5) {
        results.push(node);
      }
    }

    return results;
  }

  findNodeByCoordinates(x: number, y: number): Node | null {
    const nodes = this.findNodesByCoordinates(x, y);
    return nodes.length > 0 ? nodes[0] : null;
  }

  /**
   * Deletes a node from the graph and removes all edges connected to it.
   *
   * @param {number} id - The unique identifier of the node to be deleted.
   * @throws {Error} Throws an error if the node with the given id does not exist in the graph.
   */
  deleteNode(id: number): void {
    const node = this.getNode(id);

    if (!node) {
      throw new Error("The node does not exist in the graph.");
    }

    delete this.nodes[id];

    for (let i = 0; i < this.edges.length; i++) {
      if (this.edges[i].fromId === id || this.edges[i].toId === id) {
        this.edges.splice(i, 1);
        i--;
      }
    }
  }

  /**
   * Deletes an edge from the graph.
   *
   * @param edgeId - The identifier of the edge to be deleted. Can be either:
   *                 - A number representing the index of the edge in the edges array.
   *                 - An Edge object to be removed from the graph.
   *
   * @returns The deleted Edge object.
   *
   * @throws {Error} If the provided edgeId is invalid (out of bounds of the edges array).
   */
  deleteEdge(edgeId: number | Edge): Edge {
    if (edgeId instanceof Edge) {
      edgeId = this.edges.indexOf(edgeId);
    }
    if (edgeId < 0 || edgeId >= this.edges.length) {
      throw new Error(
        "Invalid edge ID " +
          edgeId +
          ". Edge ID must be between 0 and " +
          (this.edges.length - 1) +
          "."
      );
    }

    const edge = this.edges[edgeId];
    this.edges.splice(edgeId, 1);
    return edge;
  }
}

export const graph = new Graph();

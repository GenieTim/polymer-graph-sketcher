import { Edge, graph, Node } from "./graph";
import { Point, Vector2d } from "./primitives";
import { selection } from "./selection";
import { GlobalSettings } from "./settings";

function PBC(distance: Vector2d, boxHalf: Vector2d): Vector2d {
  // do PBC
  while (distance.x > boxHalf.x) {
    distance.x -= boxHalf.x * 2;
  }
  while (distance.x < -boxHalf.x) {
    distance.x += boxHalf.x * 2;
  }
  while (distance.y > boxHalf.y) {
    distance.y -= boxHalf.y * 2;
  }
  while (distance.y < -boxHalf.y) {
    distance.y += boxHalf.y * 2;
  }
  return distance;
}

function moveIntoBox(point: Point, boxSize: Vector2d): Point {
  while (point.x < 0) {
    point.x += boxSize.x;
  }
  while (point.x > boxSize.x) {
    point.x -= boxSize.x;
  }
  while (point.y < 0) {
    point.y += boxSize.y;
  }
  while (point.y > boxSize.y) {
    point.y -= boxSize.y;
  }
  return point;
}

function computeForceBetween(node1: Node, node2: Node): Vector2d {
  const pos1 = new Vector2d(node1.coordinates.x, node1.coordinates.y);
  const pos2 = new Vector2d(node2.coordinates.x, node2.coordinates.y);
  let distance: Vector2d = pos2.subtract(pos1);
  // distance
  return distance;
}

export function doForceBalanceStep(): void {
  const boxSize = new Vector2d(
    GlobalSettings.instance.canvasSize.x,
    GlobalSettings.instance.canvasSize.y
  );
  const boxHalf = boxSize.multiply(0.5);
  // console.log("Box size: " + boxSize.toString(), [boxHalf, boxSize]);
  // const allNodes = graph.getAllNodes();
  const allNodes = selection.getItemsOfClass(Node);
  allNodes.forEach((node) => {
    const neighbours = graph.getNodesConnectedToNode(node.id);
    let force: Vector2d = new Vector2d(0, 0);
    neighbours.forEach((neighbour) => {
      const distance = computeForceBetween(node, neighbour);
      const correctedDistance = PBC(distance, boxHalf).multiply(
        1 / neighbours.length
      );
      force = force.add(correctedDistance);
    });
    console.log(`Node ${node.id} has force: ${force.toString()}`);
    const targetCoords = moveIntoBox(
      new Vector2d(force.x + node.coordinates.x, force.y + node.coordinates.y),
      boxSize
    );
    node.coordinates.x = targetCoords.x;
    node.coordinates.y = targetCoords.y;
  });
}

export function doRandomWalk(startingPoint: Point): {
  nodes: Node[];
  edges: Edge[];
} {
  const boxSize = new Vector2d(
    GlobalSettings.instance.canvasSize.x,
    GlobalSettings.instance.canvasSize.y
  );

  const stepSize: number = (
    document.getElementById("randomWalkStepSize") as HTMLInputElement
  ).valueAsNumber;
  const maxAngle: number =
    ((document.getElementById("randomWalkMaxAngle") as HTMLInputElement)
      .valueAsNumber *
      Math.PI) /
    180;
  const nSteps: number = (
    document.getElementById("randomWalkSteps") as HTMLInputElement
  ).valueAsNumber;
  const resultingNodes: Node[] = [];
  const resultingEdges: Edge[] = [];

  // Get the vertex property from the UI
  const vertexRadius = (
    document.getElementById("vertexRadius") as HTMLInputElement
  ).valueAsNumber;
  const vertexStrokeWidth = (
    document.getElementById("vertexStrokeWidth") as HTMLInputElement
  ).valueAsNumber;
  const vertexFill = (
    document.getElementById("nodeFillColor") as HTMLInputElement
  ).value;
  const vertexStroke = (
    document.getElementById("nodeColor") as HTMLInputElement
  ).value;

  // Create the first node at the starting point
  const firstNode = new Node(
    graph.getNextNodeId(),
    startingPoint,
    vertexRadius,
    vertexStrokeWidth,
    vertexFill,
    vertexStroke
  );
  resultingNodes.push(firstNode);

  // Initialize current position and direction
  let currentPosition = new Point(startingPoint.x, startingPoint.y);
  // Start with a random direction (0 to 2π)
  let currentDirection = Math.random() * 2 * Math.PI;

  // Get edge color and width from the UI
  const edgeColor = (document.getElementById("edgeColor") as HTMLInputElement)
    .value;
  const edgeWeight = parseFloat(
    (document.getElementById("lineWidth") as HTMLInputElement).value
  );

  // Perform the random walk
  for (let i = 0; i < nSteps; i++) {
    // Calculate a random angle within the maxAngle constraint
    const angleChange = (Math.random() * 2 - 1) * maxAngle;
    currentDirection += angleChange;

    // Calculate the new position
    const newX = currentPosition.x + stepSize * Math.cos(currentDirection);
    const newY = currentPosition.y + stepSize * Math.sin(currentDirection);
    currentPosition = new Point(newX, newY);

    // Move into the box
    currentPosition = moveIntoBox(currentPosition, boxSize);

    // Create a new node at the new position
    const newNode = new Node(
      graph.getNextNodeId() + i + 1,
      currentPosition,
      vertexRadius,
      vertexStrokeWidth,
      vertexFill,
      vertexStroke
    );
    resultingNodes.push(newNode);

    // Create an edge between the previous node and the new node
    const previousNode = resultingNodes[resultingNodes.length - 2];
    const edge = new Edge(
      previousNode.id,
      newNode.id,
      -1,
      edgeWeight,
      edgeColor
    );
    resultingEdges.push(edge);
  }

  // finally, return the resulting nodes and edges
  return { nodes: resultingNodes, edges: resultingEdges };
}

/**
 * Move each node in the graph such that the nodes are a bit more evenly distributed.
 * Helps to move nodes away from each other.
 * Each step of each node is at most the radius of that node.
 */
export function doPositionEquilibrationStep(): void {
  const nodes = selection.getItemsOfClass(Node);
  console.log("Equilibrating " + nodes.length + " nodes...");

  if (nodes.length < 1) return; // No need to equilibrate if there's only one or zero nodes

  const boxSize = new Vector2d(
    GlobalSettings.instance.canvasSize.x,
    GlobalSettings.instance.canvasSize.y
  );
  const boxHalf = boxSize.multiply(0.5);

  // Repulsion factor - can be adjusted as needed
  const repulsionStrength = 25.0;

  // Calculate forces for each node
  for (const node of nodes) {
    let totalForce = new Vector2d(0, 0);

    // Calculate repulsive forces from all other nodes
    for (const otherNode of graph.getAllNodes()) {
      if (node.id === otherNode.id) continue;

      const pos1 = new Vector2d(node.coordinates.x, node.coordinates.y);
      const pos2 = new Vector2d(
        otherNode.coordinates.x,
        otherNode.coordinates.y
      );
      let distance = pos2.subtract(pos1);

      // Apply periodic boundary conditions
      distance = PBC(distance, boxHalf);

      // Calculate distance magnitude
      const distanceMagnitude = Math.sqrt(
        distance.x * distance.x + distance.y * distance.y
      );

      if (distanceMagnitude > 0) {
        // Repulsive force inversely proportional to distance
        const forceMagnitude =
          repulsionStrength / (distanceMagnitude * distanceMagnitude);

        // Normalize the distance vector and scale by force magnitude
        const forceVector = distance.multiply(-forceMagnitude);
        totalForce = totalForce.add(forceVector);
      }
    }

    console.log(`Node ${node.id} experiences force: ${totalForce.toString()} and has radius ${node.radius}...`);

    // Limit the maximum step size to the node's radius
    if (totalForce.x > node.radius) totalForce.x = node.radius;
    if (totalForce.x < -node.radius) totalForce.x = -node.radius;
    if (totalForce.y > node.radius) totalForce.y = node.radius;
    if (totalForce.y < -node.radius) totalForce.y = -node.radius;

    // Update node position
    const newPos = new Vector2d(
      node.coordinates.x + totalForce.x,
      node.coordinates.y + totalForce.y
    );

    // Ensure the node stays within the box
    // const boundedPos = moveIntoBox(newPos, boxSize);
    node.coordinates = newPos;
  }
}

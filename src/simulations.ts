import { graph, Node } from "./graph";
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
    GlobalSettings.instance.canvasSize.y,
    GlobalSettings.instance.canvasSize.x
  );
  const boxHalf = boxSize.multiply(0.5);
  console.log("Box size: " + boxSize.toString(), [boxHalf, boxSize]);
  // const allNodes = graph.getAllNodes();
  const allNodes = selection.getItemsOfClass(Node);
  allNodes.forEach((node) => {
    const neighbours = graph.getNodesConnectedToNode(node.id);
    let force: Vector2d = new Vector2d(0, 0);
    neighbours.forEach((neighbour) => {
      const distance = computeForceBetween(node, neighbour);
      const correctedDistance = PBC(distance, boxHalf).multiply(1 / neighbours.length);
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

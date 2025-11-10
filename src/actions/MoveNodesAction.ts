import { Action } from "./Action";
import { Node } from "../models";
import { Point } from "../models";

/**
 * Action that handles moving multiple nodes to new positions.
 * This action tracks the original position of each node to enable undoing.
 */
export class MoveNodesAction implements Action {
  private affectedNodes: Node[];
  private originalPositions: Point[];
  private newPositions: Point[];

  /**
   * Creates a new MoveNodesAction.
   *
   * @param affectedNodes - The nodes to be moved
   * @param originalPositions - The original positions of the nodes before moving
   * @param newPositions - The new positions for the nodes after moving
   */
  constructor(affectedNodes: Node[], originalPositions: Point[], newPositions: Point[]) {
    this.affectedNodes = affectedNodes;
    this.originalPositions = originalPositions.map(p => new Point(p.x, p.y));
    this.newPositions = newPositions.map(p => new Point(p.x, p.y));
  }

  /**
   * Performs the move by setting each node to its new position.
   */
  do() {
    this.affectedNodes.forEach((node, index) => {
      node.coordinates.x = this.newPositions[index].x;
      node.coordinates.y = this.newPositions[index].y;
    });
  }

  /**
   * Undoes the move by restoring each node to its original position.
   */
  undo() {
    this.affectedNodes.forEach((node, index) => {
      node.coordinates.x = this.originalPositions[index].x;
      node.coordinates.y = this.originalPositions[index].y;
    });
  }
}

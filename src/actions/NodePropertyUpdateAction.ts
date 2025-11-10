import { Action } from "./Action";
import { Node } from "../models";

/**
 * Action that handles updating a specific property for multiple nodes simultaneously.
 * This action tracks the original values of the property for each node to enable undoing.
 *
 * @typeParam K - The key of the Node property being updated
 */
export class NodePropertyUpdateAction<K extends keyof Node> implements Action {
  private affectedNodes: Node[];
  private originalValues: Node[K][];
  private targetValue: Node[K];
  private property: K;

  /**
   * Creates a new NodePropertyUpdateAction.
   *
   * @param affectedNodes - The nodes whose property will be updated
   * @param targetValue - The new value to set for the specified property
   * @param property - The property key to update on each node
   */
  constructor(affectedNodes: Node[], targetValue: Node[K], property: K) {
    this.affectedNodes = affectedNodes;
    this.originalValues = affectedNodes.map((node) => node[property]);
    this.targetValue = targetValue;
    this.property = property;
  }

  /**
   * Performs the property update by setting the specified property
   * to the target value for all affected nodes.
   */
  do() {
    this.affectedNodes.forEach((node) => {
      node[this.property] = this.targetValue;
    });
  }

  /**
   * Undoes the property update by restoring each node's original
   * property value from before the action was performed.
   */
  undo() {
    this.affectedNodes.forEach((node, index) => {
      node[this.property] = this.originalValues[index];
    });
  }
}

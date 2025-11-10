import { Action } from "./Action";
import { graph } from "../models";
import { UIFacade } from "../facades/UIFacade";

/**
 * Action that handles the addition of multiple edges to the graph.
 * This action creates new edges between specified node pairs, using styling properties
 * retrieved from the UI elements, and tracks the created edges to enable undoing.
 */
export class AddEdgesAction implements Action {
  /** Stores the IDs of edges created by this action for later removal during undo */
  private edgeIds: number[] = [];

  /**
   * Creates a new AddEdgesAction.
   *
   * @param edgesFrom - Array of node IDs representing the source nodes of the edges
   * @param edgesTo - Array of node IDs representing the target nodes of the edges
   * @param uiFacade - The UI facade for accessing DOM elements
   * @throws Error if the edgesFrom and edgesTo arrays have different lengths
   */
  constructor(
    private edgesFrom: number[],
    private edgesTo: number[],
    private uiFacade: UIFacade
  ) {
    if (edgesFrom.length !== edgesTo.length) {
      throw new Error("edgesFrom and edgesTo must have the same length");
    }
  }

  /**
   * Performs the edge addition by creating edges between each pair of nodes
   * specified in the edgesFrom and edgesTo arrays, using styling properties
   * from the UI elements.
   */
  do() {
    for (let i = 0; i < this.edgesFrom.length; i++) {
      this.edgeIds.push(
        graph.addEdge(
          this.edgesFrom[i],
          this.edgesTo[i],
          this.uiFacade.getInputValue("edgeColor"),
          this.uiFacade.getInputValueAsNumber("lineWidth")
        )
      );
    }
  }

  /**
   * Undoes the edge addition by removing all edges created by this action
   * in reverse order to maintain consistency.
   */
  undo() {
    this.edgeIds
      .slice()
      .reverse()
      .forEach((edgeId) => {
        graph.deleteEdge(edgeId);
      });
  }
}

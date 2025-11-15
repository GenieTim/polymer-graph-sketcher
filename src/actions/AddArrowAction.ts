import { Action } from "./Action";
import { Node, graph } from "../models";
import { selection } from "../services/SelectionService";
import { UIFacade } from "../facades/UIFacade";

/**
 * Action that handles the addition of arrows from a source node to one or more target nodes.
 * This action creates new arrows between the specified nodes using styling properties
 * retrieved from the UI elements, and tracks the created arrows to enable undoing.
 */
export class AddArrowAction implements Action {
  /** Stores the IDs of arrows created by this action for later removal during undo */
  private arrowIds: number[] = [];

  /**
   * Creates a new AddArrowAction.
   *
   * @param fromNode - The source node from which all arrows will originate
   * @param affectedNodes - Array of target nodes to which arrows will be created from the source node
   * @param uiFacade - The UI facade for accessing DOM elements
   */
  constructor(
    private fromNode: Node,
    private affectedNodes: Node[],
    private uiFacade: UIFacade
  ) {}

  /**
   * Performs the arrow addition by creating arrows from the source node to each target node,
   * using styling properties from the UI elements. If only one or zero target nodes are specified,
   * selects the source node after arrow creation.
   */
  do() {
    this.affectedNodes.forEach((node) => {
      this.arrowIds.push(
        graph.addArrow(
          this.fromNode.id,
          node.id,
          this.uiFacade.getInputValue("arrowColor"),
          this.uiFacade.getInputValueAsNumber("arrowWidth"),
          this.uiFacade.getInputChecked("arrowHeadAtStart"),
          this.uiFacade.getInputChecked("arrowHeadAtEnd")
        )
      );
    });
    if (this.affectedNodes.length <= 1) {
      selection.setItem(this.fromNode);
    }
  }

  /**
   * Undoes the arrow addition by removing all arrows created by this action
   * in reverse order to maintain consistency, and restores the selection to
   * the previously affected nodes.
   */
  undo() {
    this.arrowIds
      .slice()
      .reverse()
      .forEach((arrowId) => {
        graph.deleteArrow(arrowId);
      });
    selection.setSelectedItems(this.affectedNodes);
  }
}

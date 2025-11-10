import { Action } from "./Action";
import { Node } from "../models";
import { Selectable, selection } from "../services/SelectionService";

/**
 * Action that removes specific nodes from the current selection.
 * This action tracks the previous selection state to enable undoing the unselection.
 */
export class UnselectNodesAction implements Action {
  /**
   * Stores the complete selection state before the unselection occurs
   */
  private previousSelectedNodes: Selectable[] = selection.getSelectedItems();

  /**
   * Creates a new UnselectNodesAction.
   *
   * @param affectedNodes - The nodes to be removed from the current selection
   */
  constructor(private affectedNodes: Node[]) {
    this.affectedNodes.forEach((node) => {
      if (!this.previousSelectedNodes.includes(node)) {
        console.warn("Trying to unselect a node that is not selected");
      }
    });
    console.log("Unselecting nodes:", this.affectedNodes);
  }

  /**
   * Performs the unselection by filtering out the affected nodes from the current selection.
   */
  do(): void {
    selection.setSelectedItems(
      this.previousSelectedNodes.filter(
        (node) => !(node instanceof Node && this.affectedNodes.includes(node))
      )
    );
  }

  /**
   * Undoes the unselection by restoring the previous selection state.
   */
  undo(): void {
    selection.setSelectedItems(this.previousSelectedNodes);
  }
}

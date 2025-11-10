import { Action } from "./Action";
import { Node } from "../models";
import { Selectable, selection } from "../services/SelectionService";

/**
 * Action that selects one or more nodes in the graph.
 * This action can either add nodes to the current selection or replace the current selection entirely.
 */
export class SelectNodesAction implements Action {
  /**
   * Stores the previously selected items to enable undoing the selection change
   */
  private previousSelectedNodes: Selectable[] = selection.getSelectedItems();

  /**
   * Creates a new SelectNodesAction
   *
   * @param affectedNodes - The nodes to be selected
   * @param clearSelection - If true, replaces the current selection with the affected nodes.
   *                         If false, adds the affected nodes to the current selection.
   */
  constructor(
    private affectedNodes: Node[],
    private clearSelection = false
  ) {}

  /**
   * Performs the selection action by either adding the affected nodes to the current selection
   * or replacing the current selection with the affected nodes.
   */
  do(): void {
    if (this.clearSelection) {
      selection.setSelectedItems(this.affectedNodes);
    } else {
      this.affectedNodes.forEach((node) => {
        selection.addItem(node);
      });
    }
  }

  /**
   * Undoes the selection action by restoring the previous selection state.
   */
  undo(): void {
    selection.setSelectedItems(this.previousSelectedNodes);
  }
}

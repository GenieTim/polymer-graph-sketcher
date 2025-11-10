import { Action } from "./Action";
import { Selectable, selection } from "../services/SelectionService";

/**
 * Action that clears all currently selected items in the graph.
 * This action removes all items from the current selection while preserving
 * the previous selection state to enable undoing.
 */
export class ClearSelectionAction implements Action {
  /**
   * Creates a new ClearSelectionAction.
   *
   * @param previousSelectedNodes - The items that were selected before this action.
   *                               Defaults to the currently selected items.
   *                               This is stored to enable undoing the selection change.
   */
  constructor(
    private previousSelectedNodes: Selectable[] = selection.getSelectedItems()
  ) {}

  /**
   * Performs the clear selection action by removing all items from the current selection.
   */
  do() {
    selection.clearSelection();
  }

  /**
   * Undoes the clear selection action by restoring the previous selection state.
   */
  undo() {
    selection.setSelectedItems(this.previousSelectedNodes);
  }
}

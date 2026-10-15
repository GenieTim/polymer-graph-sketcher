import { Action } from "./Action";
import { graph } from "../models";
import { Selectable, selection } from "../services/SelectionService";

/**
 * Action that inverts the current selection of nodes in the graph.
 * This action toggles the selection state of all nodes, effectively selecting all previously
 * unselected nodes and unselecting all previously selected nodes. It preserves the previous
 * selection state to enable undoing.
 */
export class InvertSelectionAction implements Action {
  /**
   * Creates a new InvertSelectionAction.
   *
   * @param previousSelectedNodes - The items that were selected before this action.
   *                               Defaults to the currently selected items.
   *                               This is stored to enable undoing the selection change.
   */
  constructor(
    private previousSelectedNodes: Selectable[] = selection.getSelectedItems()
  ) {}

  /**
   * Performs the invert selection action by toggling the selection state of all nodes in the graph.
   * This selects all previously unselected nodes and unselects all previously selected nodes.
   */
  do() {
    selection.toggleItems(graph.getAllNodes());
  }

  /**
   * Undoes the invert selection action by restoring the previous selection state.
   */
  undo() {
    selection.setSelectedItems(this.previousSelectedNodes);
  }
}

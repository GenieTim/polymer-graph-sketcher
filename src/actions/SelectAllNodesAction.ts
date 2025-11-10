import { Action } from "./Action";
import { Node, graph } from "../models";
import { selection } from "../services/SelectionService";

/**
 * Action that selects all nodes in the graph.
 * This action replaces the current selection with all nodes present in the graph,
 * while preserving the previous selection state to enable undoing.
 */
export class SelectAllNodesAction implements Action {
  /**
   * Creates a new SelectAllNodesAction.
   *
   * @param previousSelectedNodes - The nodes that were selected before this action.
   *                               Defaults to the currently selected nodes of type Node.
   *                               This is stored to enable undoing the selection change.
   */
  constructor(
    private previousSelectedNodes: Node[] = selection.getItemsOfClass(Node)
  ) {}

  /**
   * Performs the select-all action by setting the selection to include all nodes in the graph.
   */
  do() {
    selection.setSelectedItems(graph.getAllNodes());
  }

  /**
   * Undoes the select-all action by restoring the previous selection state.
   */
  undo() {
    selection.setSelectedItems(this.previousSelectedNodes);
  }
}

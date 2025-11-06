import { IInteractionMode } from "./IInteractionMode";
import { ActionManager, SelectNodesAction, UnselectNodesAction } from "../actions";
import { Point } from "../primitives";

/**
 * Select mode - toggles selection of nodes
 */
export class SelectMode implements IInteractionMode {
  name = "select";

  constructor(private graph: any, private selection: any) {}

  onCanvasClick(point: Point, actionManager: ActionManager): void {
    const newSelectedNodes = this.graph.findNodesByCoordinates(point.x, point.y);
    
    if (newSelectedNodes.length) {
      if (this.selection.hasItems(newSelectedNodes)) {
        actionManager.addAction(new UnselectNodesAction(newSelectedNodes));
      } else {
        actionManager.addAction(new SelectNodesAction(newSelectedNodes));
      }
    }
  }
}

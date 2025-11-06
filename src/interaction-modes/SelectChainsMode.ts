import { IInteractionMode } from "./IInteractionMode";
import { ActionManager, SelectNodesAction } from "../actions";
import { Point } from "../primitives";

/**
 * Select chains mode - selects all connected nodes
 */
export class SelectChainsMode implements IInteractionMode {
  name = "select_chains";

  constructor(private graph: any) {}

  onCanvasClick(point: Point, actionManager: ActionManager): void {
    const mainNode = this.graph.findNodeByCoordinates(point.x, point.y);
    
    if (mainNode !== null) {
      const newSelectedNodes = this.graph.deepConnectedTo(mainNode);
      actionManager.addAction(new SelectNodesAction(newSelectedNodes, true));
    }
  }
}

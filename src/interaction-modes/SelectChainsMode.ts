import { InteractionMode } from "./InteractionMode";
import { ActionManager, SelectNodesAction } from "../actions";
import { Point } from "../models";

/**
 * Select chains mode - selects all connected nodes
 */
export class SelectChainsMode implements InteractionMode {
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

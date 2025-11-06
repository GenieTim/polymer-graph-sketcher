import { IInteractionMode } from "./IInteractionMode";
import { ActionManager, AddNodesAction, AddEdgesAction } from "../actions";
import { Point } from "../primitives";

/**
 * Random walk mode - creates a random walk from click point
 */
export class RandomWalkMode implements IInteractionMode {
  name = "random_walk";

  constructor(
    private nodeCounter: { value: number },
    private doRandomWalk: (startPoint: Point) => any
  ) {}

  onCanvasClick(point: Point, actionManager: ActionManager): void {
    const walk = this.doRandomWalk(point);
    
    actionManager.addAction(new AddNodesAction(walk.nodes));
    actionManager.addAction(
      new AddEdgesAction(
        walk.edges.map((edge: any) => edge.fromId),
        walk.edges.map((edge: any) => edge.toId)
      )
    );
    
    this.nodeCounter.value += walk.nodes.length + 1;
  }
}

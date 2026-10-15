import { InteractionMode } from "./InteractionMode";
import { ActionManager, AddNodeAction } from "../actions";
import { Point } from "../models";
import { UIFacade } from "../facades/UIFacade";

/**
 * Vertex mode - creates new nodes on click
 */
export class VertexMode implements InteractionMode {
  name = "vertex";

  constructor(
    private nodeCounter: { value: number },
    private uiFacade: UIFacade
  ) {}

  onCanvasClick(point: Point, actionManager: ActionManager): void {
    actionManager.addAction(new AddNodeAction(this.nodeCounter.value, point, this.uiFacade));
    this.nodeCounter.value += 1;
  }

  onEnter(): void {
    console.log("Entered vertex mode");
  }
}

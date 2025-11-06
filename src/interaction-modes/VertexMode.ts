import { IInteractionMode } from "./IInteractionMode";
import { ActionManager, AddNodeAction } from "../actions";
import { Point } from "../primitives";

/**
 * Vertex mode - creates new nodes on click
 */
export class VertexMode implements IInteractionMode {
  name = "vertex";

  constructor(private nodeCounter: { value: number }) {}

  onCanvasClick(point: Point, actionManager: ActionManager): void {
    actionManager.addAction(new AddNodeAction(this.nodeCounter.value, point));
    this.nodeCounter.value += 1;
  }

  onEnter(): void {
    console.log("Entered vertex mode");
  }
}

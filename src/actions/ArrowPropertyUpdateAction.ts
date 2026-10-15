import { Action } from "./Action";
import { Arrow } from "../models";

/**
 * Action to update properties of arrows
 */
export class ArrowPropertyUpdateAction implements Action {
  private oldValues: Map<
    Arrow,
    {
      color: string;
      width: number;
      headAtStart: boolean;
      headAtEnd: boolean;
    }
  > = new Map();

  constructor(
    private arrows: Arrow[],
    private newColor?: string,
    private newWidth?: number,
    private newHeadAtStart?: boolean,
    private newHeadAtEnd?: boolean
  ) {}

  do() {
    this.arrows.forEach((arrow) => {
      // Store old values
      this.oldValues.set(arrow, {
        color: arrow.color,
        width: arrow.width,
        headAtStart: arrow.headAtStart,
        headAtEnd: arrow.headAtEnd,
      });

      // Apply new values
      if (this.newColor !== undefined) {
        arrow.color = this.newColor;
      }
      if (this.newWidth !== undefined) {
        arrow.width = this.newWidth;
      }
      if (this.newHeadAtStart !== undefined) {
        arrow.headAtStart = this.newHeadAtStart;
      }
      if (this.newHeadAtEnd !== undefined) {
        arrow.headAtEnd = this.newHeadAtEnd;
      }
    });
  }

  undo() {
    this.arrows.forEach((arrow) => {
      const oldValues = this.oldValues.get(arrow);
      if (oldValues) {
        arrow.color = oldValues.color;
        arrow.width = oldValues.width;
        arrow.headAtStart = oldValues.headAtStart;
        arrow.headAtEnd = oldValues.headAtEnd;
      }
    });
  }
}

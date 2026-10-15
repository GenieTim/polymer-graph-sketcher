import { Action } from "./Action";
import { Arrow, graph } from "../models";

/**
 * Action that deletes multiple arrows from the graph
 */
export class DeleteArrowsAction implements Action {
  private deletedArrows: {
    arrow: Arrow;
    index: number;
  }[] = [];

  constructor(private arrows: Arrow[]) {}

  do() {
    // Store arrows with their indices for proper restoration
    this.deletedArrows = this.arrows.map((arrow) => ({
      arrow: new Arrow(
        arrow.fromId,
        arrow.toId,
        arrow.id,
        arrow.color,
        arrow.width,
        arrow.headAtStart,
        arrow.headAtEnd
      ),
      index: graph.getAllArrows().indexOf(arrow),
    }));

    // Delete arrows (in reverse to maintain indices)
    this.arrows
      .slice()
      .reverse()
      .forEach((arrow) => {
        graph.deleteArrow(arrow);
      });
  }

  undo() {
    // Restore arrows in order
    this.deletedArrows
      .sort((a, b) => a.index - b.index)
      .forEach((item) => {
        graph.addArrow(
          item.arrow.fromId,
          item.arrow.toId,
          item.arrow.color,
          item.arrow.width,
          item.arrow.headAtStart,
          item.arrow.headAtEnd
        );
      });
  }
}

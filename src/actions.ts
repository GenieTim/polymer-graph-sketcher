export interface Action {
  do(): void;
  undo(): void;
}

export class ActionManager {
  private doneStack: Action[] = [];
  private undoneStack: Action[] = [];

  private afterActionCallback: () => void;

  constructor(afterActionCallback: () => void) {
    this.afterActionCallback = afterActionCallback;
  }

  addAction(action: Action): void {
    this.doneStack.push(action);
    action.do();
    this.undoneStack = [];
    this.afterActionCallback();
  }

  undo(): void {
    // console.log("Undoing action");
    if (this.doneStack.length) {
      const action: Action = this.doneStack.pop() as Action;
      action.undo();
      this.undoneStack.push(action);
      this.afterActionCallback();
    }
  }

  redo(): void {
    // console.log("Redoing action");
    if (this.undoneStack.length) {
      const action: Action = this.undoneStack.pop() as Action;
      action.do();
      this.doneStack.push(action);
      this.afterActionCallback();
    }
  }
}

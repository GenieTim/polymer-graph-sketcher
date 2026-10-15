import { Action } from "./Action";

/**
 * The ActionManager class manages a stack of actions and provides methods to add, undo, and redo actions.
 * It maintains two stacks: one for completed actions that can be undone, and another for undone actions
 * that can be redone.
 */
export class ActionManager {
  /** Stack of actions that have been performed and can be undone */
  private doneStack: Action[] = [];

  /** Stack of actions that have been undone and can be redone */
  private undoneStack: Action[] = [];

  /** Callback function that is called after any action is performed, undone, or redone */
  private afterActionCallback: () => void;

  /**
   * Creates a new ActionManager instance.
   *
   * @param afterActionCallback - A callback function that will be invoked after any action
   *                             is performed, undone, or redone. Typically used to update the UI
   *                             or application state after an action completes.
   */
  constructor(afterActionCallback: () => void) {
    this.afterActionCallback = afterActionCallback;
  }

  /**
   * Adds a new action to the manager and immediately executes it.
   * This method also clears the undo stack, as adding a new action
   * creates a new branch in the action history.
   *
   * @param action - The action to add and execute
   */
  addAction(action: Action): void {
    this.doneStack.push(action);
    action.do();
    this.undoneStack = [];
    this.afterActionCallback();
  }

  /**
   * Undoes the most recent action in the done stack.
   * The undone action is moved to the undone stack so it can be redone if needed.
   * If the done stack is empty, this method does nothing.
   */
  undo(): void {
    // console.log("Undoing action");
    if (this.doneStack.length) {
      const action: Action = this.doneStack.pop() as Action;
      action.undo();
      this.undoneStack.push(action);
      this.afterActionCallback();
    }
  }

  /**
   * Redoes the most recently undone action.
   * The redone action is moved back to the done stack.
   * If the undone stack is empty, this method does nothing.
   */
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

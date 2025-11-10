/**
 * The interface for actions that can be performed, and undone
 */
export interface Action {
  do(): void;
  undo(): void;
}

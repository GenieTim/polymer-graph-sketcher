import { Container } from "../core/Container";

/**
 * Controller for keyboard shortcuts
 * Handles global keyboard events
 */
export class KeyboardController {
  private container: Container;

  constructor(container: Container) {
    this.container = container;
  }

  /**
   * Attach keyboard event listeners
   */
  attachEventListeners(): void {
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
  }

  /**
   * Handle keyboard events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    const actionManager = this.container.get<any>("actionManager");
    const modeFactory = this.container.get<any>("modeFactory");
    const ClearSelectionAction = this.container.get<any>("ClearSelectionAction");
    const SelectAllNodesAction = this.container.get<any>("SelectAllNodesAction");
    const InvertSelectionAction = this.container.get<any>("InvertSelectionAction");
    const DeleteNodesAction = this.container.get<any>("DeleteNodesAction");
    const selection = this.container.get<any>("selection");
    const Node = this.container.get<any>("Node");
    const movieFacade = this.container.get<any>("movie");

    // Ctrl/Cmd shortcuts
    if (event.ctrlKey || event.metaKey) {
      // Undo: Ctrl/Cmd + Z (without Shift)
      if (event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        actionManager.undo();
        return;
      }
      
      // Redo: Ctrl/Cmd + Shift + Z OR Ctrl/Cmd + Y
      if ((event.key === "z" && event.shiftKey) || event.key === "y") {
        event.preventDefault();
        actionManager.redo();
        return;
      }

      // Save: Ctrl/Cmd + S
      if (event.key === "s") {
        event.preventDefault();
        // TODO: Call export/save functions
        return;
      }

      return; // Don't process other Ctrl/Cmd shortcuts
    }

    // Shift key shortcuts (without Ctrl/Cmd/Alt)
    if (event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      switch (event.key) {
        case "A":
          modeFactory.setCurrentMode("arrow");
          this.updateModeUI("arrow");
          break;
      }
      return; // Don't process other Shift shortcuts
    }

    // Plain key shortcuts (without modifiers)
    if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
      switch (event.key) {
        // Selection shortcuts
        case "a":
          actionManager.addAction(new SelectAllNodesAction());
          break;
        case "c":
        case "Escape":
          actionManager.addAction(new ClearSelectionAction());
          break;
        case "i":
          actionManager.addAction(new InvertSelectionAction());
          break;
        case "Backspace":
        case "Delete":
          actionManager.addAction(new DeleteNodesAction(selection.getItemsOfClass(Node)));
          break;

        // Mode shortcuts
        case "v":
          modeFactory.setCurrentMode("vertex");
          this.updateModeUI("vertex");
          break;
        case "e":
          modeFactory.setCurrentMode("edge");
          this.updateModeUI("edge");
          break;
        case "s":
          modeFactory.setCurrentMode("select");
          this.updateModeUI("select");
          break;
        case "d":
          modeFactory.setCurrentMode("delete_vertex");
          this.updateModeUI("delete_vertex");
          break;
        case "l":
          modeFactory.setCurrentMode("delete_edge");
          this.updateModeUI("delete_edge");
          break;
        case "w":
          modeFactory.setCurrentMode("delete_arrow");
          this.updateModeUI("delete_arrow");
          break;
        case "h":
          modeFactory.setCurrentMode("select_chains");
          this.updateModeUI("select_chains");
          break;
        case "r":
          modeFactory.setCurrentMode("random_walk");
          this.updateModeUI("random_walk");
          break;

        // Stop-motion frame capture shortcut
        case "f":
          // Only capture if stop-motion recording is active
          if (movieFacade && movieFacade.isStopMotionRecording()) {
            this.captureStopMotionFrame();
          }
          break;
      }
    }
  }

  /**
   * Update the mode UI element to reflect the current mode
   */
  private updateModeUI(mode: string): void {
    const modeSwitch = document.getElementById("modeSwitch") as HTMLSelectElement;
    if (modeSwitch) {
      modeSwitch.value = mode;
    }
  }

  /**
   * Capture a stop-motion frame (called by keyboard shortcut)
   */
  private captureStopMotionFrame(): void {
    const movieFacade = this.container.get<any>("movie");
    const uiFacade = this.container.get<any>("ui");

    if (!movieFacade || !movieFacade.isStopMotionRecording()) {
      return;
    }

    const frameCount = movieFacade.captureStopMotionFrame();
    uiFacade.updateStopMotionIndicator(`Recording... (${frameCount} frames)`, "red");
    uiFacade.updateMovieStatus(`Frame ${frameCount} captured!`);
  }

  /**
   * Detach keyboard event listeners
   */
  detachEventListeners(): void {
    document.removeEventListener("keydown", this.handleKeyDown.bind(this));
  }
}

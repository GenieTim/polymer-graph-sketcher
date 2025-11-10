/**
 * Main entry point for the Polymer Graph Sketcher application
 * This file bootstraps the application using dependency injection and the new architecture
 */

// Core imports
import { Container } from "./core/Container";
import { Application } from "./core/Application";

// Facade imports
import { CanvasFacade } from "./facades/CanvasFacade";
import { UIFacade } from "./facades/UIFacade";
import { MovieFacade } from "./facades/MovieFacade";

// Controller imports
import { CanvasController } from "./controllers/CanvasController";
import { UIController } from "./controllers/UIController";
import { KeyboardController } from "./controllers/KeyboardController";

// Interaction mode imports
import { InteractionModeFactory } from "./interaction-modes/ModeFactory";

// Existing imports
import { ActionManager } from "./actions";
import { Circle, Rectangle, PartialLine } from "./rendering";
import { graph, Node } from "./models";
import { GlobalSettings } from "./utils/GlobalSettings";
import { selection } from "./services/SelectionService";
import { doRandomWalk, doForceBalanceStep, doPositionEquilibrationStep } from "./services/SimulationService";
import "./style.css";

// Action imports for registration
import {
  ClearSelectionAction,
  SelectAllNodesAction,
  InvertSelectionAction,
  DeleteNodesAction,
  AddNodeAction,
  AddEdgeAction,
} from "./actions";

/**
 * Bootstrap function - initializes and wires up the entire application
 */
function bootstrap(): void {
  // Get DOM elements
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const canvasParent = document.getElementById("canvas-parent") as HTMLElement;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  if (!canvas || !ctx) {
    console.error("Failed to initialize canvas");
    return;
  }

  // Get singleton instances
  const settings = GlobalSettings.instance;
  const container = Container.getInstance();

  // Create node counter (shared state)
  const nodeCounter = { value: 0 };

  // Create and register services and facades
  const canvasFacade = new CanvasFacade(canvas, ctx, settings);
  const uiFacade = new UIFacade();
  const movieFacade = new MovieFacade(canvas);

  container.register("canvas", canvasFacade);
  container.register("ui", uiFacade);
  container.register("movie", movieFacade);
  container.register("settings", settings);
  container.register("graph", graph);
  container.register("selection", selection);
  container.register("Node", Node);
  container.register("nodeCounter", nodeCounter);

  // Register drawable classes (for Application.render)
  container.register("Circle", Circle);
  container.register("Rectangle", Rectangle);
  container.register("PartialLine", PartialLine);

  // Register simulation functions
  container.register("simulations", {
    doForceBalanceStep,
    doPositionEquilibrationStep
  });

  // Register action classes (for UIController)
  container.register("ClearSelectionAction", ClearSelectionAction);
  container.register("SelectAllNodesAction", SelectAllNodesAction);
  container.register("InvertSelectionAction", InvertSelectionAction);
  container.register("DeleteNodesAction", DeleteNodesAction);
  container.register("AddNodeAction", AddNodeAction);
  container.register("AddEdgeAction", AddEdgeAction);

  // Create Application instance
  const app = new Application(container);
  container.register("app", app);

  // Create ActionManager with render callback
  const actionManager = new ActionManager(() => app.render());
  container.register("actionManager", actionManager);

  // Create InteractionModeFactory
  const modeFactory = new InteractionModeFactory(
    nodeCounter,
    graph,
    selection,
    doRandomWalk,
    container
  );
  container.register("modeFactory", modeFactory);

  // Set default mode
  modeFactory.setCurrentMode("vertex");

  // Create controllers
  const canvasController = new CanvasController(container);
  const uiController = new UIController(container);
  const keyboardController = new KeyboardController(container);

  // Initialize application
  app.initialize();

  // Attach event listeners
  canvasController.attachEventListeners();
  uiController.attachEventListeners();
  keyboardController.attachEventListeners();

  // Set up initial UI state
  canvasParent.style.width = settings.canvasSize.x + "px";
  canvasParent.style.height = settings.canvasSize.y + "px";
  uiFacade.setValue("canvasWidth", settings.canvasSize.x);
  uiFacade.setValue("canvasHeight", settings.canvasSize.y);

  // Initial clear and render
  graph.clear();
  selection.clearSelection();
  app.render();

  console.log("Application initialized successfully");
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}

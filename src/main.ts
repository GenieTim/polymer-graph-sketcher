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

// Service imports
import { GraphOperationsService, FileService } from "./services";

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
import { StorageService } from "./services/StorageService";
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
  const movieFacade = new MovieFacade(canvas, container);
  const graphOperations = new GraphOperationsService(container);
  const fileService = new FileService(container);

  container.register("canvas", canvasFacade);
  container.register("ui", uiFacade);
  container.register("movie", movieFacade);
  container.register("graphOperations", graphOperations);
  container.register("fileService", fileService);
  container.register("settings", settings);
  container.register("graph", graph);
  container.register("selection", selection);
  container.register("Node", Node);
  container.register("nodeCounter", nodeCounter);
  container.register("StorageService", StorageService);

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

  // Load saved state from localStorage
  const stateLoaded = StorageService.loadState(graph, settings);
  
  if (stateLoaded) {
    // Update canvas and UI to match loaded settings
    canvasFacade.resize(settings.canvasSize.x, settings.canvasSize.y);
    uiFacade.updateCanvasSizeUI(settings.canvasSize.x, settings.canvasSize.y);
    
    // Update node counter based on loaded graph
    if (graph.getNrOfNodes() > 0) {
      const nodeIds = graph.getAllNodeIds();
      nodeCounter.value = Math.max(...nodeIds) + 1;
    }
    
    console.log("Loaded previous state from localStorage");
  } else {
    // Set up initial UI state for new session
    uiFacade.updateCanvasSizeUI(settings.canvasSize.x, settings.canvasSize.y);

    // Initial clear and render
    graph.clear();
    selection.clearSelection();
  }
  
  app.render();

  // Save state to localStorage when page is about to unload
  window.addEventListener("beforeunload", () => {
    StorageService.saveState(graph, settings);
  });
  
  // Also save state periodically (every 30 seconds) as a backup
  setInterval(() => {
    StorageService.saveState(graph, settings);
  }, 30000);

  console.log("Application initialized successfully");
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}

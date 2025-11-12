import { Container } from "../core/Container";
import {
  NodePropertyUpdateAction,
  SelectNodesAction,
  Action,
  ActionManager,
} from "../actions";
import {
  ClearSelectionAction,
  InvertSelectionAction,
  SelectAllNodesAction,
} from "../actions";
import { Edge, Graph, Node } from "../models";
import { Colour } from "../utils/Colour";
import { SelectionService, GraphOperationsService, FileService } from "../services";
import { Application } from "../core/Application";
import { GlobalSettings } from "../utils";
import { CanvasFacade } from "../facades/CanvasFacade";
import type { UIFacade } from "../facades/UIFacade";
import type { MovieFacade } from "../facades/MovieFacade";
import type { InteractionModeFactory } from "../interaction-modes/ModeFactory";

/**
 * Controller for UI-related events
 * Handles button clicks, input changes, etc.
 */
export class UIController {
  private container: Container;

  constructor(container: Container) {
    this.container = container;
  }

  /**
   * Helper to attach event listener to element by ID
   */
  private attachListener<K extends keyof HTMLElementEventMap>(
    elementId: string,
    event: K,
    handler: (element: HTMLElement, event: HTMLElementEventMap[K]) => void
  ): void {
    const element = document.getElementById(elementId);
    if (element) {
      element.addEventListener(event, (e) =>
        handler(element, e as HTMLElementEventMap[K])
      );
    }
  }

  /**
   * Helper to attach click listener to button by ID
   */
  private attachButtonClick(buttonId: string, handler: () => void): void {
    this.attachListener(buttonId, "click", handler);
  }

  /**
   * Helper to attach change listener to input by ID
   */
  private attachInputChange(
    inputId: string,
    handler: (element: HTMLInputElement) => void
  ): void {
    this.attachListener(inputId, "change", (element) =>
      handler(element as HTMLInputElement)
    );
  }

  /**
   * Attach event listeners to UI elements
   */
  attachEventListeners(): void {
    this.attachModeSwitch();
    this.attachNodePropertyListeners();
    this.attachEdgePropertyListeners();
    this.attachCanvasPropertyListeners();
    this.attachButtonListeners();
    this.attachRedrawListeners();
  }

  /**
   * Attach mode switch listener
   */
  private attachModeSwitch(): void {
    const modeSwitch = document.getElementById(
      "modeSwitch"
    ) as HTMLSelectElement;
    if (!modeSwitch) return;

    modeSwitch.addEventListener("click", () => {
      const modeFactory =
        this.container.get<InteractionModeFactory>("modeFactory");
      modeFactory.setCurrentMode(modeSwitch.value);
    });
  }

  /**
   * Attach node property change listeners
   */
  private attachNodePropertyListeners(): void {
    const actionManager = this.container.get<ActionManager>("actionManager");
    const selection = this.container.get<SelectionService>("selection");

    // Helper to create node property update handler
    const createPropertyHandler = (
      propertyName: keyof Node,
      parseValue: (value: string) => any
    ) => {
      return (element: HTMLInputElement) => {
        if (selection.empty) return;
        const targetValue = parseValue(element.value);
        actionManager.addAction(
          new NodePropertyUpdateAction(
            selection.getItemsOfClass(Node),
            targetValue,
            propertyName
          )
        );
      };
    };

    // Attach property listeners using helper
    this.attachInputChange(
      "vertexRadius",
      createPropertyHandler("radius", parseFloat)
    );
    this.attachInputChange(
      "vertexStrokeWidth",
      createPropertyHandler("strokeWidth", parseFloat)
    );
    this.attachInputChange(
      "nodeFillColor",
      createPropertyHandler("fillColor", (v) => v)
    );
    this.attachInputChange(
      "nodeColor",
      createPropertyHandler("strokeColor", (v) => v)
    );

    // Select vertices by stroke color
    this.attachInputChange("selectVerticesStroke", (element) => {
      const graph = this.container.get<Graph>("graph");
      actionManager.addAction(
        new SelectNodesAction(
          graph.getAllNodes().filter((node: Node) => {
            return (
              Colour.deltaE00(
                Colour.hex2lab(node.strokeColor),
                Colour.hex2lab(element.value)
              ) < 10
            );
          }),
          true
        )
      );
    });
  }

  /**
   * Attach edge property change listeners
   */
  private attachEdgePropertyListeners(): void {
    const graph = this.container.get<Graph>("graph");
    const selection = this.container.get<SelectionService>("selection");
    const app = this.container.get<Application>("app");

    // Helper to update edge properties
    const updateEdgeProperty = (
      propertyName: keyof Edge,
      getValue: (value: string) => any
    ) => {
      return (element: HTMLInputElement) => {
        const selectedNodeIds = selection
          .getItemsOfClass(Node)
          .map((node: Node) => node.id);
        graph
          .getEdgesWithBothEndsInNodes(selectedNodeIds)
          .forEach((edge: Edge) => {
            // cast to any for dynamic assignment while keeping propertyName strongly typed
            (edge as any)[propertyName] = getValue(element.value);
          });
        app.render();
      };
    };

    this.attachInputChange(
      "edgeColor",
      updateEdgeProperty("color", (v) => v)
    );
    this.attachInputChange(
      "lineWidth",
      updateEdgeProperty("weight", parseFloat)
    );
  }

  /**
   * Attach canvas property change listeners
   */
  private attachCanvasPropertyListeners(): void {
    const actionManager = this.container.get<ActionManager>("actionManager");
    const settings = this.container.get<GlobalSettings>("settings");
    const canvasFacade = this.container.get<CanvasFacade>("canvas");
    const app = this.container.get<Application>("app");
    const graph = this.container.get<Graph>("graph");
    const container = this.container;

    // Helper to create canvas dimension change action
    const createDimensionChangeAction = (
      dimension: "x" | "y",
      value: number
    ): Action => {
      const styleProperty = dimension === "x" ? "width" : "height";
      const previousValue = settings.canvasSize[dimension];

      const setDimension = (newValue: number): void => {
        const canvasParent = document.getElementById(
          "canvas-parent"
        ) as HTMLElement;
        canvasParent.style[styleProperty] = newValue + "px";
        settings.canvasSize[dimension] = newValue;
        const uiFacade = container.get<any>("ui");
        const resizeElements = uiFacade.getInputChecked("resizeElements");
        const scalingFactors = canvasFacade.resizeWithGraphScaling(
          settings.canvasSize.x,
          settings.canvasSize.y,
          resizeElements,
          graph
        );
        app.render({ x: scalingFactors.xScaling, y: scalingFactors.yScaling });
        document.getElementById(
          "canvas-size"
        )!.textContent = `Canvas size: ${settings.canvasSize.x}x${settings.canvasSize.y}`;
      };

      return {
        do: () => setDimension(value),
        undo: () => setDimension(previousValue),
      };
    };

    // Canvas width
    this.attachInputChange("canvasWidth", (element) => {
      const val = parseFloat(element.value);
      actionManager.addAction(createDimensionChangeAction("x", val));
    });

    // Canvas height
    this.attachInputChange("canvasHeight", (element) => {
      const val = parseFloat(element.value);
      actionManager.addAction(createDimensionChangeAction("y", val));
    });

    // Disable PBC
    this.attachInputChange("disablePBC", (element) => {
      settings.disablePBC = (element as HTMLInputElement).checked;
      app.render();
    });
  }

  /**
   * Attach button click listeners
   */
  private attachButtonListeners(): void {
    const actionManager = this.container.get<ActionManager>("actionManager");
    const graphOps = this.container.get<GraphOperationsService>("graphOperations");
    const fileService = this.container.get<FileService>("fileService");

    // Selection action buttons - simplified pattern
    this.attachButtonClick("clearSelectionButton", () => {
      actionManager.addAction(new ClearSelectionAction());
    });

    this.attachButtonClick("selectAllButton", () => {
      actionManager.addAction(new SelectAllNodesAction());
    });

    this.attachButtonClick("invertSelectionButton", () => {
      actionManager.addAction(new InvertSelectionAction());
    });

    // Clear canvas button
    this.attachButtonClick("clearCanvasButton", () => {
      graphOps.clearGraph();
    });

    // Clear saved state button
    this.attachButtonClick("clearSavedStateButton", () => {
      if (confirm("Are you sure you want to clear the saved state? This action cannot be undone.")) {
        const StorageService = this.container.get<any>("StorageService");
        if (StorageService) {
          StorageService.clearState();
          alert("Saved state has been cleared. The current canvas will be saved when you leave or reload the page.");
        }
      }
    });

    // File operations
    this.attachButtonClick("exportGraphButton", () => fileService.exportGraph());
    this.attachButtonClick("saveImageButton", () => this.saveCanvasAsImage());
    this.attachButtonClick("saveSvgButton", () => fileService.saveGraphAsSvg());
    this.attachInputChange("import", () => this.importGraph());

    // Movie recording buttons
    this.attachButtonClick("startRecordingEdgesBtn", () =>
      this.startEdgeRecording()
    );
    this.attachButtonClick("stopRecordingEdgesBtn", () =>
      this.stopEdgeRecording()
    );
    this.attachButtonClick("createEdgeMovieBtn", () =>
      this.createEdgeAdditionMovie()
    );
    this.attachButtonClick("createSimMovieBtn", () =>
      this.createSimulationMovie()
    );

    // Graph manipulation buttons
    this.attachButtonClick("removeDuplicateEdges", () => {
      graphOps.removeDuplicateEdges();
    });

    this.attachButtonClick("removeSelfEdges", () => {
      graphOps.removeSelfEdges();
    });

    // Simulation buttons
    const graph = this.container.get<Graph>("graph");
    const app = this.container.get<Application>("app");

    this.attachButtonClick("forceBalanceStep", () => {
      const simulations = this.container.get<any>("simulations");
      const uiFacade = this.container.get<UIFacade>("ui");
      const nSteps = uiFacade.getInputValueAsNumber("nForceBalanceSteps") || 1;

      for (let i = 0; i < nSteps; i++) {
        simulations.doForceBalanceStep(graph);
      }
      app.render();
    });

    this.attachButtonClick("positionEquilibrationStep", () => {
      const simulations = this.container.get<any>("simulations");
      const uiFacade = this.container.get<UIFacade>("ui");
      const nSteps =
        uiFacade.getInputValueAsNumber("nPositionEquilibrationSteps") || 1;

      for (let i = 0; i < nSteps; i++) {
        simulations.doPositionEquilibrationStep(graph);
      }
      app.render();
    });

    // Topology buttons
    this.attachButtonClick("sideChainGenerationButton", () =>
      this.generateSideChains()
    );
    this.attachButtonClick("bifunctionalRemoval", () =>
      graphOps.removeBifunctionalNodes()
    );
    this.attachInputChange("mergeConnectionColor", (element) =>
      graphOps.mergeEdgesByColor(element.value)
    );
  }

  /**
   * Attach listeners for elements that trigger redraws
   */
  private attachRedrawListeners(): void {
    const app = this.container.get<Application>("app");
    const redrawElements = document.getElementsByClassName("redraw-onchange");

    Array.from(redrawElements).forEach((element) => {
      if (element instanceof HTMLInputElement) {
        element.addEventListener("change", () => {
          app.render();
        });
      }
    });
  }



  /**
   * Import a graph from a JSON file
   */
  private importGraph(): void {
    const fileInput = document.getElementById("import") as HTMLInputElement;
    const file = fileInput.files?.[0];
    
    if (!file) return;

    const fileService = this.container.get<FileService>("fileService");
    fileService.importGraph(file);
  }

  /**
   * Save the canvas as a PNG image (high-res with scaling)
   */
  private saveCanvasAsImage(): void {
    const fileService = this.container.get<FileService>("fileService");
    const canvasFacade = this.container.get<CanvasFacade>("canvas");
    const settings = this.container.get<GlobalSettings>("settings");
    const app = this.container.get<Application>("app");
    const graph = this.container.get<Graph>("graph");

    // Use canvas scaling helper
    canvasFacade.withScaledCanvas(
      () => fileService.saveCanvasAsImage(),
      settings.imageScaleFactor,
      app,
      graph,
      settings
    );
  }

  /**
   * Generate side chains on selected nodes
   */
  private generateSideChains(): void {
    const selection = this.container.get<SelectionService>("selection");
    const graph = this.container.get<Graph>("graph");
    const actionManager = this.container.get<ActionManager>("actionManager");
    const nodeCounter = this.container.get<{ value: number }>("nodeCounter");
    const uiFacade = this.container.get<UIFacade>("ui");

    const sideChainLength =
      uiFacade.getInputValueAsNumber("sideChainLength") || 37.5;
    const sideChainProbability =
      uiFacade.getInputValueAsNumber("sideChainProb") || 2;
    const sideChainLengthRandomness =
      uiFacade.getInputValueAsNumber("sideChainLengthRandomness") || 0;
    const sideChainAngleRandomness =
      uiFacade.getInputValueAsNumber("sideChainAngleRandomness") || 0;

    const selectedNodes = selection.getItemsOfClass(Node);

    selectedNodes.forEach((node: Node) => {
      const edges = graph.getEdgesInvolvingNode(node.id);
      if (edges.length !== 2) {
        return;
      }

      const connectedNode1 = graph.getNode(edges[0].getOtherNodeId(node.id));
      const connectedNode2 = graph.getNode(edges[1].getOtherNodeId(node.id));

      if (!connectedNode1 || !connectedNode2) {
        return;
      }

      // Calculate the direction vector of the main chain
      const dirX = connectedNode2.coordinates.x - connectedNode1.coordinates.x;
      const dirY = connectedNode2.coordinates.y - connectedNode1.coordinates.y;
      const length = Math.sqrt(dirX * dirX + dirY * dirY);
      const normalizedDirX = dirX / length;
      const normalizedDirY = dirY / length;

      // Calculate perpendicular vectors
      const perpDirX1 = -normalizedDirY;
      const perpDirY1 = normalizedDirX;
      const perpDirX2 = normalizedDirY;
      const perpDirY2 = -normalizedDirX;

      // Determine number of side chains
      const numSideChains = Math.floor(sideChainProbability);
      const remainingProb = sideChainProbability - numSideChains;
      const totalChains =
        numSideChains + (Math.random() < remainingProb ? 1 : 0);

      let firstDirection = Math.random() < 0.5;

      const AddNodeAction = this.container.get<any>("AddNodeAction");
      const AddEdgeAction = this.container.get<any>("AddEdgeAction");

      for (let i = 0; i < totalChains; i++) {
        firstDirection = !firstDirection;
        const perpDirX = firstDirection ? perpDirX1 : perpDirX2;
        const perpDirY = firstDirection ? perpDirY1 : perpDirY2;

        // Add random angle variation
        const angleVariation = Math.PI * sideChainAngleRandomness;
        const randomAngle = (Math.random() * 2 - 1) * angleVariation;
        const cosAngle = Math.cos(randomAngle);
        const sinAngle = Math.sin(randomAngle);
        const finalDirX = perpDirX * cosAngle - perpDirY * sinAngle;
        const finalDirY = perpDirX * sinAngle + perpDirY * cosAngle;

        // Calculate position of new node
        const newNodeX =
          node.coordinates.x +
          finalDirX *
            sideChainLength *
            (1 - sideChainLengthRandomness * Math.random());
        const newNodeY =
          node.coordinates.y +
          finalDirY *
            sideChainLength *
            (1 - sideChainLengthRandomness * Math.random());

        const newNodeId = nodeCounter.value++;
        const newNode = new Node(
          newNodeId,
          { x: newNodeX, y: newNodeY },
          node.radius,
          node.strokeWidth,
          node.fillColor,
          node.strokeColor
        );

        actionManager.addAction(
          new AddNodeAction(newNodeId, { x: newNodeX, y: newNodeY }, uiFacade)
        );
        actionManager.addAction(new AddEdgeAction(node, [newNode], uiFacade));
      }
    });
  }



  /**
   * Start recording edge additions
   */
  private startEdgeRecording(): void {
    const movieFacade = this.container.get<MovieFacade>("movie");
    const modeFactory =
      this.container.get<InteractionModeFactory>("modeFactory");
    const uiFacade = this.container.get<UIFacade>("ui");

    // Initialize movie maker if needed
    if (!movieFacade.getMovieMaker()) {
      movieFacade.initialize();
    }

    movieFacade.startRecordingEdges();

    // Update UI
    const startBtn = document.getElementById(
      "startRecordingEdgesBtn"
    ) as HTMLButtonElement;
    const stopBtn = document.getElementById(
      "stopRecordingEdgesBtn"
    ) as HTMLButtonElement;
    const indicator = document.getElementById("recordingIndicator");

    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
    if (indicator) {
      indicator.textContent = "Recording... (0 edges)";
      indicator.style.color = "red";
    }

    // Set up recording callback in edge mode
    const graph = this.container.get<Graph>("graph");
    const edgeMode = modeFactory.getMode("edge");
    if (edgeMode && (edgeMode as any).setRecordingCallback) {
      (edgeMode as any).setRecordingCallback((fromNode: Node, toNode: Node) => {
        const edges = graph.getEdgesInvolvingNodes([fromNode.id, toNode.id]);
        const existingEdge = edges.find(
          (edge: Edge) =>
            (edge.fromId === fromNode.id && edge.toId === toNode.id) ||
            (edge.fromId === toNode.id && edge.toId === fromNode.id)
        );

        if (existingEdge) {
          movieFacade.recordEdgeAction(
            "add",
            fromNode,
            toNode,
            existingEdge.color,
            existingEdge.weight
          );

          // Update indicator
          if (indicator) {
            const count = movieFacade.getRecordedEdges().length;
            indicator.textContent = `Recording... (${count} edges)`;
          }
        }
      });
    }

    uiFacade.updateMovieStatus("Recording edge additions...");
  }

  /**
   * Stop recording edge additions
   */
  private stopEdgeRecording(): void {
    const movieFacade = this.container.get<MovieFacade>("movie");
    const modeFactory =
      this.container.get<InteractionModeFactory>("modeFactory");
    const uiFacade = this.container.get<UIFacade>("ui");

    const count = movieFacade.stopRecordingEdges();

    // Update UI
    const startBtn = document.getElementById(
      "startRecordingEdgesBtn"
    ) as HTMLButtonElement;
    const stopBtn = document.getElementById(
      "stopRecordingEdgesBtn"
    ) as HTMLButtonElement;
    const indicator = document.getElementById("recordingIndicator");

    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
    if (indicator) {
      indicator.textContent =
        count > 0 ? `Ready (${count} edges recorded)` : "Not recording";
      indicator.style.color = count > 0 ? "green" : "black";
    }

    // Clear recording callback from edge mode
    const edgeMode = modeFactory.getMode("edge");
    if (edgeMode && (edgeMode as any).setRecordingCallback) {
      (edgeMode as any).setRecordingCallback(undefined);
    }

    uiFacade.updateMovieStatus(`Recording stopped. ${count} edges recorded.`);
  }

  /**
   * Create and download movie of recorded edge additions
   */
  private async createEdgeAdditionMovie(): Promise<void> {
    const movieFacade = this.container.get<MovieFacade>("movie");
    const canvasFacade = this.container.get<CanvasFacade>("canvas");
    const settings = this.container.get<GlobalSettings>("settings");
    const app = this.container.get<Application>("app");
    const graph = this.container.get<Graph>("graph");
    const uiFacade = this.container.get<UIFacade>("ui");

    const recordedEdges = movieFacade.getRecordedEdges();
    if (recordedEdges.length === 0) {
      alert("No edges recorded! Use 'Start Recording Edges' first.");
      return;
    }

    // Initialize movie maker if needed
    if (!movieFacade.getMovieMaker()) {
      movieFacade.initialize();
    }

    const edgeDuration =
      uiFacade.getInputValueAsNumber("edgeAnimationDuration") || 1000;
    const interpolationSteps = 30;

    await canvasFacade.withScaledCanvas(async () => {
      // Reinitialize movie maker with scaled canvas
      movieFacade.initialize();

      try {
        await movieFacade.createEdgeAdditionMovie(edgeDuration, interpolationSteps);
      } catch (error) {
        alert(error);
      }
    }, settings.imageScaleFactor, app, graph, settings);
  }

  /**
   * Create and download movie of simulation steps
   */
  private async createSimulationMovie(): Promise<void> {
    const movieFacade = this.container.get<MovieFacade>("movie");
    const canvasFacade = this.container.get<CanvasFacade>("canvas");
    const settings = this.container.get<GlobalSettings>("settings");
    const app = this.container.get<Application>("app");
    const graph = this.container.get<Graph>("graph");
    const uiFacade = this.container.get<UIFacade>("ui");

    // Initialize movie maker if needed
    if (!movieFacade.getMovieMaker()) {
      movieFacade.initialize();
    }

    const simulationType =
      uiFacade.getInputValue("simulationType") || "force_balance";
    const stepCount =
      uiFacade.getInputValueAsNumber("simulationStepCount") || 10;
    const stepDuration =
      uiFacade.getInputValueAsNumber("simulationStepDuration") || 300;
    const adaptiveStepDuration = uiFacade.getInputChecked(
      "adaptiveStepDuration"
    );

    await canvasFacade.withScaledCanvas(async () => {
      // Reinitialize movie maker with scaled canvas
      movieFacade.initialize();

      try {
        await movieFacade.createSimulationMovie(
          simulationType,
          stepCount,
          stepDuration,
          adaptiveStepDuration
        );
      } catch (error) {
        alert(error);
      }
    }, settings.imageScaleFactor, app, graph, settings);
  }
}

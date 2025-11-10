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
import { SVGCanvasRenderingContext2D } from "../rendering/SVGCanvasRenderingContext2D";
import { collapseEdgesByColor, removeTwofunctionalNodes } from "../topology";
import { SelectionService } from "../services";
import { Application } from "../core/Application";
import { GlobalSettings } from "../utils";
import { CanvasFacade } from "../facades/CanvasFacade";
import type { UIFacade } from "../facades/UIFacade";
import type { MovieFacade } from "../facades/MovieFacade";
import type { InteractionModeFactory } from "../interaction-modes/ModeFactory";
import type { PartialLine } from "../rendering/PartialLine";

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
      const graph = this.container.get<Graph>("graph");
      const selection = this.container.get<SelectionService>("selection");
      const modeFactory =
        this.container.get<InteractionModeFactory>("modeFactory");
      const app = this.container.get<Application>("app");

      graph.clear();
      selection.clearSelection();
      modeFactory.setCurrentMode("vertex");
      app.render();
    });

    // File operations
    this.attachButtonClick("exportGraphButton", () => this.exportGraph());
    this.attachButtonClick("saveImageButton", () => this.saveCanvasAsImage());
    this.attachButtonClick("saveSvgButton", () => this.saveGraphAsSvg());
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
    const graph = this.container.get<Graph>("graph");
    const app = this.container.get<Application>("app");

    this.attachButtonClick("removeDuplicateEdges", () => {
      graph.removeDuplicateEdges();
      app.render();
    });

    this.attachButtonClick("removeSelfEdges", () => {
      graph.cleanupEdges();
      app.render();
    });

    // Simulation buttons
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
      this.removeBifunctionalNodes()
    );
    this.attachInputChange("mergeConnectionColor", (element) =>
      this.mergeEdgesByColor(element.value)
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
   * Helper to scale canvas up/down for high-res rendering
   */
  private withScaledCanvas<T>(callback: () => T | Promise<T>): T | Promise<T> {
    const app = this.container.get<Application>("app");
    const settings = this.container.get<GlobalSettings>("settings");
    const canvasFacade = this.container.get<CanvasFacade>("canvas");
    const graph = this.container.get<Graph>("graph");

    // Store original state
    const originalShowSelection = app.showSelection.value;
    const originalIsScaled = settings.isScaled;
    const originalCanvasSize = {
      x: settings.canvasSize.x,
      y: settings.canvasSize.y,
    };

    // Scale up for high-resolution
    app.showSelection.value = false;
    settings.isScaled = true;
    settings.canvasSize.x *= settings.imageScaleFactor;
    settings.canvasSize.y *= settings.imageScaleFactor;

    canvasFacade.resizeWithGraphScaling(
      settings.canvasSize.x,
      settings.canvasSize.y,
      true,
      graph
    );

    const restore = () => {
      app.showSelection.value = originalShowSelection;
      settings.isScaled = originalIsScaled;
      settings.canvasSize.x = originalCanvasSize.x;
      settings.canvasSize.y = originalCanvasSize.y;

      canvasFacade.resizeWithGraphScaling(
        settings.canvasSize.x,
        settings.canvasSize.y,
        true,
        graph
      );

      app.render();
    };

    try {
      const result = callback();
      // Handle both sync and async callbacks
      if (result instanceof Promise) {
        return result.finally(restore) as T;
      } else {
        restore();
        return result;
      }
    } catch (error) {
      restore();
      throw error;
    }
  }

  /**
   * Export the graph to a JSON file
   */
  private exportGraph(): void {
    const graph = this.container.get<Graph>("graph");
    const settings = this.container.get<GlobalSettings>("settings");

    const blob = new Blob(
      [JSON.stringify({ graph: graph, settings: settings })],
      {
        type: "application/json",
      }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "graph.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Import a graph from a JSON file
   */
  private importGraph(): void {
    const fileInput = document.getElementById("import") as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (!file) return;

    const graph = this.container.get<Graph>("graph");
    const settings = this.container.get<GlobalSettings>("settings");
    const uiFacade = this.container.get<UIFacade>("ui");
    const canvasFacade = this.container.get<CanvasFacade>("canvas");
    const app = this.container.get<Application>("app");

    const reader = new FileReader();

    reader.onload = (event: ProgressEvent<FileReader>) => {
      if (event.target?.result) {
        const jsonGraph = JSON.parse(event.target.result as string);

        if ("settings" in jsonGraph) {
          // Import settings
          const importedSettings = jsonGraph.settings;
          settings.canvasSize.x = importedSettings.canvasSize.x;
          settings.canvasSize.y = importedSettings.canvasSize.y;
          settings.backgroundColor = importedSettings.backgroundColor;
          settings.imageScaleFactor = importedSettings.imageScaleFactor;
          if ("disablePBC" in importedSettings) {
            settings.disablePBC = importedSettings.disablePBC;
          }

          // Update canvas
          const canvasParent = document.getElementById(
            "canvas-parent"
          ) as HTMLElement;
          canvasParent.style.width = settings.canvasSize.x + "px";
          canvasParent.style.height = settings.canvasSize.y + "px";
          uiFacade.setValue("canvasWidth", settings.canvasSize.x);
          uiFacade.setValue("canvasHeight", settings.canvasSize.y);
          canvasFacade.resize(settings.canvasSize.x, settings.canvasSize.y);

          // Import graph
          graph.fromJSON(jsonGraph.graph);
        } else {
          // Legacy format - just graph data
          graph.fromJSON(jsonGraph);
        }

        // Update node counter
        const nodeCounter = this.container.get<{ value: number }>(
          "nodeCounter"
        );
        if (nodeCounter) {
          const nodeIds = graph
            .getAllNodeIds()
            .filter((id: number) => !isNaN(id));
          nodeCounter.value = nodeIds.length > 0 ? Math.max(...nodeIds) + 1 : 0;
        }

        // Re-render
        app.render();
      }
    };

    reader.readAsText(file);
  }

  /**
   * Save the canvas as a PNG image
   */
  private saveCanvasAsImage(): void {
    this.withScaledCanvas(() => {
      const app = this.container.get<Application>("app");
      const canvasFacade = this.container.get<CanvasFacade>("canvas");

      app.render();

      const image = canvasFacade.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = "polymer-graph-sketch.png";
      link.click();
    });
  }

  /**
   * Save the graph as an SVG file
   */
  private saveGraphAsSvg(): void {
    const settings = this.container.get<GlobalSettings>("settings");
    const app = this.container.get<Application>("app");

    // Create SVG context
    const svgCtx = new SVGCanvasRenderingContext2D(
      settings.canvasSize.x,
      settings.canvasSize.y
    );

    // Draw to SVG context
    app.elementsToDraw.value.forEach((element: any) => {
      element.draw(svgCtx);
    });

    // Get SVG and download
    const svg: SVGSVGElement = svgCtx.getSVG();
    const svgData = new XMLSerializer().serializeToString(svg);
    const a = document.createElement("a");
    a.href = "data:image/svg+xml;base64," + btoa(svgData);
    a.download = "graph.svg";
    a.click();
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
   * Remove bifunctional (2-connected) nodes
   */
  private removeBifunctionalNodes(): void {
    const app = this.container.get<Application>("app");

    removeTwofunctionalNodes();
    app.render();
  }

  /**
   * Merge/collapse edges by color
   */
  private mergeEdgesByColor(color: string): void {
    const app = this.container.get<Application>("app");

    collapseEdgesByColor(color);
    app.render();
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
    const graph = this.container.get<Graph>("graph");
    const app = this.container.get<Application>("app");
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

    await this.withScaledCanvas(async () => {
      // Reinitialize movie maker with scaled canvas
      movieFacade.initialize();

      // Calculate initial state by tracking net changes
      const edgeNetChanges = new Map<string, any>();
      recordedEdges.forEach(
        ({ type, fromNode, toNode, color, weight }: any) => {
          const key =
            fromNode.id < toNode.id
              ? `${fromNode.id}-${toNode.id}`
              : `${toNode.id}-${fromNode.id}`;

          edgeNetChanges.set(key, {
            lastAction: type,
            fromNode,
            toNode,
            color,
            weight,
          });
        }
      );

      // Restore to initial state
      const animationPartialEdges: any[] = [];
      edgeNetChanges.forEach((netChange) => {
        const edges = graph.getEdgesInvolvingNodes([
          netChange.fromNode.id,
          netChange.toNode.id,
        ]);
        const matchingEdge = edges.find(
          (edge: any) =>
            (edge.fromId === netChange.fromNode.id &&
              edge.toId === netChange.toNode.id) ||
            (edge.fromId === netChange.toNode.id &&
              edge.toId === netChange.fromNode.id)
        );

        if (netChange.lastAction === "add") {
          if (matchingEdge) {
            graph.deleteEdge(matchingEdge);
          }
        } else {
          if (!matchingEdge) {
            graph.addEdge(
              netChange.fromNode.id,
              netChange.toNode.id,
              netChange.color,
              netChange.weight
            );
          }
        }
      });

      app.render();

      // Create animation frames
      const frames: any[] = [];
      recordedEdges.forEach(
        ({ type, fromNode, toNode, color, weight }: any, edgeIndex: number) => {
          const stepDuration = edgeDuration / interpolationSteps;

          const PartialLineClass =
            this.container.get<typeof PartialLine>("PartialLine");
          const partialLine = new PartialLineClass(
            { x: fromNode.coordinates.x, y: fromNode.coordinates.y },
            { x: toNode.coordinates.x, y: toNode.coordinates.y },
            type === "add" ? 0 : 1,
            true,
            color,
            weight,
            graph.zigzagSpacing,
            graph.zigzagLength,
            graph.zigzagEndLengths
          );

          for (let i = 0; i <= interpolationSteps; i++) {
            const progress = i / interpolationSteps;

            frames.push({
              action: () => {
                if (type === "add") {
                  if (i === 0) {
                    animationPartialEdges[edgeIndex] = partialLine;
                  } else if (i < interpolationSteps) {
                    partialLine.setProgress(progress);
                  } else {
                    animationPartialEdges[edgeIndex] = null;
                    graph.addEdge(fromNode.id, toNode.id, color, weight);
                  }
                } else {
                  if (i === 0) {
                    const edges = graph.getEdgesInvolvingNodes([
                      fromNode.id,
                      toNode.id,
                    ]);
                    const edgeToRemove = edges.find(
                      (edge: any) =>
                        (edge.fromId === fromNode.id &&
                          edge.toId === toNode.id) ||
                        (edge.fromId === toNode.id && edge.toId === fromNode.id)
                    );
                    if (edgeToRemove) {
                      graph.deleteEdge(edgeToRemove);
                    }
                    animationPartialEdges[edgeIndex] = partialLine;
                  } else if (i < interpolationSteps) {
                    partialLine.setProgress(1 - progress);
                  } else {
                    animationPartialEdges[edgeIndex] = null;
                  }
                }

                // Update elements to draw with partial edges
                const elements = [...graph.toDrawables()];
                animationPartialEdges.forEach((partial: any) => {
                  if (partial) elements.push(partial);
                });
                app.elementsToDraw.value = elements;
                app.render();
              },
              duration: stepDuration,
            });
          }
        }
      );

      const sequence = {
        name: "Edge Animation",
        frames,
        defaultFrameDuration: edgeDuration / interpolationSteps,
        onComplete: () => {
          animationPartialEdges.length = 0;
        },
      };

      const addCount = recordedEdges.filter(
        (e: any) => e.type === "add"
      ).length;
      const removeCount = recordedEdges.filter(
        (e: any) => e.type === "remove"
      ).length;
      uiFacade.updateMovieStatus(
        `Recording edge animation (${addCount} additions, ${removeCount} removals)...`
      );

      try {
        const movieMaker = movieFacade.getMovieMaker();
        if (!movieMaker) {
          throw new Error("Movie maker not initialized");
        }
        await movieMaker.recordMovie([sequence], "edge-animation.webm");
        uiFacade.updateMovieStatus("Movie saved successfully!");
        setTimeout(() => uiFacade.updateMovieStatus(""), 3000);
      } catch (error) {
        console.error("Error creating movie:", error);
        alert("Error creating movie: " + error);
        uiFacade.updateMovieStatus("Error creating movie");
      }
    });
  }

  /**
   * Create and download movie of simulation steps
   */
  private async createSimulationMovie(): Promise<void> {
    const movieFacade = this.container.get<MovieFacade>("movie");
    const graph = this.container.get<Graph>("graph");
    const app = this.container.get<Application>("app");
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

    // Get simulation function
    const simulations = this.container.get<any>("simulations");
    let simulationStep: () => void;
    let simulationName: string;

    if (simulationType === "force_balance") {
      simulationStep = () => simulations.doForceBalanceStep(graph);
      simulationName = "Force Balance";
    } else if (simulationType === "position_equilibration") {
      simulationStep = () => simulations.doPositionEquilibrationStep(graph);
      simulationName = "Position Equilibration";
    } else {
      alert("Invalid simulation type");
      return;
    }

    // Save node positions to restore later
    const savedPositions = new Map<number, { x: number; y: number }>();
    graph.getAllNodes().forEach((node: Node) => {
      savedPositions.set(node.id, {
        x: node.coordinates.x,
        y: node.coordinates.y,
      });
    });

    try {
      //
      let stepDurations = Array(stepCount).fill(stepDuration);

      if (adaptiveStepDuration) {
        // do all steps once to measure distances, and compute adaptive durations
        const initialPositions = new Map<number, { x: number; y: number }>();
        graph.getAllNodes().forEach((node: Node) => {
          initialPositions.set(node.id, {
            x: node.coordinates.x,
            y: node.coordinates.y,
          });
        });

        let previousPositions = initialPositions;

        const meanDistances: number[] = [];
        for (let i = 0; i < stepCount; i++) {
          simulationStep();

          // Calculate mean node displacement
          let totalDistance = 0;
          graph.getAllNodes().forEach((node: Node) => {
            const prevPos = previousPositions.get(node.id);
            if (prevPos) {
              const dx = node.coordinates.x - prevPos.x;
              const dy = node.coordinates.y - prevPos.y;
              totalDistance += Math.sqrt(dx * dx + dy * dy);
            }
          });
          const meanDistance = totalDistance / graph.getAllNodes().length;
          meanDistances.push(meanDistance);

          // Update previous positions
          const currentPositions = new Map<number, { x: number; y: number }>();
          graph.getAllNodes().forEach((node: Node) => {
            currentPositions.set(node.id, {
              x: node.coordinates.x,
              y: node.coordinates.y,
            });
          });
          previousPositions = currentPositions;
        }

        // Compute adaptive durations inversely proportional to mean distances
        const totalTargetTime = stepCount * stepDuration;
        const totalMeanDistance = meanDistances.reduce((a, b) => a + b, 0);
        stepDurations = meanDistances.map((dist) => {
          return dist > 0
            ? Math.min(totalTargetTime, (totalTargetTime / totalMeanDistance) * dist)
            : stepDuration;
        });

        // Restore initial positions before actual recording
        graph.getAllNodes().forEach((node: Node) => {
          const saved = initialPositions.get(node.id);
          if (saved) {
            node.coordinates.x = saved.x;
            node.coordinates.y = saved.y;
          }
        });
      }

      await this.withScaledCanvas(async () => {
        // Reinitialize movie maker with scaled canvas
        movieFacade.initialize();

        // Create animation frames
        const frames: any[] = [];
        for (let i = 0; i < stepCount; i++) {
          frames.push({
            action: () => {
              simulationStep();
              app.render();
            },
            duration: stepDurations[i],
          });
        }

        const sequence = {
          name: `${simulationName} Simulation`,
          frames,
          defaultFrameDuration: stepDuration,
        };

        uiFacade.updateMovieStatus(
          `Recording ${simulationName} simulation (${stepCount} steps${
            adaptiveStepDuration ? " with adaptive duration" : ""
          })...`
        );

        try {
          const movieMaker = movieFacade.getMovieMaker();
          if (!movieMaker) {
            throw new Error("Movie maker not initialized");
          }
          await movieMaker.recordMovie(
            [sequence],
            `${simulationType}-simulation.webm`
          );
          uiFacade.updateMovieStatus("Movie saved successfully!");
          setTimeout(() => uiFacade.updateMovieStatus(""), 3000);
        } catch (error) {
          console.error("Error creating movie:", error);
          alert("Error creating movie: " + error);
          uiFacade.updateMovieStatus("Error creating movie");
        }
      });
    } finally {
      // Restore node positions
      graph.getAllNodes().forEach((node: Node) => {
        const saved = savedPositions.get(node.id);
        if (saved) {
          node.coordinates.x = saved.x;
          node.coordinates.y = saved.y;
        }
      });
    }
  }
}

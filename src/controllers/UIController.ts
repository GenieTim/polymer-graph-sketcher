import { Container } from "../core/Container";
import { 
  NodePropertyUpdateAction, 
  SelectNodesAction,
  Action
} from "../actions";
import { Node } from "../graph";
import { Colour } from "../Colours";
import { SVGCanvasRenderingContext2D } from "../svg-ctx";

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
    const modeSwitch = document.getElementById("modeSwitch") as HTMLSelectElement;
    if (!modeSwitch) return;

    modeSwitch.addEventListener("click", () => {
      const modeFactory = this.container.get<any>("modeFactory");
      modeFactory.setCurrentMode(modeSwitch.value);
    });
  }

  /**
   * Attach node property change listeners
   */
  private attachNodePropertyListeners(): void {
    const actionManager = this.container.get<any>("actionManager");
    const selection = this.container.get<any>("selection");

    // Vertex radius
    const radiusInput = document.getElementById("vertexRadius") as HTMLInputElement;
    if (radiusInput) {
      radiusInput.addEventListener("change", function () {
        if (selection.empty) return;
        const targetValue = parseFloat(this.value);
        actionManager.addAction(
          new NodePropertyUpdateAction(
            selection.getItemsOfClass(Node),
            targetValue,
            "radius"
          )
        );
      });
    }

    // Vertex stroke width
    const strokeWidthInput = document.getElementById("vertexStrokeWidth") as HTMLInputElement;
    if (strokeWidthInput) {
      strokeWidthInput.addEventListener("change", function () {
        if (selection.empty) return;
        const targetValue = parseFloat(this.value);
        actionManager.addAction(
          new NodePropertyUpdateAction(
            selection.getItemsOfClass(Node),
            targetValue,
            "strokeWidth"
          )
        );
      });
    }

    // Node fill color
    const fillColorInput = document.getElementById("nodeFillColor") as HTMLInputElement;
    if (fillColorInput) {
      fillColorInput.addEventListener("change", function () {
        if (selection.empty) return;
        actionManager.addAction(
          new NodePropertyUpdateAction(
            selection.getItemsOfClass(Node),
            this.value,
            "fillColor"
          )
        );
      });
    }

    // Node stroke color
    const nodeColorInput = document.getElementById("nodeColor") as HTMLInputElement;
    if (nodeColorInput) {
      nodeColorInput.addEventListener("change", function () {
        if (selection.empty) return;
        actionManager.addAction(
          new NodePropertyUpdateAction(
            selection.getItemsOfClass(Node),
            this.value,
            "strokeColor"
          )
        );
      });
    }

    // Select vertices by stroke color
    const selectStrokeInput = document.getElementById("selectVerticesStroke") as HTMLInputElement;
    const container = this.container;
    if (selectStrokeInput) {
      selectStrokeInput.addEventListener("change", function () {
        const graph = container.get<any>("graph");
        actionManager.addAction(
          new SelectNodesAction(
            graph.getAllNodes().filter((node: Node) => {
              return (
                Colour.deltaE00(
                  Colour.hex2lab(node.strokeColor),
                  Colour.hex2lab(this.value)
                ) < 10
              );
            }),
            true
          )
        );
      });
    }
  }

  /**
   * Attach edge property change listeners
   */
  private attachEdgePropertyListeners(): void {
    const graph = this.container.get<any>("graph");
    const selection = this.container.get<any>("selection");
    const app = this.container.get<any>("app");

    // Edge color
    const edgeColorInput = document.getElementById("edgeColor") as HTMLInputElement;
    if (edgeColorInput) {
      edgeColorInput.addEventListener("change", function () {
        graph
          .getEdgesWithBothEndsInNodes(
            selection.getItemsOfClass(Node).map((node: Node) => node.id)
          )
          .forEach((edge: any) => {
            edge.color = this.value;
          });
        app.render();
      });
    }

    // Line width
    const lineWidthInput = document.getElementById("lineWidth") as HTMLInputElement;
    if (lineWidthInput) {
      lineWidthInput.addEventListener("change", function () {
        graph
          .getEdgesWithBothEndsInNodes(
            selection.getItemsOfClass(Node).map((node: Node) => node.id)
          )
          .forEach((edge: any) => {
            edge.weight = parseFloat(this.value);
          });
        app.render();
      });
    }
  }

  /**
   * Attach canvas property change listeners
   */
  private attachCanvasPropertyListeners(): void {
    const actionManager = this.container.get<any>("actionManager");
    const settings = this.container.get<any>("settings");
    const canvasFacade = this.container.get<any>("canvas");
    const app = this.container.get<any>("app");
    const graph = this.container.get<any>("graph");
    const container = this.container;

    // Canvas width
    const widthInput = document.getElementById("canvasWidth") as HTMLInputElement;
    if (widthInput) {
      widthInput.addEventListener("change", function () {
        const val = parseFloat(this.value);
        actionManager.addAction(
          new (class implements Action {
            private targetValue: number = val;
            private previousValue: number = settings.canvasSize.x;

            private setWidth(width: number): void {
              const canvasParent = document.getElementById("canvas-parent") as HTMLElement;
              canvasParent.style.width = width + "px";
              settings.canvasSize.x = width;
              const uiFacade = container.get<any>("ui");
              const resizeElements = uiFacade.getInputChecked("resizeElements");
              const scalingFactors = canvasFacade.resizeWithGraphScaling(
                settings.canvasSize.x, 
                settings.canvasSize.y, 
                resizeElements,
                graph
              );
              app.render(scalingFactors);
              document.getElementById("canvas-size")!.textContent =
                `Canvas size: ${settings.canvasSize.x}x${settings.canvasSize.y}`;
            }

            do(): void {
              this.setWidth(this.targetValue);
            }
            undo(): void {
              this.setWidth(this.previousValue);
            }
          })()
        );
      });
    }

    // Canvas height
    const heightInput = document.getElementById("canvasHeight") as HTMLInputElement;
    if (heightInput) {
      heightInput.addEventListener("change", function () {
        const val = parseFloat(this.value);
        actionManager.addAction(
          new (class implements Action {
            private targetValue: number = val;
            private previousValue: number = settings.canvasSize.y;

            private setHeight(height: number): void {
              const canvasParent = document.getElementById("canvas-parent") as HTMLElement;
              canvasParent.style.height = height + "px";
              settings.canvasSize.y = height;
              const uiFacade = container.get<any>("ui");
              const resizeElements = uiFacade.getInputChecked("resizeElements");
              const scalingFactors = canvasFacade.resizeWithGraphScaling(
                settings.canvasSize.x, 
                settings.canvasSize.y, 
                resizeElements,
                graph
              );
              app.render(scalingFactors);
              document.getElementById("canvas-size")!.textContent =
                `Canvas size: ${settings.canvasSize.x}x${settings.canvasSize.y}`;
            }

            do(): void {
              this.setHeight(this.targetValue);
            }
            undo(): void {
              this.setHeight(this.previousValue);
            }
          })()
        );
      });
    }

    // Disable PBC
    const disablePBCInput = document.getElementById("disablePBC") as HTMLInputElement;
    if (disablePBCInput) {
      disablePBCInput.addEventListener("change", function () {
        settings.disablePBC = this.checked;
        app.render();
      });
    }
  }

  /**
   * Attach button click listeners
   */
  private attachButtonListeners(): void {
    // This would attach all the button listeners
    // For brevity, I'll show a few examples
    
    const clearSelectionBtn = document.getElementById("clearSelectionButton") as HTMLButtonElement;
    if (clearSelectionBtn) {
      clearSelectionBtn.addEventListener("click", () => {
        const actionManager = this.container.get<any>("actionManager");
        const ClearSelectionAction = this.container.get<any>("ClearSelectionAction");
        actionManager.addAction(new ClearSelectionAction());
      });
    }

    const selectAllBtn = document.getElementById("selectAllButton") as HTMLButtonElement;
    if (selectAllBtn) {
      selectAllBtn.addEventListener("click", () => {
        const actionManager = this.container.get<any>("actionManager");
        const SelectAllNodesAction = this.container.get<any>("SelectAllNodesAction");
        actionManager.addAction(new SelectAllNodesAction());
      });
    }

    const invertSelectionBtn = document.getElementById("invertSelectionButton") as HTMLButtonElement;
    if (invertSelectionBtn) {
      invertSelectionBtn.addEventListener("click", () => {
        const actionManager = this.container.get<any>("actionManager");
        const InvertSelectionAction = this.container.get<any>("InvertSelectionAction");
        actionManager.addAction(new InvertSelectionAction());
      });
    }

    const clearCanvasBtn = document.getElementById("clearCanvasButton") as HTMLButtonElement;
    if (clearCanvasBtn) {
      clearCanvasBtn.addEventListener("click", () => {
        const graph = this.container.get<any>("graph");
        const selection = this.container.get<any>("selection");
        const modeFactory = this.container.get<any>("modeFactory");
        const app = this.container.get<any>("app");
        
        graph.clear();
        selection.clearSelection();
        modeFactory.setCurrentMode("vertex");
        app.render();
      });
    }

    // Export graph button
    const exportGraphBtn = document.getElementById("exportGraphButton") as HTMLButtonElement;
    if (exportGraphBtn) {
      exportGraphBtn.addEventListener("click", () => {
        this.exportGraph();
      });
    }

    // Save as image button
    const saveImageBtn = document.getElementById("saveImageButton") as HTMLButtonElement;
    if (saveImageBtn) {
      saveImageBtn.addEventListener("click", () => {
        this.saveCanvasAsImage();
      });
    }

    // Save as SVG button
    const saveSvgBtn = document.getElementById("saveSvgButton") as HTMLButtonElement;
    if (saveSvgBtn) {
      saveSvgBtn.addEventListener("click", () => {
        this.saveGraphAsSvg();
      });
    }

    // Import graph file input
    const importInput = document.getElementById("import") as HTMLInputElement;
    if (importInput) {
      importInput.addEventListener("change", () => {
        this.importGraph();
      });
    }

    // Movie recording buttons
    const startRecordingBtn = document.getElementById("startRecordingEdgesBtn") as HTMLButtonElement;
    if (startRecordingBtn) {
      startRecordingBtn.addEventListener("click", () => {
        this.toggleEdgeRecording();
      });
    }

    const createEdgeMovieBtn = document.getElementById("createEdgeMovieBtn") as HTMLButtonElement;
    if (createEdgeMovieBtn) {
      createEdgeMovieBtn.addEventListener("click", () => {
        this.createEdgeAdditionMovie();
      });
    }

    const createSimMovieBtn = document.getElementById("createSimMovieBtn") as HTMLButtonElement;
    if (createSimMovieBtn) {
      createSimMovieBtn.addEventListener("click", () => {
        this.createSimulationMovie();
      });
    }
  }

  /**
   * Attach listeners for elements that trigger redraws
   */
  private attachRedrawListeners(): void {
    const app = this.container.get<any>("app");
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
   * Export the graph to a JSON file
   */
  private exportGraph(): void {
    const graph = this.container.get<any>("graph");
    const settings = this.container.get<any>("settings");
    
    const blob = new Blob([JSON.stringify({ graph: graph, settings: settings })], {
      type: "application/json",
    });
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

    const graph = this.container.get<any>("graph");
    const settings = this.container.get<any>("settings");
    const uiFacade = this.container.get<any>("ui");
    const canvasFacade = this.container.get<any>("canvas");
    const app = this.container.get<any>("app");

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
          const canvasParent = document.getElementById("canvas-parent") as HTMLElement;
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
        const nodeCounter = this.container.get<any>("nodeCounter");
        if (nodeCounter) {
          const nodeIds = graph.getAllNodeIds().filter((id: number) => !isNaN(id));
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
    const app = this.container.get<any>("app");
    const settings = this.container.get<any>("settings");
    const canvasFacade = this.container.get<any>("canvas");
    const graph = this.container.get<any>("graph");

    // Store original state
    const originalShowSelection = app.showSelection.value;
    const originalIsScaled = settings.isScaled;
    const originalCanvasSize = {
      x: settings.canvasSize.x,
      y: settings.canvasSize.y,
    };

    // Set up for high-res export
    app.showSelection.value = false;
    settings.isScaled = true;
    settings.canvasSize.x *= settings.imageScaleFactor;
    settings.canvasSize.y *= settings.imageScaleFactor;

    // Resize and scale graph elements
    canvasFacade.resizeWithGraphScaling(
      settings.canvasSize.x,
      settings.canvasSize.y,
      true, // rescaleElements = true
      graph
    );

    // Render at high resolution (canvas already resized, elements already scaled)
    app.render();

    // Get image data and download
    const image = canvasFacade.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = image;
    link.download = "polymer-graph-sketch.png";
    link.click();

    // Restore original state by scaling back
    app.showSelection.value = originalShowSelection;
    settings.isScaled = originalIsScaled;
    settings.canvasSize.x = originalCanvasSize.x;
    settings.canvasSize.y = originalCanvasSize.y;

    // Scale back to original size
    canvasFacade.resizeWithGraphScaling(
      settings.canvasSize.x,
      settings.canvasSize.y,
      true, // rescaleElements = true to scale back
      graph
    );

    // Render at normal 1:1 scaling
    app.render();
  }

  /**
   * Save the graph as an SVG file
   */
  private saveGraphAsSvg(): void {
    const settings = this.container.get<any>("settings");
    const app = this.container.get<any>("app");

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
   * Toggle edge recording on/off
   */
  private toggleEdgeRecording(): void {
    const movieFacade = this.container.get<any>("movie");
    const modeFactory = this.container.get<any>("modeFactory");
    const uiFacade = this.container.get<any>("ui");
    
    // Initialize movie maker if needed
    if (!movieFacade.getMovieMaker()) {
      movieFacade.initialize();
    }

    const btn = document.getElementById("startRecordingEdgesBtn") as HTMLButtonElement;
    
    if (movieFacade.isRecording) {
      // Stop recording
      const count = movieFacade.stopRecordingEdges();
      btn.textContent = "Start Recording Edges";
      btn.classList.remove("btn-danger");
      btn.classList.add("btn-success");
      
      // Clear recording callback from edge mode
      const edgeMode = modeFactory.getMode("edge");
      if (edgeMode && edgeMode.setRecordingCallback) {
        edgeMode.setRecordingCallback(undefined);
      }
      
      uiFacade.updateMovieStatus(`Recording stopped. ${count} edges recorded.`);
    } else {
      // Start recording
      movieFacade.startRecordingEdges();
      btn.textContent = "Stop Recording";
      btn.classList.remove("btn-success");
      btn.classList.add("btn-danger");
      
      // Set up recording callback in edge mode
      const graph = this.container.get<any>("graph");
      const edgeMode = modeFactory.getMode("edge");
      if (edgeMode && edgeMode.setRecordingCallback) {
        edgeMode.setRecordingCallback((fromNode: Node, toNode: Node) => {
          const edges = graph.getEdgesInvolvingNodes([fromNode.id, toNode.id]);
          const existingEdge = edges.find((edge: any) => 
            (edge.fromId === fromNode.id && edge.toId === toNode.id) ||
            (edge.fromId === toNode.id && edge.toId === fromNode.id)
          );
          
          if (existingEdge) {
            movieFacade.recordEdgeAction('add', fromNode, toNode, existingEdge.color, existingEdge.weight);
          }
        });
      }
      
      uiFacade.updateMovieStatus("Recording edge additions...");
    }
  }

  /**
   * Create and download movie of recorded edge additions
   */
  private async createEdgeAdditionMovie(): Promise<void> {
    const movieFacade = this.container.get<any>("movie");
    const graph = this.container.get<any>("graph");
    const app = this.container.get<any>("app");
    const settings = this.container.get<any>("settings");
    const canvasFacade = this.container.get<any>("canvas");
    const uiFacade = this.container.get<any>("ui");
    
    const recordedEdges = movieFacade.getRecordedEdges();
    if (recordedEdges.length === 0) {
      alert("No edges recorded! Use 'Start Recording Edges' first.");
      return;
    }

    // Initialize movie maker if needed
    if (!movieFacade.getMovieMaker()) {
      movieFacade.initialize();
    }

    const edgeDuration = uiFacade.getInputValueAsNumber("edgeAnimationDuration") || 1000;
    const interpolationSteps = 30;

    // Store original state
    const originalShowSelection = app.showSelection.value;
    const originalIsScaled = settings.isScaled;
    const originalCanvasSize = {
      x: settings.canvasSize.x,
      y: settings.canvasSize.y,
    };

    try {
      // Scale up canvas for high-resolution recording
      app.showSelection.value = false;
      settings.isScaled = true;
      settings.canvasSize.x *= settings.imageScaleFactor;
      settings.canvasSize.y *= settings.imageScaleFactor;

      // Resize and scale graph elements
      canvasFacade.resizeWithGraphScaling(
        settings.canvasSize.x,
        settings.canvasSize.y,
        true,
        graph
      );

      // Reinitialize movie maker with scaled canvas
      movieFacade.initialize();

      // Calculate initial state by tracking net changes
      const edgeNetChanges = new Map<string, any>();
      recordedEdges.forEach(({ type, fromNode, toNode, color, weight }: any) => {
        const key = fromNode.id < toNode.id 
          ? `${fromNode.id}-${toNode.id}` 
          : `${toNode.id}-${fromNode.id}`;
        
        edgeNetChanges.set(key, {
          lastAction: type,
          fromNode,
          toNode,
          color,
          weight
        });
      });

      // Restore to initial state
      const animationPartialEdges: any[] = [];
      edgeNetChanges.forEach((netChange) => {
        const edges = graph.getEdgesInvolvingNodes([netChange.fromNode.id, netChange.toNode.id]);
        const matchingEdge = edges.find((edge: any) => 
          (edge.fromId === netChange.fromNode.id && edge.toId === netChange.toNode.id) ||
          (edge.fromId === netChange.toNode.id && edge.toId === netChange.fromNode.id)
        );
        
        if (netChange.lastAction === 'add') {
          if (matchingEdge) {
            graph.deleteEdge(matchingEdge);
          }
        } else {
          if (!matchingEdge) {
            graph.addEdge(netChange.fromNode.id, netChange.toNode.id, netChange.color, netChange.weight);
          }
        }
      });

      app.render();

      // Create animation frames
      const frames: any[] = [];
      recordedEdges.forEach(({ type, fromNode, toNode, color, weight }: any, edgeIndex: number) => {
        const stepDuration = edgeDuration / interpolationSteps;
        
        const PartialLine = this.container.get<any>("PartialLine");
        const partialLine = new PartialLine(
          { x: fromNode.coordinates.x, y: fromNode.coordinates.y },
          { x: toNode.coordinates.x, y: toNode.coordinates.y },
          type === 'add' ? 0 : 1,
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
              if (type === 'add') {
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
                  const edges = graph.getEdgesInvolvingNodes([fromNode.id, toNode.id]);
                  const edgeToRemove = edges.find((edge: any) => 
                    (edge.fromId === fromNode.id && edge.toId === toNode.id) ||
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
      });

      const sequence = {
        name: 'Edge Animation',
        frames,
        defaultFrameDuration: edgeDuration / interpolationSteps,
        onComplete: () => {
          animationPartialEdges.length = 0;
        },
      };

      const addCount = recordedEdges.filter((e: any) => e.type === 'add').length;
      const removeCount = recordedEdges.filter((e: any) => e.type === 'remove').length;
      uiFacade.updateMovieStatus(`Recording edge animation (${addCount} additions, ${removeCount} removals)...`);
      
      await movieFacade.getMovieMaker().recordMovie([sequence], 'edge-animation.webm');
      
      uiFacade.updateMovieStatus('Movie saved successfully!');
      setTimeout(() => uiFacade.updateMovieStatus(''), 3000);
    } catch (error) {
      console.error('Error creating movie:', error);
      alert('Error creating movie: ' + error);
      uiFacade.updateMovieStatus('Error creating movie');
    } finally {
      // Restore original state
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
    }
  }

  /**
   * Create and download movie of simulation steps
   */
  private async createSimulationMovie(): Promise<void> {
    const movieFacade = this.container.get<any>("movie");
    const graph = this.container.get<any>("graph");
    const app = this.container.get<any>("app");
    const settings = this.container.get<any>("settings");
    const canvasFacade = this.container.get<any>("canvas");
    const uiFacade = this.container.get<any>("ui");
    
    // Initialize movie maker if needed
    if (!movieFacade.getMovieMaker()) {
      movieFacade.initialize();
    }

    const simulationType = uiFacade.getInputValue("simulationType") || "force_balance";
    const stepCount = uiFacade.getInputValueAsNumber("simulationStepCount") || 10;
    const stepDuration = uiFacade.getInputValueAsNumber("simulationStepDuration") || 300;

    // Get simulation function
    const simulations = this.container.get<any>("simulations");
    let simulationStep: () => void;
    let simulationName: string;

    if (simulationType === 'force_balance') {
      simulationStep = () => simulations.doForceBalanceStep(graph);
      simulationName = 'Force Balance';
    } else if (simulationType === 'position_equilibration') {
      simulationStep = () => simulations.doPositionEquilibrationStep(graph);
      simulationName = 'Position Equilibration';
    } else {
      alert('Invalid simulation type');
      return;
    }

    // Store original state
    const originalShowSelection = app.showSelection.value;
    const originalIsScaled = settings.isScaled;
    const originalCanvasSize = {
      x: settings.canvasSize.x,
      y: settings.canvasSize.y,
    };

    // Save node positions to restore later
    const savedPositions = new Map<number, { x: number; y: number }>();
    graph.getAllNodes().forEach((node: Node) => {
      savedPositions.set(node.id, { x: node.coordinates.x, y: node.coordinates.y });
    });

    try {
      // Scale up canvas for high-resolution recording
      app.showSelection.value = false;
      settings.isScaled = true;
      settings.canvasSize.x *= settings.imageScaleFactor;
      settings.canvasSize.y *= settings.imageScaleFactor;

      // Resize and scale graph elements  
      canvasFacade.resizeWithGraphScaling(
        settings.canvasSize.x,
        settings.canvasSize.y,
        true,
        graph
      );

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
          duration: stepDuration,
        });
      }

      const sequence = {
        name: `${simulationName} Simulation`,
        frames,
        defaultFrameDuration: stepDuration,
      };

      uiFacade.updateMovieStatus(`Recording ${simulationName} simulation (${stepCount} steps)...`);
      
      await movieFacade.getMovieMaker().recordMovie([sequence], `${simulationType}-simulation.webm`);
      
      uiFacade.updateMovieStatus('Movie saved successfully!');
      setTimeout(() => uiFacade.updateMovieStatus(''), 3000);
    } catch (error) {
      console.error('Error creating movie:', error);
      alert('Error creating movie: ' + error);
      uiFacade.updateMovieStatus('Error creating movie');
    } finally {
      // Restore node positions
      graph.getAllNodes().forEach((node: Node) => {
        const saved = savedPositions.get(node.id);
        if (saved) {
          node.coordinates.x = saved.x;
          node.coordinates.y = saved.y;
        }
      });

      // Restore original state
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
    }
  }
}

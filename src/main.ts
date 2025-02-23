import { Action, ActionManager } from "./actions";
import { Circle, Drawable, Rectangle } from "./drawables";
import { Graph, Node } from "./graph";
import { Point } from "./primitives";
import { GlobalSettings } from "./settings";
import "./style.css";

var canvas: HTMLCanvasElement = document.getElementById(
  "canvas"
) as HTMLCanvasElement;
var canvasParent: HTMLElement = document.getElementById(
  "canvas-parent"
) as HTMLElement;
var ctx: CanvasRenderingContext2D = canvas.getContext(
  "2d"
) as CanvasRenderingContext2D;

var elementsToDraw: Drawable[] = [];
var graph = new Graph();
var interactionMode = "vertex";
var lastSelectedNodes: Node[] = [];
var nNodesTotal = 0;
var settings = new GlobalSettings();
var showSelection: boolean = true;
var dragStart: Point | null = null;
var actionManager: ActionManager = new ActionManager(() =>
  recomputeElementsToDraw()
);

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  elementsToDraw.forEach(function (element) {
    element.draw(ctx, settings);
  });

  // requestAnimationFrame(draw);
}

canvas.addEventListener("click", function (event) {
  if (dragStart) {
    return;
  }
  var x = event.clientX - canvas.offsetLeft + window.scrollX;
  var y = event.clientY - canvas.offsetTop + window.scrollY;

  // depending on the interaction mode, add a new node or edge
  if (interactionMode === "vertex") {
    actionManager.addAction(
      new (class implements Action {
        private nodeId = nNodesTotal;

        do() {
          graph.setNode(
            new Node(
              this.nodeId,
              { x, y },
              parseFloat(
                (document.getElementById("vertexRadius") as HTMLInputElement)
                  .value
              ),
              parseFloat(
                (
                  document.getElementById(
                    "vertexStrokeWidth"
                  ) as HTMLInputElement
                ).value
              ),
              (
                document.getElementById("nodeFillColor") as HTMLInputElement
              ).value,
              (document.getElementById("nodeColor") as HTMLInputElement).value
            )
          );
          if (lastSelectedNodes.length <= 1) {
            lastSelectedNodes = [graph.getNode(nNodesTotal)];
          }
          nNodesTotal += 1;
        }

        undo() {
          graph.deleteNode(this.nodeId);
          nNodesTotal -= 1;
        }
      })()
    );
  } else if (interactionMode === "edge") {
    var newSelectedNode = graph.findNodeByCoordinates(x, y);
    if (lastSelectedNodes.length && newSelectedNode !== null) {
      actionManager.addAction(
        new (class implements Action {
          private fromNode: Node = newSelectedNode as Node;
          private affectedNodes: Node[] = lastSelectedNodes;
          private edgeIds: number[] = [];

          do() {
            this.affectedNodes.forEach((node) => {
              this.edgeIds.push(
                graph.addEdge(
                  this.fromNode.id,
                  node.id,
                  (document.getElementById("edgeColor") as HTMLInputElement)
                    .value,
                  parseFloat(
                    (document.getElementById("lineWidth") as HTMLInputElement)
                      .value
                  )
                )
              );
            });
            if (this.affectedNodes.length <= 1) {
              lastSelectedNodes = [this.fromNode];
            }
          }

          undo() {
            this.edgeIds
              .slice()
              .reverse()
              .forEach((edgeId) => {
                graph.deleteEdge(edgeId);
              });
            lastSelectedNodes = this.affectedNodes;
          }
        })()
      );
    }
  } else if (interactionMode === "delete") {
    var newSelectedNode = graph.findNodeByCoordinates(x, y);
    if (newSelectedNode !== null) {
      actionManager.addAction(
        new (class implements Action {
          private affectedNode: Node = newSelectedNode as Node;

          do() {
            graph.deleteNode(this.affectedNode.id);
          }

          undo() {
            graph.setNode(this.affectedNode);
          }
        })()
      );
    }
  } else if (interactionMode === "select") {
    var newSelectedNode = graph.findNodeByCoordinates(x, y);
    if (newSelectedNode) {
      actionManager.addAction(
        new (class implements Action {
          private affectedNode: Node = newSelectedNode as Node;

          do() {
            lastSelectedNodes.push(newSelectedNode as Node);
          }

          undo() {
            lastSelectedNodes.pop();
          }
        })()
      );
    }
  }
});

window.addEventListener("mousedown", function (event) {
  dragStart = { x: event.clientX, y: event.clientY };
});

window.addEventListener("mousemove", function (event) {
  if (dragStart) {
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    lastSelectedNodes.forEach((node) => {
      node.coordinates.x += dx;
      node.coordinates.y += dy;
    });
    dragStart = { x: event.clientX, y: event.clientY };
    recomputeElementsToDraw();
  }
});

window.addEventListener("mouseup", function (event) {
  dragStart = null;
});

function resizeCanvas(width: number, height: number) {
  const prevWidth = canvas.width;
  const prevHeight = canvas.height;
  canvas.width = width;
  canvas.height = height;

  // calculate new scale and offset to maintain aspect ratio
  const xScaling = canvas.width / prevWidth;
  const yScaling = canvas.height / prevHeight;

  const scaling1D = Math.min(xScaling, yScaling);

  const resizeElements: boolean = (
    document.getElementById("resizeElements") as HTMLInputElement
  ).checked;

  // reposition elements to maintain their position relative to the canvas
  var allNodes = graph.getAllNodes();
  allNodes.forEach((node) => {
    node.coordinates.x *= xScaling;
    node.coordinates.y *= yScaling;
    if (resizeElements) {
      node.radius *= scaling1D;
      node.strokeWidth *= scaling1D;
    }
  });

  if (resizeElements) {
    var allEdges = graph.getAllEdges();
    allEdges.forEach((edge) => {
      edge.weight *= scaling1D;
    });

    graph.zigzagLength *= scaling1D;
    graph.zigzagSpacing *= scaling1D;
    graph.zigzagEndLengths *= scaling1D;
  }

  recomputeElementsToDraw({ x: xScaling, y: yScaling }); // redraw all elements after resizing the canvas.
}

function clearCanvas() {
  graph = new Graph();
  lastSelectedNodes = [];
  changeInteractionMode("vertex");
  recomputeElementsToDraw();
}

function selectAll() {
  actionManager.addAction(
    new (class implements Action {
      private previousSelectedNodes: Node[] = lastSelectedNodes;

      do() {
        lastSelectedNodes = graph.getAllNodes();
        recomputeElementsToDraw();
      }

      undo() {
        lastSelectedNodes = this.previousSelectedNodes;
        recomputeElementsToDraw();
      }
    })()
  );
}

function clearSelection() {
  actionManager.addAction(
    new (class implements Action {
      private previousSelectedNodes: Node[] = lastSelectedNodes;

      do() {
        lastSelectedNodes = [];
        recomputeElementsToDraw();
      }

      undo() {
        lastSelectedNodes = this.previousSelectedNodes;
        recomputeElementsToDraw();
      }
    })()
  );
}

function recomputeElementsToDraw(scaling = { x: 1, y: 1 }) {
  var scalingFactor1D = Math.max(scaling.x, scaling.y);

  const bgColor = (
    document.getElementById("backgroundColor") as HTMLInputElement
  ).value;
  const borderColor = (
    document.getElementById("borderColor") as HTMLInputElement
  ).value;

  elementsToDraw = [
    // white background
    new Rectangle(
      { x: 0, y: 0 },
      canvas.width,
      canvas.height,
      0,
      bgColor,
      bgColor
    ),
  ];

  elementsToDraw = elementsToDraw.concat(graph.toDrawables());

  // add white border to hide too long edges,
  elementsToDraw.push(
    new Rectangle(
      { x: 0, y: 0 },
      canvas.width,
      canvas.height,
      20.0 * scalingFactor1D,
      bgColor
    )
  );
  // black border as box around the graph
  elementsToDraw.push(
    new Rectangle(
      { x: 10 * scaling.x, y: 10 * scaling.y },
      canvas.width - 20 * scaling.x,
      canvas.height - 20 * scaling.y,
      4.0 * scalingFactor1D,
      borderColor
    )
  );

  // red circle around selected nodes
  if (showSelection && lastSelectedNodes.length > 0) {
    lastSelectedNodes.forEach((node) => {
      elementsToDraw.push(
        new Circle(
          node.coordinates,
          node.radius * 1.2 * scalingFactor1D,
          2.0 * scalingFactor1D,
          null,
          "#ff0000"
        )
      );
    });
  }

  // redraw the graph
  draw();
}

function setValueById(id: string, value: string | number) {
  const element = document.getElementById(id);
  if (element instanceof HTMLInputElement) {
    element.value = value as string;
  }
}

window.addEventListener("load", () => {
  canvasParent.style.width = settings.canvasSize.x + "px";
  canvasParent.style.height = settings.canvasSize.y + "px";
  setValueById("canvasWidth", settings.canvasSize.x);
  setValueById("canvasHeight", settings.canvasSize.y);
  resizeCanvas(settings.canvasSize.x, settings.canvasSize.y);
  clearCanvas();

  // detect resizing of the canvas
  const observer = new ResizeObserver(function (mutations) {
    console.log("mutations:", mutations);
    settings.canvasSize.x = canvasParent.clientWidth;
    settings.canvasSize.y = canvasParent.clientHeight;
    resizeCanvas(settings.canvasSize.x, settings.canvasSize.y);
    recomputeElementsToDraw();
    document.getElementById("canvas-size")!.textContent =
      `Canvas size: ${settings.canvasSize.x}x${settings.canvasSize.y}`;
  });
  observer.observe(canvasParent);

  var modeSwitch = document.getElementById("modeSwitch") as HTMLSelectElement;
  modeSwitch.addEventListener("click", function () {
    changeInteractionMode(modeSwitch.value);
  });

  class NodePropertyUpdater<K extends keyof Node> implements Action {
    private affectedNodes: Node[];
    private originalValues: Node[K][];
    private targetValue: Node[K];
    private property: K;

    constructor(affectedNodes: Node[], targetValue: Node[K], property: K) {
      this.affectedNodes = affectedNodes;
      this.originalValues = affectedNodes.map((node) => node[property]);
      this.targetValue = targetValue;
      this.property = property;
    }

    do() {
      this.affectedNodes.forEach((node, index) => {
        node[this.property] = this.targetValue;
      });
    }

    undo() {
      this.affectedNodes.forEach((node, index) => {
        node[this.property] = this.originalValues[index];
      });
    }
  }

  // add event listeners
  // update selected nodes when changing node settings
  (
    document.getElementById("vertexRadius") as HTMLInputElement
  ).addEventListener("change", function () {
    if (lastSelectedNodes.length <= 0) {
      return;
    }
    const targetValue = parseFloat(this.value);
    actionManager.addAction(
      new NodePropertyUpdater(lastSelectedNodes, targetValue, "radius")
    );
  });
  (
    document.getElementById("vertexStrokeWidth") as HTMLInputElement
  ).addEventListener("change", function () {
    if (lastSelectedNodes.length <= 0) {
      return;
    }
    const targetValue = parseFloat(this.value);
    actionManager.addAction(
      new NodePropertyUpdater(lastSelectedNodes, targetValue, "strokeWidth")
    );
  });
  (
    document.getElementById("nodeFillColor") as HTMLInputElement
  ).addEventListener("change", function () {
    if (lastSelectedNodes.length <= 0) {
      return;
    }
    actionManager.addAction(
      new NodePropertyUpdater(lastSelectedNodes, this.value, "fillColor")
    );
  });
  (document.getElementById("nodeColor") as HTMLInputElement).addEventListener(
    "change",
    function () {
      if (lastSelectedNodes.length <= 0) {
        return;
      }
      actionManager.addAction(
        new NodePropertyUpdater(lastSelectedNodes, this.value, "strokeColor")
      );
    }
  );

  // edge properties
  (document.getElementById("edgeColor") as HTMLInputElement).addEventListener(
    "change",
    function () {
      graph
        .getEdgesWithBothEndsInNodes(lastSelectedNodes.map((node) => node.id))
        .forEach((edge) => {
          edge.color = this.value;
        });
      recomputeElementsToDraw();
    }
  );
  (document.getElementById("lineWidth") as HTMLInputElement).addEventListener(
    "change",
    function () {
      graph
        .getEdgesWithBothEndsInNodes(lastSelectedNodes.map((node) => node.id))
        .forEach((edge) => {
          edge.weight = parseFloat(this.value);
        });
      recomputeElementsToDraw();
    }
  );

  // canvas properties
  (document.getElementById("canvasWidth") as HTMLInputElement).addEventListener(
    "change",
    function () {
      const val = parseFloat(this.value);
      actionManager.addAction(
        new (class implements Action {
          private targetValue: number = val;
          private previousValue: number = settings.canvasSize.x;

          private setWidth(width: number): void {
            canvasParent.style.width = width + "px";
            settings.canvasSize.x = width;
            resizeCanvas(settings.canvasSize.x, settings.canvasSize.y);
            recomputeElementsToDraw();
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
    }
  );
  (
    document.getElementById("canvasHeight") as HTMLInputElement
  ).addEventListener("change", function () {
    const val = parseFloat(this.value);
    actionManager.addAction(
      new (class implements Action {
        private targetValue: number = val;
        private previousValue: number = settings.canvasSize.y;

        private setHeight(height: number): void {
          canvasParent.style.height = height + "px";
          settings.canvasSize.y = height;
          resizeCanvas(settings.canvasSize.x, settings.canvasSize.y);
          recomputeElementsToDraw();
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

  // to buttons as well
  (
    document.getElementById("clearSelectionButton") as HTMLButtonElement
  ).addEventListener("click", clearSelection);
  (
    document.getElementById("selectAllButton") as HTMLButtonElement
  ).addEventListener("click", selectAll);
  (
    document.getElementById("clearCanvasButton") as HTMLButtonElement
  ).addEventListener("click", clearCanvas);
  (
    document.getElementById("saveImageButton") as HTMLButtonElement
  ).addEventListener("click", saveCanvasAsImage);
  (
    document.getElementById("exportGraphButton") as HTMLButtonElement
  ).addEventListener("click", exportGraph);
  (
    document.getElementById("removeDuplicateEdges") as HTMLButtonElement
  ).addEventListener("click", () => {
    graph.removeDuplicateEdges();
    recomputeElementsToDraw();
  });
  (
    document.getElementById("removeSelfEdges") as HTMLButtonElement
  ).addEventListener("click", () => {
    graph.cleanupEdges();
    recomputeElementsToDraw();
  });

  // and the import
  (document.getElementById("import") as HTMLInputElement).addEventListener(
    "change",
    importGraph
  );

  // and some generic stuff
  // iterate elements with class "redraw-onchange" to update the graph when they change
  const redrawElements = document.getElementsByClassName("redraw-onchange");
  Array.from(redrawElements).forEach((element) => {
    if (element instanceof HTMLInputElement) {
      element.addEventListener("change", () => {
        recomputeElementsToDraw();
      });
    }
  });
});

function changeInteractionMode(mode: string) {
  actionManager.addAction(
    new (class implements Action {
      private previousInteractionMode: string = interactionMode;
      private targetInteractionMode: string = mode;

      private resetInteractionMode(newMode: string) {
        console.log("Resetting interaction mode to: " + newMode);
        interactionMode = newMode;
        (document.getElementById("modeSwitch") as HTMLSelectElement).value =
          newMode;
      }

      do() {
        this.resetInteractionMode(this.targetInteractionMode);
      }

      undo() {
        this.resetInteractionMode(this.previousInteractionMode);
      }
    })()
  );
}

function saveCanvasAsImage() {
  showSelection = false;
  settings.isScaled = true;
  const originalCanvasSize = {
    x: settings.canvasSize.x,
    y: settings.canvasSize.y,
  };
  settings.canvasSize.x *= settings.imageScaleFactor;
  settings.canvasSize.y *= settings.imageScaleFactor;
  // resize canvas to get a higher resolution image
  resizeCanvas(settings.canvasSize.x, settings.canvasSize.y);
  // create a link to download the image
  const canvas = document.getElementById("canvas");
  const image = (canvas as HTMLCanvasElement).toDataURL("image/png");
  const link = document.createElement("a");
  link.href = image;
  link.download = "polymer-graph-sketch.png";
  link.click();
  // restore original canvas size
  showSelection = true;
  settings.isScaled = false;
  settings.canvasSize.x = originalCanvasSize.x;
  settings.canvasSize.y = originalCanvasSize.y;
  resizeCanvas(settings.canvasSize.x, settings.canvasSize.y);
  recomputeElementsToDraw();
}

function exportGraph() {
  var blob = new Blob([JSON.stringify({ graph: graph, settings: settings })], {
    type: "application/json",
  });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "graph.json";
  a.click();
}

function importGraph(): void {
  const fileInput = document.getElementById("import") as HTMLInputElement;
  const file = fileInput.files?.[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (event: ProgressEvent<FileReader>) {
    if (event.target?.result) {
      const jsonGraph = JSON.parse(event.target.result as string);
      if ("settings" in jsonGraph) {
        settings = GlobalSettings.fromJSON(jsonGraph.settings);
        canvasParent.style.width = settings.canvasSize.x + "px";
        canvasParent.style.height = settings.canvasSize.y + "px";
        setValueById("canvasWidth", settings.canvasSize.x);
        setValueById("canvasHeight", settings.canvasSize.y);
        resizeCanvas(settings.canvasSize.x, settings.canvasSize.y);
        graph = Graph.fromJSON(jsonGraph.graph);
      } else {
        graph = Graph.fromJSON(jsonGraph);
      }
      nNodesTotal = Math.max(...graph.getAllNodeIds()) + 1;
      recomputeElementsToDraw();
    }
  };

  reader.readAsText(file);
}

// keyboard shortcuts
document.addEventListener("keydown", function (event) {
  if (event.ctrlKey || event.metaKey) {
    if (event.key === "s") {
      saveCanvasAsImage();
      exportGraph();
    } else if (event.key === "z") {
      event.shiftKey ? actionManager.redo() : actionManager.undo();
    }
  } else if (event.key === "a") {
    selectAll();
  } else if (event.key === "c" || event.key == "Escape") {
    clearSelection();
  } else if (event.key === "d") {
    changeInteractionMode("delete");
  } else if (event.key === "s") {
    changeInteractionMode("select");
  } else if (event.key === "v") {
    changeInteractionMode("vertex");
  } else if (event.key === "e") {
    changeInteractionMode("edge");
  } else if (event.key === "Backspace" || event.key === "Delete") {
    lastSelectedNodes.forEach((node) => {
      graph.deleteNode(node.id);
    });
  } else {
    console.log("Unhandled keyboard shortcut: " + event.key);
  }
});

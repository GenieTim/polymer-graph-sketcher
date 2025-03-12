import {
  Action,
  ActionManager,
  AddEdgeAction,
  AddNodeAction,
  ClearSelectionAction,
  DeleteEdgesAction,
  DeleteNodesAction,
  NodePropertyUpdateAction,
  SelectAllNodesAction,
  SelectNodesAction,
  UnselectNodesAction,
} from "./actions";
import { Circle, Drawable, Rectangle } from "./drawables";
import { graph, Node } from "./graph";
import { Point } from "./primitives";
import { GlobalSettings } from "./settings";
import { selection } from "./selection";
import "./style.css";
import { SVGCanvasRenderingContext2D } from "./svg-ctx";
import { doForceBalanceStep } from "./simulations";
import { collapseEdgesByColor, removeTwofunctionalNodes } from "./topology";
import { Colour } from "./Colours";

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
var interactionMode = "vertex";
var nNodesTotal = 0;
var settings = GlobalSettings.instance;
var showSelection: boolean = true;
var dragStart: Point | null = null;
var actionManager: ActionManager = new ActionManager(() =>
  recomputeElementsToDraw()
);

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  elementsToDraw.forEach(function (element) {
    element.draw(ctx);
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
    actionManager.addAction(new AddNodeAction(nNodesTotal, new Point(x, y)));
    nNodesTotal += 1;
  } else if (interactionMode === "edge") {
    var newSelectedNode = graph.findNodeByCoordinates(x, y);
    if (newSelectedNode !== null) {
      if (!selection.empty) {
        actionManager.addAction(
          new AddEdgeAction(newSelectedNode, selection.getItemsOfClass(Node))
        );
      } else {
        actionManager.addAction(new SelectNodesAction([newSelectedNode]));
      }
    }
  } else if (interactionMode === "delete_vertex") {
    var newSelectedNode = graph.findNodeByCoordinates(x, y);
    if (newSelectedNode !== null) {
      actionManager.addAction(new DeleteNodesAction([newSelectedNode]));
    }
  } else if (interactionMode === "delete_edge") {
    var newSelectedNode = graph.findNodeByCoordinates(x, y);
    if (
      (newSelectedNode !== null && !selection.empty) ||
      selection.length > 1
    ) {
      actionManager.addAction(
        new DeleteEdgesAction(selection.getItemsOfClass(Node), newSelectedNode)
      );
    } else if (newSelectedNode) {
      actionManager.addAction(new SelectNodesAction([newSelectedNode]));
    }
  } else if (interactionMode === "select") {
    var newSelectedNodes = graph.findNodesByCoordinates(x, y);
    if (newSelectedNodes.length) {
      if (selection.hasItems(newSelectedNodes)) {
        console.log("Unselecting node");
        actionManager.addAction(new UnselectNodesAction(newSelectedNodes));
      } else {
        console.log("Selecting node");
        actionManager.addAction(new SelectNodesAction(newSelectedNodes));
      }
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
    selection.getItemsOfClass(Node).forEach((node) => {
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
  console.log("Resizing canvas", [
    resizeElements,
    xScaling,
    yScaling,
    scaling1D,
  ]);

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
  graph.clear();
  selection.clearSelection();
  changeInteractionMode("vertex");
  recomputeElementsToDraw();
}

function selectAll() {
  actionManager.addAction(new SelectAllNodesAction());
}

function clearSelection() {
  actionManager.addAction(new ClearSelectionAction());
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
  if (showSelection && !selection.empty) {
    selection.getItemsOfClass(Node).forEach((node) => {
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
  // const observer = new ResizeObserver(function (mutations) {
  //   console.log("mutations:", mutations);
  //   settings.canvasSize.x = canvasParent.clientWidth;
  //   settings.canvasSize.y = canvasParent.clientHeight;
  //   resizeCanvas(settings.canvasSize.x, settings.canvasSize.y);
  //   recomputeElementsToDraw();
  //   document.getElementById("canvas-size")!.textContent =
  //     `Canvas size: ${settings.canvasSize.x}x${settings.canvasSize.y}`;
  // });
  // observer.observe(canvasParent);

  var modeSwitch = document.getElementById("modeSwitch") as HTMLSelectElement;
  modeSwitch.addEventListener("click", function () {
    changeInteractionMode(modeSwitch.value);
  });

  // add event listeners
  // update selected nodes when changing node settings
  (
    document.getElementById("vertexRadius") as HTMLInputElement
  ).addEventListener("change", function () {
    if (selection.empty) {
      return;
    }
    const targetValue = parseFloat(this.value);
    actionManager.addAction(
      new NodePropertyUpdateAction(
        selection.getItemsOfClass(Node),
        targetValue,
        "radius"
      )
    );
  });
  (
    document.getElementById("vertexStrokeWidth") as HTMLInputElement
  ).addEventListener("change", function () {
    if (selection.empty) {
      return;
    }
    const targetValue = parseFloat(this.value);
    actionManager.addAction(
      new NodePropertyUpdateAction(
        selection.getItemsOfClass(Node),
        targetValue,
        "strokeWidth"
      )
    );
  });
  (
    document.getElementById("nodeFillColor") as HTMLInputElement
  ).addEventListener("change", function () {
    if (selection.empty) {
      return;
    }
    actionManager.addAction(
      new NodePropertyUpdateAction(
        selection.getItemsOfClass(Node),
        this.value,
        "fillColor"
      )
    );
  });
  (document.getElementById("nodeColor") as HTMLInputElement).addEventListener(
    "change",
    function () {
      if (selection.empty) {
        return;
      }
      actionManager.addAction(
        new NodePropertyUpdateAction(
          selection.getItemsOfClass(Node),
          this.value,
          "strokeColor"
        )
      );
    }
  );
  (
    document.getElementById("selectVerticesStroke") as HTMLInputElement
  ).addEventListener("change", function () {
    console.log("selectVerticesStroke", [
      this.value,
      graph.getAllNodes().map((node) => node.strokeColor),
    ]);
    actionManager.addAction(
      new SelectNodesAction(
        graph.getAllNodes().filter((node) => {
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

  // edge properties
  (document.getElementById("edgeColor") as HTMLInputElement).addEventListener(
    "change",
    function () {
      graph
        .getEdgesWithBothEndsInNodes(
          selection.getItemsOfClass(Node).map((node) => node.id)
        )
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
        .getEdgesWithBothEndsInNodes(
          selection.getItemsOfClass(Node).map((node) => node.id)
        )
        .forEach((edge) => {
          edge.weight = parseFloat(this.value);
        });
      recomputeElementsToDraw();
    }
  );
  (
    document.getElementById("mergeConnectionColor") as HTMLInputElement
  ).addEventListener("change", (e: Event) => {
    const target = e.target as HTMLInputElement;
    collapseEdgesByColor(target.value);
    recomputeElementsToDraw();
  });

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

  // some other settings
  (document.getElementById("disablePBC") as HTMLInputElement).addEventListener(
    "change",
    function () {
      settings.disablePBC = this.checked as any;
      recomputeElementsToDraw();
    }
  );

  // add event listeners
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
  (
    document.getElementById("saveImageButton") as HTMLButtonElement
  ).addEventListener("click", saveCanvasAsImage);
  (
    document.getElementById("forceBalanceStep") as HTMLButtonElement
  ).addEventListener("click", () => {
    // TODO: make reversible
    const nSteps = (
      document.getElementById("nForceBalanceSteps") as HTMLInputElement
    ).valueAsNumber;
    for (let i = 0; i < nSteps; i++) {
      console.log("Running force balance step " + i + " of " + nSteps);
      doForceBalanceStep();
      recomputeElementsToDraw();
    }
  });
  (
    document.getElementById("bifunctionalRemoval") as HTMLButtonElement
  ).addEventListener("click", () => {
    removeTwofunctionalNodes();
    recomputeElementsToDraw();
  });
  (
    document.getElementById("exportGraphButton") as HTMLButtonElement
  ).addEventListener("click", exportGraph);
  (
    document.getElementById("saveSvgButton") as HTMLButtonElement
  ).addEventListener("click", () => {
    saveGraphAsSvg();
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
  const rescaleCheckbox = document.getElementById(
    "resizeElements"
  ) as HTMLInputElement;
  const rescaleCheckboxChecked = rescaleCheckbox.checked;
  rescaleCheckbox.checked = true; // turn on rescaling for image export
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
  //restore original rescaling checkbox state
  rescaleCheckbox.checked = rescaleCheckboxChecked;
}

function saveGraphAsSvg() {
  const prevCtx = ctx;
  ctx = new SVGCanvasRenderingContext2D(
    settings.canvasSize.x,
    settings.canvasSize.y
  );
  draw();
  const svg: SVGSVGElement = (ctx as SVGCanvasRenderingContext2D).getSVG();
  ctx = prevCtx;
  // download the svg
  const svgData = new XMLSerializer().serializeToString(svg);
  const a = document.createElement("a");
  a.href = "data:image/svg+xml;base64," + btoa(svgData);
  a.download = "graph.svg";
  a.click();
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
        graph.fromJSON(jsonGraph.graph);
      } else {
        graph.fromJSON(jsonGraph);
      }
      nNodesTotal =
        Math.max(...graph.getAllNodeIds().filter((id) => !isNaN(id))) + 1;
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
    } else if (event.key === "y") {
      actionManager.redo();
    }
  } else if (event.key === "a") {
    selectAll();
  } else if (event.key === "c" || event.key == "Escape") {
    clearSelection();
  } else if (event.key === "d") {
    changeInteractionMode("delete_vertex");
  } else if (event.key === "l") {
    changeInteractionMode("delete_edge");
  } else if (event.key === "s") {
    changeInteractionMode("select");
  } else if (event.key === "v") {
    changeInteractionMode("vertex");
  } else if (event.key === "e") {
    changeInteractionMode("edge");
  } else if (event.key === "Backspace" || event.key === "Delete") {
    actionManager.addAction(
      new DeleteNodesAction(selection.getItemsOfClass(Node))
    );
  } else {
    console.log("Unhandled keyboard shortcut: " + event.key);
  }
});

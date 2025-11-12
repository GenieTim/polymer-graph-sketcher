import { Container } from "../core/Container";
import { Graph } from "../models";
import { StorageService } from "./StorageService";
import { GlobalSettings } from "../utils";
import { Application } from "../core/Application";
import { SVGCanvasRenderingContext2D } from "../rendering/SVGCanvasRenderingContext2D";
import type { UIFacade } from "../facades/UIFacade";
import type { CanvasFacade } from "../facades/CanvasFacade";

/**
 * Service for file I/O operations
 * Handles import/export of graphs and image generation
 */
export class FileService {
  private container: Container;

  constructor(container: Container) {
    this.container = container;
  }

  /**
   * Export the graph to a JSON file
   */
  exportGraph(): void {
    const graph = this.container.get<Graph>("graph");
    const settings = this.container.get<GlobalSettings>("settings");

    const state = StorageService.serialize(graph, settings);
    const blob = new Blob([JSON.stringify(state)], {
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
  importGraph(file: File): void {
    const graph = this.container.get<Graph>("graph");
    const settings = this.container.get<GlobalSettings>("settings");
    const uiFacade = this.container.get<UIFacade>("ui");
    const canvasFacade = this.container.get<CanvasFacade>("canvas");
    const app = this.container.get<Application>("app");

    const reader = new FileReader();

    reader.onload = (event: ProgressEvent<FileReader>) => {
      if (event.target?.result) {
        try {
          const data = JSON.parse(event.target.result as string);
          const success = StorageService.deserialize(data, graph, settings);

          if (success) {
            // Update canvas and UI to match imported settings
            canvasFacade.resize(settings.canvasSize.x, settings.canvasSize.y);
            uiFacade.updateCanvasSizeUI(
              settings.canvasSize.x,
              settings.canvasSize.y
            );

            // Update node counter
            const nodeCounter = this.container.get<{ value: number }>(
              "nodeCounter"
            );
            if (nodeCounter && graph.getNrOfNodes() > 0) {
              const nodeIds = graph.getAllNodeIds();
              nodeCounter.value = Math.max(...nodeIds) + 1;
            }

            // Re-render
            app.render();
          } else {
            alert(
              "Failed to import graph. The file may be corrupted or in an incompatible format."
            );
          }
        } catch (error) {
          console.error("Error importing graph:", error);
          alert("Failed to import graph. Please check the file format.");
        }
      }
    };

    reader.readAsText(file);
  }

  /**
   * Save the canvas as a PNG image
   * @param scaleCallback - Optional callback to scale canvas before rendering
   */
  saveCanvasAsImage(scaleCallback?: (callback: () => void) => void): void {
    const app = this.container.get<Application>("app");
    const canvasFacade = this.container.get<CanvasFacade>("canvas");

    const saveImage = () => {
      app.render();

      const image = canvasFacade.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = "polymer-graph-sketch.png";
      link.click();
    };

    if (scaleCallback) {
      scaleCallback(saveImage);
    } else {
      saveImage();
    }
  }

  /**
   * Save the graph as an SVG file
   */
  saveGraphAsSvg(): void {
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
}

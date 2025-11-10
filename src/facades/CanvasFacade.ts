import { Drawable } from "../rendering";
import { GlobalSettings } from "../utils/GlobalSettings";
import { Point } from "../models";

/**
 * Facade for canvas operations
 * Simplifies complex canvas manipulations
 */
export class CanvasFacade {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    _settings: GlobalSettings
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  /**
   * Resize the canvas (simple resize without scaling graph elements)
   */
  resize(width: number, height: number): { xScaling: number; yScaling: number } {
    const prevWidth = this.canvas.width;
    const prevHeight = this.canvas.height;
    
    this.canvas.width = width;
    this.canvas.height = height;

    const xScaling = this.canvas.width / prevWidth;
    const yScaling = this.canvas.height / prevHeight;

    return { xScaling, yScaling };
  }

  /**
   * Resize canvas and scale graph elements accordingly
   */
  resizeWithGraphScaling(
    width: number, 
    height: number, 
    rescaleElements: boolean,
    graph: any
  ): { xScaling: number; yScaling: number } {
    const scalingFactors = this.resize(width, height);
    const { xScaling, yScaling } = scalingFactors;
    const scaling1D = Math.min(xScaling, yScaling);

    console.log("Resizing canvas", [rescaleElements, xScaling, yScaling, scaling1D]);

    // Reposition elements to maintain their position relative to the canvas
    const allNodes = graph.getAllNodes();
    allNodes.forEach((node: any) => {
      node.coordinates.x *= xScaling;
      node.coordinates.y *= yScaling;
      if (rescaleElements) {
        node.radius *= scaling1D;
        node.strokeWidth *= scaling1D;
      }
    });

    if (rescaleElements) {
      const allEdges = graph.getAllEdges();
      allEdges.forEach((edge: any) => {
        edge.weight *= scaling1D;
      });

      graph.zigzagLength *= scaling1D;
      graph.zigzagSpacing *= scaling1D;
      graph.zigzagEndLengths *= scaling1D;
    }

    return scalingFactors;
  }

  /**
   * Clear the canvas
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw elements on the canvas
   */
  draw(elements: Drawable[]): void {
    this.clear();
    elements.forEach(element => element.draw(this.ctx));
  }

  /**
   * Get canvas as data URL for export
   */
  toDataURL(type: string = "image/png"): string {
    return this.canvas.toDataURL(type);
  }

  /**
   * Get the canvas context
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * Get canvas dimensions
   */
  getDimensions(): { width: number; height: number } {
    return {
      width: this.canvas.width,
      height: this.canvas.height
    };
  }

  /**
   * Convert client coordinates to canvas coordinates
   */
  clientToCanvasCoordinates(clientX: number, clientY: number): Point {
    return new Point(
      clientX - this.canvas.offsetLeft + window.scrollX,
      clientY - this.canvas.offsetTop + window.scrollY
    );
  }
}

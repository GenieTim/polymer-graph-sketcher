import { Drawable } from "../rendering";
import { GlobalSettings } from "../utils/GlobalSettings";
import { Point } from "../models";
import { ScalingService } from "../services/ScalingService";

/**
 * Facade for canvas operations
 * Simplifies complex canvas manipulations
 */
export class CanvasFacade {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scalingService: ScalingService;

  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    settings: GlobalSettings
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.scalingService = new ScalingService(canvas, settings);
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
   * Delegates to ScalingService for consistency
   */
  resizeWithGraphScaling(
    width: number, 
    height: number, 
    rescaleElements: boolean,
    graph: any
  ): { xScaling: number; yScaling: number } {
    return this.scalingService.resizeCanvas(width, height, rescaleElements, graph);
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

  /**
   * Execute a callback with scaled canvas for high-resolution rendering
   * Automatically scales up before and restores after the callback
   * 
   * This is a high-level convenience method that delegates to ScalingService
   * and handles rendering coordination.
   * 
   * Note: This method is intentionally synchronous to maintain backward compatibility.
   * For async operations, the callback can return a Promise which will be handled correctly.
   */
  withScaledCanvas<T>(
    callback: () => T | Promise<T>,
    scaleFactor: number,
    app: any,
    graph: any,
    _settings: GlobalSettings
  ): T | Promise<T> {
    // Disable interactive rendering (selection circles, temporary elements)
    const originalRenderMode = app.renderModeInteractive.value;
    app.renderModeInteractive.value = false;

    // Scale for export
    this.scalingService.scaleForExport(scaleFactor, graph);

    try {
      // Execute callback
      const result = callback();
      
      // If callback returns a Promise, handle async restoration
      if (result instanceof Promise) {
        return result.then((value) => {
          // Restore from scaling
          this.scalingService.restoreFromScaling(graph);
          app.renderModeInteractive.value = originalRenderMode;
          app.render();
          return value;
        }).catch((error) => {
          // Ensure we restore even on error
          this.scalingService.restoreFromScaling(graph);
          app.renderModeInteractive.value = originalRenderMode;
          app.render();
          throw error;
        }) as Promise<T>;
      } else {
        // Synchronous path - restore immediately
        this.scalingService.restoreFromScaling(graph);
        app.renderModeInteractive.value = originalRenderMode;
        app.render();
        return result;
      }
    } catch (error) {
      // Synchronous error - restore and rethrow
      this.scalingService.restoreFromScaling(graph);
      app.renderModeInteractive.value = originalRenderMode;
      app.render();
      throw error;
    }
  }

  /**
   * Get the ScalingService instance for direct access to scaling operations
   */
  getScalingService(): ScalingService {
    return this.scalingService;
  }
}

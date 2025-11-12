/**
 * Facade for UI operations
 * Centralizes DOM element access and UI updates
 */
export class UIFacade {
  private elements = new Map<string, HTMLElement>();

  constructor() {
    this.cacheElements();
  }

  /**
   * Cache frequently accessed DOM elements
   */
  private cacheElements(): void {
    const elementIds = [
      "backgroundColor",
      "borderColor",
      "vertexRadius",
      "vertexStrokeWidth",
      "nodeFillColor",
      "nodeColor",
      "edgeColor",
      "lineWidth",
      "graph-stats",
      "resizeElements",
      "sideChainLength",
      "sideChainProb",
      "sideChainLengthRandomness",
      "sideChainAngleRandomness",
      "edgeAnimationDuration",
      "simulationType",
      "simulationStepCount",
      "simulationStepDuration",
      "adaptiveStepDuration",
      "movieRecordingStatus",
      "recordingEdgeCount"
    ];

    elementIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        this.elements.set(id, element);
      }
    });
  }

  /**
   * Get a cached element
   */
  getElement<T extends HTMLElement>(id: string): T | null {
    const element = this.elements.get(id);
    if (!element) {
      // Try to find it if not cached
      const found = document.getElementById(id);
      if (found) {
        this.elements.set(id, found);
        return found as T;
      }
      return null;
    }
    return element as T;
  }

  /**
   * Get value from an input element
   */
  getInputValue(id: string): string {
    const element = this.getElement<HTMLInputElement>(id);
    return element?.value || "";
  }

  /**
   * Get numeric value from an input element
   */
  getInputValueAsNumber(id: string): number {
    const element = this.getElement<HTMLInputElement>(id);
    return element?.valueAsNumber || 0;
  }

  /**
   * Get checked state from a checkbox
   */
  getInputChecked(id: string): boolean {
    const element = this.getElement<HTMLInputElement>(id);
    return element?.checked || false;
  }

  /**
   * Set value on an element
   */
  setValue(id: string, value: string | number): void {
    const element = this.getElement<HTMLInputElement>(id);
    if (element) {
      element.value = String(value);
    }
  }

  /**
   * Update graph statistics display
   */
  updateGraphStats(nodes: number, edges: number): void {
    const element = this.getElement("graph-stats");
    if (element) {
      element.textContent = `Nodes: ${nodes}, Edges: ${edges}`;
    }
  }

  /**
   * Update canvas size display and input fields
   * Centralized method for updating all canvas-related UI elements
   */
  updateCanvasSizeUI(width: number, height: number): void {
    // Update input fields
    this.setValue("canvasWidth", width);
    this.setValue("canvasHeight", height);

    // Update canvas parent container
    const canvasParent = document.getElementById("canvas-parent") as HTMLElement;
    if (canvasParent) {
      canvasParent.style.width = width + "px";
      canvasParent.style.height = height + "px";
    }

    // Update canvas size display
    const canvasSizeDisplay = document.getElementById("canvas-size");
    if (canvasSizeDisplay) {
      canvasSizeDisplay.textContent = `Canvas size: ${width}x${height}`;
    }
  }

  /**
   * Update movie recording status
   */
  updateMovieRecordingStatus(message: string): void {
    const element = this.getElement("movieRecordingStatus");
    if (element) {
      element.textContent = message;
    }
  }

  /**
   * Update movie status (alias for compatibility)
   */
  updateMovieStatus(message: string): void {
    this.updateMovieRecordingStatus(message);
  }

  /**
   * Update recording edge count
   */
  updateRecordingEdgeCount(count: number): void {
    const element = this.getElement("recordingEdgeCount");
    if (element) {
      element.textContent = String(count);
    }
  }

  /**
   * Set text content of an element
   */
  setTextContent(id: string, text: string): void {
    const element = this.getElement(id);
    if (element) {
      element.textContent = text;
    }
  }

  /**
   * Show or hide an element
   */
  setVisible(id: string, visible: boolean): void {
    const element = this.getElement(id);
    if (element) {
      element.style.display = visible ? "" : "none";
    }
  }

  /**
   * Add a class to an element
   */
  addClass(id: string, className: string): void {
    const element = this.getElement(id);
    if (element) {
      element.classList.add(className);
    }
  }

  /**
   * Remove a class from an element
   */
  removeClass(id: string, className: string): void {
    const element = this.getElement(id);
    if (element) {
      element.classList.remove(className);
    }
  }

  /**
   * Toggle a class on an element
   */
  toggleClass(id: string, className: string): void {
    const element = this.getElement(id);
    if (element) {
      element.classList.toggle(className);
    }
  }
}

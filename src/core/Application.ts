import { Container } from "./Container";
import { ObservableValue } from "./Observable";
import { Drawable } from "../rendering";

/**
 * Main Application class that coordinates the entire application
 * This is the central coordinator that manages the application lifecycle
 */
export class Application {
  private container: Container;
  
  // Observable state
  public elementsToDraw = new ObservableValue<Drawable[]>([]);
  public showSelection = new ObservableValue<boolean>(true);

  constructor(container: Container) {
    this.container = container;
  }

  /**
   * Initialize the application
   */
  initialize(): void {
    const canvasFacade = this.container.get<any>("canvas");
    const settings = this.container.get<any>("settings");
    
    // Set up initial canvas size
    canvasFacade.resize(settings.canvasSize.x, settings.canvasSize.y);
    
    // Initial render
    this.render();
  }

  /**
   * Trigger a complete re-render of the application
   * This is the central method that updates the visual state
   * 
   * @param scaling - Optional scaling factors for x and y axes
   * @param extraElements - Optional additional drawable elements to insert after edges but before nodes
   */
  render(scaling = { x: 1, y: 1 }, extraElements: Drawable[] = []): void {
    const canvasFacade = this.container.get<any>("canvas");
    const graph = this.container.get<any>("graph");
    const selection = this.container.get<any>("selection");
    const uiFacade = this.container.get<any>("ui");
    const settings = this.container.get<any>("settings");

    // Use imageScaleFactor if we're in scaled mode (PNG export), otherwise use provided scaling
    const effectiveScaling = settings.isScaled 
      ? { x: settings.imageScaleFactor, y: settings.imageScaleFactor }
      : scaling;
    
    const scalingFactor1D = Math.max(effectiveScaling.x, effectiveScaling.y);
    const canvas = canvasFacade.canvas;

    const bgColor = uiFacade.getInputValue("backgroundColor");
    const borderColor = uiFacade.getInputValue("borderColor");

    const elements: Drawable[] = [];
    
    // Background
    const Rectangle = this.container.get<any>("Rectangle");
    elements.push(
      new Rectangle(
        { x: 0, y: 0 },
        canvas.width,
        canvas.height,
        0,                // lineWidth
        "transparent",    // strokeColor
        bgColor          // fillColor
      )
    );

    // Graph elements (edges first, then nodes)
    const graphDrawables = graph.toDrawables();
    
    // The graph.toDrawables() method already returns edges before nodes
    // We need to insert extra elements (like partial edges) between them
    if (extraElements.length > 0) {
      // Split graph drawables into edges and nodes
      // Edges are Line objects (or PartialLine which extends Line), nodes are Circle objects
      const edges: Drawable[] = [];
      const nodes: Drawable[] = [];
      
      for (const drawable of graphDrawables) {
        // Check if it's a Circle (node) or Line (edge) based on constructor name
        // We check the name because of how classes are loaded in the container
        const constructorName = drawable.constructor.name;
        if (constructorName === 'Circle') {
          nodes.push(drawable);
        } else {
          // Line, PartialLine, or any other drawable
          edges.push(drawable);
        }
      }
      
      // Add edges first
      elements.push(...edges);
      
      // Add extra elements (like partial edges) after edges but before nodes
      elements.push(...extraElements);
      
      // Add nodes on top
      elements.push(...nodes);
    } else {
      // No extra elements, just add all graph drawables in order
      elements.push(...graphDrawables);
    }

    // Border to hide edges (thick border with background color)
    elements.push(
      new Rectangle(
        { x: 0, y: 0 },
        canvas.width,
        canvas.height,
        20.0 * scalingFactor1D,  // lineWidth
        bgColor,                  // strokeColor (same as background)
        null                      // fillColor (transparent)
      )
    );

    // Black border (inner rectangle)
    elements.push(
      new Rectangle(
        { x: 10 * effectiveScaling.x, y: 10 * effectiveScaling.y },
        canvas.width - 20 * effectiveScaling.x,
        canvas.height - 20 * effectiveScaling.y,
        4.0 * scalingFactor1D,    // lineWidth
        borderColor,               // strokeColor
        null                       // fillColor (transparent)
      )
    );

    // Selection circles
    if (this.showSelection.value && !selection.empty) {
      const Circle = this.container.get<any>("Circle");
      const Node = this.container.get<any>("Node");
      
      selection.getItemsOfClass(Node).forEach((node: any) => {
        elements.push(
          new Circle(
            { x: node.coordinates.x, y: node.coordinates.y },
            node.radius * scalingFactor1D * 1.5,
            2.0 * scalingFactor1D,
            "transparent",
            "red"
          )
        );
      });
    }

    // Update observable state
    this.elementsToDraw.value = elements;

    // Draw
    canvasFacade.draw(elements);

    // Update stats
    uiFacade.updateGraphStats(graph.getNrOfNodes(), graph.getNrOfEdges());
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.elementsToDraw.clearObservers();
    this.showSelection.clearObservers();
  }
}

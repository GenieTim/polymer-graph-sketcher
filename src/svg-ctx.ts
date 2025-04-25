import { Point } from "./primitives";

interface DrawingState {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  currentX: number;
  currentY: number;
  currentXOffset: number;
  currentYOffset: number;
  currentRotationRad: number;
  lastElement: SVGElement;
}

type StyleMap = Record<string, string>;

export class SVGCanvasRenderingContext2D implements CanvasRenderingContext2D {
  private svg: SVGSVGElement;
  private lastElement: SVGElement;
  private currentGroup: SVGGElement | null = null;
  private prevState: DrawingState | null = null;
  currentXOffset: number = 0;
  currentYOffset: number = 0;
  currentRotationRad: number = 0;

  constructor(width: number, height: number) {
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute("width", width.toString());
    this.svg.setAttribute("height", height.toString());
    this.lastElement = this.svg;
  }

  // utility methods
  addElement(element: SVGElement): void {
    if (this.currentGroup) {
      this.currentGroup.appendChild(element);
    } else {
      this.svg.appendChild(element);
    }
    this.lastElement = element;
  }

  pointIsOnCanvas(p: Point): boolean {
    const rect = {
      width: parseFloat(this.svg.getAttribute("width") as string),
      height: parseFloat(this.svg.getAttribute("height") as string),
    };
    return p.x >= 0 && p.x <= rect.width && p.y >= 0 && p.y <= rect.height;
  }

  // Method to create a rectangle

  rect(x: number, y: number, w: number, h: number): void {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x.toString());
    rect.setAttribute("y", y.toString());
    rect.setAttribute("width", w.toString());
    rect.setAttribute("height", h.toString());
    this.addElement(rect);
  }

  clearRect(x: number, y: number, w: number, h: number): void {
    this.rect(x, y, w, h);
    const rect = this.lastElement as SVGElement;
    rect.setAttribute("style", "background-color: white; fill: white;");
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.rect(x, y, width, height);
    this.lastElement.setAttribute(
      "style",
      this.stylesToCSS(true, false) + ";stroke:none;"
    );
  }

  strokeRect(x: number, y: number, w: number, h: number): void {
    this.rect(x, y, w, h);
    this.lastElement.setAttribute(
      "style",
      this.stylesToCSS(false, true) + ";fill:none;"
    );
  }

  // Method to create a circle
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number
  ): void {
    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    circle.setAttribute("cx", x.toString());
    circle.setAttribute("cy", y.toString());
    circle.setAttribute("r", radius.toString());
    circle.setAttribute("style", this.stylesToCSS(true, true));
    this.addElement(circle);
  }

  // Method to create a line
  moveTo(x: number, y: number): void {
    // Save the starting point of the line
    this.currentX = x;
    this.currentY = y;
  }

  rotate(angle: number): void {
    this.currentRotationRad += angle;
  }
  translate(x: number, y: number): void {
    this.currentXOffset += x;
    this.currentYOffset += y;
  }

  lineTo(x: number, y: number): void {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    const rotatedX: number =
      Math.cos(this.currentRotationRad) * this.currentX -
      Math.sin(this.currentRotationRad) * this.currentY;
    const rotatedY: number =
      Math.sin(this.currentRotationRad) * this.currentX +
      Math.cos(this.currentRotationRad) * this.currentY;
    const rotatedX2: number =
      Math.cos(this.currentRotationRad) * x -
      Math.sin(this.currentRotationRad) * y;
    const rotatedY2: number =
      Math.sin(this.currentRotationRad) * x +
      Math.cos(this.currentRotationRad) * y;
    const p1 = new Point(
      rotatedX + this.currentXOffset,
      rotatedY + this.currentYOffset
    );
    const p2 = new Point(
      rotatedX2 + this.currentXOffset,
      rotatedY2 + this.currentYOffset
    );
    line.setAttribute("x1", p1.x.toString());
    line.setAttribute("y1", p1.y.toString());
    line.setAttribute("x2", p2.x.toString());
    line.setAttribute("y2", p2.y.toString());
    line.setAttribute("style", this.stylesToCSS(false, true)); // default stroke color
    if (this.lineCap) {
      line.setAttribute("stroke-linecap", this.lineCap);
    }
    // only add line if it is within the canvas
    if (
      this.pointIsOnCanvas(p1) ||
      this.pointIsOnCanvas(p2) ||
      (p1.x <= 0 &&
        p2.x >= parseFloat(this.svg.getAttribute("width") as string)) ||
      (p1.y <= 0 &&
        p2.y >= parseFloat(this.svg.getAttribute("height") as string))
    ) {
      this.addElement(line);
    }
    this.currentX = x;
    this.currentY = y;
  }

  // Methods to style the current element
  stroke(): void {
    // Apply the stroke style to the last element created
    this.addStyles(this.stylesToCSS(false, true));
  }
  fill(path?: unknown, fillRule?: unknown): void {
    if (path || fillRule) {
      throw new Error("Method not implemented.");
    }
    this.addStyles(this.stylesToCSS(true, false));
  }

  private addStyles(newStyle: string) {
    if (this.lastElement) {
      const prevStyle = this.lastElement.getAttribute("style");
      const newStyleMap = this.parseStyles(newStyle);
      if (prevStyle) {
        const styleMap = this.parseStyles(prevStyle);
        for (const [key, value] of Object.entries(styleMap)) {
          // if the new style does not have this old key, add it
          if (!newStyleMap[key]) newStyleMap[key] = value;
        }
      }
      this.lastElement.setAttribute(
        "style",
        this.styleMapToString(newStyleMap)
      );
      // also add the styles as attributes
      for (const [key, value] of Object.entries(newStyleMap)) {
        this.lastElement.setAttribute(key, value);
      }
    }
  }

  private parseStyles(styles: string): StyleMap {
    const styleMap: StyleMap = {};
    const stylesArray = styles.split(";");
    stylesArray.forEach((style) => {
      const [key, value] = style.trim().split(":");
      styleMap[key.trim()] = value.trim();
    });
    return styleMap;
  }

  private styleMapToString(styleMap: StyleMap): string {
    return Object.entries(styleMap)
      .map(([key, value]) => `${key}: ${value}`)
      .join("; ");
  }

  restore(): void {
    if (this.prevState) {
      this.fillStyle = this.prevState.fillStyle;
      this.strokeStyle = this.prevState.strokeStyle;
      this.lineWidth = this.prevState.lineWidth;
      this.currentX = this.prevState.currentX;
      this.currentY = this.prevState.currentY;
      this.lastElement = this.prevState.lastElement;
      this.currentXOffset = this.prevState.currentXOffset;
      this.currentYOffset = this.prevState.currentYOffset;
      this.currentRotationRad = this.prevState.currentRotationRad;
      this.prevState = null;
      this.currentGroup = null;
    } else {
      throw new Error("No state to restore.");
    }
  }
  save(): void {
    if (this.prevState) {
      throw new Error("Only one state can be saved at a time.");
    }
    this.prevState = {
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      currentX: this.currentX,
      currentY: this.currentY,
      lastElement: this.lastElement,
      currentXOffset: this.currentXOffset,
      currentYOffset: this.currentYOffset,
      currentRotationRad: this.currentRotationRad,
    };
    // create a new group element to save all subsequent elements to
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.svg.appendChild(group);
    this.lastElement = group;
    this.currentGroup = group;
  }

  private stylesToCSS(fill: boolean = true, stroke: boolean = true): string {
    let styles: StyleMap = {
      // fill: "none",
      // stroke: "none",
      "stroke-width": this.lineWidth.toString(),
      "stroke-linecap": this.lineCap || "butt",
    };
    if (fill && this.fillStyle) {
      styles["fill"] = this.fillStyle.toString();
    }
    if (stroke && this.strokeStyle) {
      styles["stroke"] = this.strokeStyle.toString();
    }
    return this.styleMapToString(styles);
  }

  // Additional properties and methods from CanvasRenderingContext2D are omitted for brevity

  // Method to get the SVG element
  getSVG(): SVGSVGElement {
    return this.svg;
  }

  // Placeholder properties and methods to satisfy the CanvasRenderingContext2D interface
  currentX: number = 0;
  currentY: number = 0;
  beginPath(): void {}
  closePath(): void {}
  // ... (other methods and properties from the interface would need to be implemented as well)
  canvas!: HTMLCanvasElement;
  getContextAttributes(): CanvasRenderingContext2DSettings {
    throw new Error("Method not implemented.");
  }
  globalAlpha: number = 1;
  globalCompositeOperation!: GlobalCompositeOperation;
  drawImage(
    image: unknown,
    sx: unknown,
    sy: unknown,
    sw?: unknown,
    sh?: unknown,
    dx?: unknown,
    dy?: unknown,
    dw?: unknown,
    dh?: unknown
  ): void {
    throw new Error("Method not implemented.");
  }
  clip(path?: unknown, fillRule?: unknown): void {
    throw new Error("Method not implemented.");
  }
  isPointInPath(
    path: unknown,
    x: unknown,
    y?: unknown,
    fillRule?: unknown
  ): boolean {
    throw new Error("Method not implemented.");
  }
  isPointInStroke(path: unknown, x: unknown, y?: unknown): boolean {
    throw new Error("Method not implemented.");
  }
  fillStyle!: string | CanvasGradient | CanvasPattern;
  strokeStyle!: string | CanvasGradient | CanvasPattern;
  createConicGradient(
    startAngle: number,
    x: number,
    y: number
  ): CanvasGradient {
    throw new Error("Method not implemented.");
  }
  createLinearGradient(
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ): CanvasGradient {
    throw new Error("Method not implemented.");
  }
  createPattern(
    image: CanvasImageSource,
    repetition: string | null
  ): CanvasPattern | null {
    throw new Error("Method not implemented.");
  }
  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number
  ): CanvasGradient {
    throw new Error("Method not implemented.");
  }
  filter!: string;
  createImageData(sw: unknown, sh?: unknown, settings?: unknown): ImageData {
    throw new Error("Method not implemented.");
  }
  getImageData(
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    settings?: ImageDataSettings
  ): ImageData {
    throw new Error("Method not implemented.");
  }
  putImageData(
    imagedata: unknown,
    dx: unknown,
    dy: unknown,
    dirtyX?: unknown,
    dirtyY?: unknown,
    dirtyWidth?: unknown,
    dirtyHeight?: unknown
  ): void {
    throw new Error("Method not implemented.");
  }
  imageSmoothingEnabled!: boolean;
  imageSmoothingQuality!: ImageSmoothingQuality;
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {
    throw new Error("Method not implemented.");
  }
  scale(x: number, y: number): void {
    throw new Error("Method not implemented.");
  }
  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number
  ): void {
    throw new Error("Method not implemented.");
  }
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean
  ): void {
    throw new Error("Method not implemented.");
  }
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    throw new Error("Method not implemented.");
  }
  roundRect(
    x: unknown,
    y: unknown,
    w: unknown,
    h: unknown,
    radii?: unknown
  ): void {
    throw new Error("Method not implemented.");
  }
  lineCap: CanvasLineCap = "butt";
  lineDashOffset!: number;
  lineJoin: CanvasLineJoin = "round";
  lineWidth: number = 0;
  miterLimit!: number;
  getLineDash(): number[] {
    throw new Error("Method not implemented.");
  }
  setLineDash(segments: unknown): void {
    throw new Error("Method not implemented.");
  }
  shadowBlur!: number;
  shadowColor!: string;
  shadowOffsetX!: number;
  shadowOffsetY!: number;
  isContextLost(): boolean {
    throw new Error("Method not implemented.");
  }
  reset(): void {
    throw new Error("Method not implemented.");
  }
  fillText(text: string, x: number, y: number, maxWidth?: number): void {
    throw new Error("Method not implemented.");
  }
  measureText(text: string): TextMetrics {
    throw new Error("Method not implemented.");
  }
  strokeText(text: string, x: number, y: number, maxWidth?: number): void {
    throw new Error("Method not implemented.");
  }
  direction: CanvasDirection = "ltr";
  font!: string;
  fontKerning!: CanvasFontKerning;
  fontStretch: CanvasFontStretch = "normal";
  fontVariantCaps: CanvasFontVariantCaps = "normal";
  letterSpacing!: string;
  textAlign: CanvasTextAlign = "left";
  textBaseline!: CanvasTextBaseline;
  textRendering!: CanvasTextRendering;
  wordSpacing!: string;
  getTransform(): DOMMatrix {
    throw new Error("Method not implemented.");
  }
  resetTransform(): void {
    throw new Error("Method not implemented.");
  }
  setTransform(
    a?: unknown,
    b?: unknown,
    c?: unknown,
    d?: unknown,
    e?: unknown,
    f?: unknown
  ): void {
    throw new Error("Method not implemented.");
  }
  transform(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number
  ): void {
    throw new Error("Method not implemented.");
  }
  drawFocusIfNeeded(path: unknown, element?: unknown): void {
    throw new Error("Method not implemented.");
  }
}

import { Point } from "../models";

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
    _startAngle: number,
    _endAngle: number
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
    _image: unknown,
    _sx: unknown,
    _sy: unknown,
    _sw?: unknown,
    _sh?: unknown,
    _dx?: unknown,
    _dy?: unknown,
    _dw?: unknown,
    _dh?: unknown
  ): void {
    throw new Error("Method not implemented.");
  }
  clip(_path?: unknown, _fillRule?: unknown): void {
    throw new Error("Method not implemented.");
  }
  isPointInPath(
    _path: unknown,
    _x: unknown,
    _y?: unknown,
    _fillRule?: unknown
  ): boolean {
    throw new Error("Method not implemented.");
  }
  isPointInStroke(_path: unknown, _x: unknown, _y?: unknown): boolean {
    throw new Error("Method not implemented.");
  }
  fillStyle!: string | CanvasGradient | CanvasPattern;
  strokeStyle!: string | CanvasGradient | CanvasPattern;
  createConicGradient(
    _startAngle: number,
    _x: number,
    _y: number
  ): CanvasGradient {
    throw new Error("Method not implemented.");
  }
  createLinearGradient(
    _x0: number,
    _y0: number,
    _x1: number,
    _y1: number
  ): CanvasGradient {
    throw new Error("Method not implemented.");
  }
  createPattern(
    _image: CanvasImageSource,
    _repetition: string | null
  ): CanvasPattern | null {
    throw new Error("Method not implemented.");
  }
  createRadialGradient(
    _x0: number,
    _y0: number,
    _r0: number,
    _x1: number,
    _y1: number,
    _r1: number
  ): CanvasGradient {
    throw new Error("Method not implemented.");
  }
  filter!: string;
  createImageData(_sw: unknown, _sh?: unknown, _settings?: unknown): ImageData {
    throw new Error("Method not implemented.");
  }
  getImageData(
    _sx: number,
    _sy: number,
    _sw: number,
    _sh: number,
    _settings?: ImageDataSettings
  ): ImageData {
    throw new Error("Method not implemented.");
  }
  putImageData(
    _imagedata: unknown,
    _dx: unknown,
    _dy: unknown,
    _dirtyX?: unknown,
    _dirtyY?: unknown,
    _dirtyWidth?: unknown,
    _dirtyHeight?: unknown
  ): void {
    throw new Error("Method not implemented.");
  }
  imageSmoothingEnabled!: boolean;
  imageSmoothingQuality!: ImageSmoothingQuality;
  arcTo(_x1: number, _y1: number, _x2: number, _y2: number, _radius: number): void {
    throw new Error("Method not implemented.");
  }
  scale(_x: number, _y: number): void {
    throw new Error("Method not implemented.");
  }
  bezierCurveTo(
    _cp1x: number,
    _cp1y: number,
    _cp2x: number,
    _cp2y: number,
    _x: number,
    _y: number
  ): void {
    throw new Error("Method not implemented.");
  }
  ellipse(
    _x: number,
    _y: number,
    _radiusX: number,
    _radiusY: number,
    _rotation: number,
    _startAngle: number,
    _endAngle: number,
    _counterclockwise?: boolean
  ): void {
    throw new Error("Method not implemented.");
  }
  quadraticCurveTo(_cpx: number, _cpy: number, _x: number, _y: number): void {
    throw new Error("Method not implemented.");
  }
  roundRect(
    _x: unknown,
    _y: unknown,
    _w: unknown,
    _h: unknown,
    _radii?: unknown
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
  setLineDash(_segments: unknown): void {
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
  fillText(_text: string, _x: number, _y: number, _maxWidth?: number): void {
    throw new Error("Method not implemented.");
  }
  measureText(_text: string): TextMetrics {
    throw new Error("Method not implemented.");
  }
  strokeText(_text: string, _x: number, _y: number, _maxWidth?: number): void {
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
    _a?: unknown,
    _b?: unknown,
    _c?: unknown,
    _d?: unknown,
    _e?: unknown,
    _f?: unknown
  ): void {
    throw new Error("Method not implemented.");
  }
  transform(
    _a: number,
    _b: number,
    _c: number,
    _d: number,
    _e: number,
    _f: number
  ): void {
    throw new Error("Method not implemented.");
  }
  drawFocusIfNeeded(_path: unknown, _element?: unknown): void {
    throw new Error("Method not implemented.");
  }
}

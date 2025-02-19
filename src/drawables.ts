import { Point } from "./primitives";
import { GlobalSettings } from "./settings";

export interface Drawable {
  draw(ctx: CanvasRenderingContext2D, settings: GlobalSettings): void;
}

export class Circle implements Drawable {
  center: Point;
  radius: number;
  strokeWidth: number;
  fillColor: string | null;
  strokeColor: string;

  constructor(
    center: Point | null = null,
    radius: number = 1,
    strokeWidth: number = 1,
    fillColor: string | null = "#000",
    strokeColor: string = "#000"
  ) {
    this.center = center || new Point(0, 0);
    this.radius = radius;
    this.strokeWidth = strokeWidth;
    this.fillColor = fillColor;
    this.strokeColor = strokeColor;
  }

  setCenter(point: Point) {
    this.center = point;
  }

  setRadius(radius: number) {
    this.radius = radius;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.center.x, this.center.y, this.radius, 0, 2 * Math.PI);
    if (this.fillColor) {
      ctx.fillStyle = this.fillColor;
      ctx.fill();
    }
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.strokeWidth;
    ctx.stroke();
  }
}

export class Line implements Drawable {
  from: Point;
  to: Point;
  dashed: boolean;
  zigZagged: boolean;
  color: string;
  lineWidth: number;
  zigzagSpacing: number;
  oneZigZagLength: number;
  straightLengthWhenZigZag: number;
  lineRadians: number;
  lineLength: number;

  constructor(
    fromPoint: Point,
    toPoint: Point,
    zigZagged = false,
    color = "#000",
    lineWidth = 2,
    zigzagSpacing = 6, // 10 pixels between each zig zag "wave"
    oneZigZagLength = 4, // Length of one zig zag line - will in reality be doubled see below usage
    straightLengthWhenZigZag = 2 // Length of the first and last straight bit - so we do not zig zag all the line
  ) {
    this.from = fromPoint;
    this.to = toPoint;
    this.dashed = false;
    this.zigZagged = zigZagged;
    this.color = color;
    this.lineWidth = lineWidth;

    this.zigzagSpacing = zigzagSpacing;
    this.oneZigZagLength = oneZigZagLength;
    this.straightLengthWhenZigZag = straightLengthWhenZigZag;

    // Get the radian angle of the line
    this.lineRadians = Math.atan2(
      this.to.y - this.from.y,
      this.to.x - this.from.x
    );

    // Get the length of the line
    const a = this.from.x - this.to.x;
    const b = this.from.y - this.to.y;
    this.lineLength = Math.sqrt(a * a + b * b);
  }

  setFrom(point: Point) {
    this.from = point;
  }

  setTo(point: Point) {
    this.to = point;
  }

  getFrom() {
    return this.from;
  }

  getTo() {
    return this.to;
  }

  draw(ctx: CanvasRenderingContext2D, settings: GlobalSettings) {
    // handle PBC if needed
    var dx = this.to.x - this.from.x;
    var dy = this.to.y - this.from.y;
    const yPBC = Math.abs(dy) > 0.5001 * settings.canvasSize.y;
    const xPBC = Math.abs(dx) > 0.5001 * settings.canvasSize.x;
    if (yPBC || xPBC) {
      // rather than taking the long path, we apply periodic boundary conditions
      // and draw two lines to the boundary instead of the long path
      [
        new Line(
          new Point(this.from.x, this.from.y),
          new Point(
            this.to.x + settings.canvasSize.x * (xPBC ? (dx < 0 ? 1 : -1) : 0),
            this.to.y + settings.canvasSize.y * (yPBC ? (dy < 0 ? 1 : -1) : 0)
          ),
          this.zigZagged,
          this.color,
          this.lineWidth,
          this.zigzagSpacing,
          this.oneZigZagLength,
          this.straightLengthWhenZigZag
        ),
        new Line(
          new Point(this.to.x, this.to.y),
          new Point(
            this.from.x +
              settings.canvasSize.x * (xPBC ? (dx < 0 ? -1 : 1) : 0),
            this.from.y + settings.canvasSize.y * (yPBC ? (dy < 0 ? -1 : 1) : 0)
          ),
          this.zigZagged,
          this.color,
          this.lineWidth,
          this.zigzagSpacing,
          this.oneZigZagLength,
          this.straightLengthWhenZigZag
        ),
      ].forEach((line: Line) => line.draw(ctx, settings));
      return;
    }

    // no PBC -> draw the line

    if (this.dashed) {
      ctx.setLineDash([4, 2]);
    } else {
      ctx.setLineDash([]);
    }

    if (this.zigZagged) {
      this.drawZigZagged(ctx);
    } else {
      ctx.beginPath();
      ctx.moveTo(this.from.x, this.from.y);
      ctx.lineTo(this.to.x, this.to.y);
    }
    ctx.lineWidth = this.lineWidth;
    ctx.strokeStyle = this.color;
    ctx.stroke();
  }

  drawZigZagged(ctx: CanvasRenderingContext2D) {
    // Save the current drawing state
    ctx.save();

    // Begin the new path
    ctx.beginPath();

    //Set the new 0, 0
    ctx.translate(this.from.x, this.from.y);

    // Rotate the canvas so we can treat it like straight
    ctx.rotate(this.lineRadians);

    // Begin from 0, 0 (ie this.from.x, this.from.y)
    ctx.moveTo(0, 0);
    ctx.lineTo(this.straightLengthWhenZigZag, 0);
    let zx = this.straightLengthWhenZigZag;
    // Create zig zag lines
    for (let n = 0; zx < this.lineLength - this.straightLengthWhenZigZag; n++) {
      // The new zig zag x position
      zx = (n + 1) * this.zigzagSpacing;

      // The new zig zag y position - each and other time up and down
      const zy = n % 2 == 0 ? -this.oneZigZagLength : this.oneZigZagLength;

      // Draw the an actual line of the zig zag line
      ctx.lineTo(zx, zy);
    }
    // Back to the center vertically
    ctx.lineTo(this.lineLength - this.straightLengthWhenZigZag, 0);

    // Draw the last bit straight
    ctx.lineTo(this.lineLength, 0);

    // Restore the previous drawing state
    ctx.restore();
  }

  setDashed(enable: boolean) {
    this.dashed = enable;
  }

  setZigZagged(enable: boolean) {
    this.zigZagged = enable;
  }
}

export class Rectangle implements Drawable {
  topLeft: Point;
  width: number;
  height: number;
  strokeColor: string;
  lineWidth: number;
  fillColor: string | null;

  constructor(
    topLeft: Point | null = null,
    width: number = 100,
    height: number = 100,
    lineWidth: number = 2.0,
    strokeColor: string = "#000",
    fillColor: string | null = null
  ) {
    this.topLeft = topLeft || new Point(0, 0);
    this.width = width;
    this.height = height;
    this.strokeColor = strokeColor;
    this.lineWidth = lineWidth;
    this.fillColor = fillColor;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.rect(this.topLeft.x, this.topLeft.y, this.width, this.height);
    if (this.fillColor) {
      ctx.fillStyle = this.fillColor;
      ctx.fill();
    }
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.lineWidth;
    ctx.stroke();
  }
}

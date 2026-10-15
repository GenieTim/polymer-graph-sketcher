import { Point } from "../models/Point";
import { GlobalSettings } from "../utils/GlobalSettings";
import { Drawable } from "./Drawable";

/**
 * Represents a line with optional arrow heads at either or both ends.
 * Arrows are drawn with an offset if they share the same nodes as an edge,
 * and arrow heads don't overlap with node circles.
 */
export class ArrowLine implements Drawable {
  from: Point;
  to: Point;
  color: string;
  lineWidth: number;
  headAtStart: boolean;
  headAtEnd: boolean;
  /** Offset distance when drawing parallel to an edge */
  offset: number;
  /** Size of the arrow head */
  headSize: number;
  /** Radius of the nodes at the endpoints (to avoid overlapping) */
  nodeRadiusFrom: number;
  nodeRadiusTo: number;

  constructor(
    fromPoint: Point,
    toPoint: Point,
    color: string = "#000",
    lineWidth: number = 2,
    headAtStart: boolean = false,
    headAtEnd: boolean = true,
    offset: number = 0,
    nodeRadiusFrom: number = 5,
    nodeRadiusTo: number = 5
  ) {
    this.from = fromPoint;
    this.to = toPoint;
    this.color = color;
    this.lineWidth = lineWidth;
    this.headAtStart = headAtStart;
    this.headAtEnd = headAtEnd;
    this.offset = offset;
    this.headSize = Math.max(8, lineWidth * 3);
    this.nodeRadiusFrom = nodeRadiusFrom;
    this.nodeRadiusTo = nodeRadiusTo;
  }

  /**
   * Calculate the adjusted start and end points that don't overlap with node circles
   */
  private getAdjustedPoints(): { start: Point; end: Point } {
    // Direction vector from start to end
    const dx = this.to.x - this.from.x;
    const dy = this.to.y - this.from.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) {
      return { start: this.from, end: this.to };
    }

    // Unit vector
    const ux = dx / length;
    const uy = dy / length;

    // Apply offset perpendicular to the line direction
    let offsetX = 0;
    let offsetY = 0;
    if (this.offset !== 0) {
      // Perpendicular vector (rotate 90 degrees)
      offsetX = -uy * this.offset;
      offsetY = ux * this.offset;
    }

    // Shorten from both ends to account for node radius and arrow head
    const startMargin = this.nodeRadiusFrom + (this.headAtStart ? this.headSize : 0);
    const endMargin = this.nodeRadiusTo + (this.headAtEnd ? this.headSize : 0);

    const start = new Point(
      this.from.x + ux * startMargin + offsetX,
      this.from.y + uy * startMargin + offsetY
    );

    const end = new Point(
      this.to.x - ux * endMargin + offsetX,
      this.to.y - uy * endMargin + offsetY
    );

    return { start, end };
  }

  /**
   * Draw an arrow head at the specified point
   */
  private drawArrowHead(
    ctx: CanvasRenderingContext2D,
    point: Point,
    angle: number
  ): void {
    const headLength = this.headSize;
    const headAngle = Math.PI / 6; // 30 degrees

    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-headLength, -headLength * Math.tan(headAngle));
    ctx.lineTo(-headLength, headLength * Math.tan(headAngle));
    ctx.closePath();

    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.restore();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const settings = GlobalSettings.instance;

    // Handle periodic boundary conditions if needed
    const dx = this.to.x - this.from.x;
    const dy = this.to.y - this.from.y;
    const yPBC = Math.abs(dy) > 0.5001 * settings.canvasSize.y;
    const xPBC = Math.abs(dx) > 0.5001 * settings.canvasSize.x;

    if ((yPBC || xPBC) && !settings.disablePBC) {
      // Draw two arrows to the boundary
      [
        new ArrowLine(
          new Point(this.from.x, this.from.y),
          new Point(
            this.to.x + settings.canvasSize.x * (xPBC ? (dx < 0 ? 1 : -1) : 0),
            this.to.y + settings.canvasSize.y * (yPBC ? (dy < 0 ? 1 : -1) : 0)
          ),
          this.color,
          this.lineWidth,
          this.headAtStart,
          this.headAtEnd,
          this.offset,
          this.nodeRadiusFrom,
          this.nodeRadiusTo
        ),
        new ArrowLine(
          new Point(this.to.x, this.to.y),
          new Point(
            this.from.x +
              settings.canvasSize.x * (xPBC ? (dx < 0 ? -1 : 1) : 0),
            this.from.y + settings.canvasSize.y * (yPBC ? (dy < 0 ? -1 : 1) : 0)
          ),
          this.color,
          this.lineWidth,
          this.headAtEnd,
          this.headAtStart,
          this.offset,
          this.nodeRadiusTo,
          this.nodeRadiusFrom
        ),
      ].forEach((arrow) => arrow.draw(ctx));
      return;
    }

    // Get adjusted points that don't overlap with nodes
    const { start, end } = this.getAdjustedPoints();

    // Calculate angle of the line
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    // Draw the line
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Draw arrow heads
    if (this.headAtEnd) {
      this.drawArrowHead(ctx, end, angle);
    }

    if (this.headAtStart) {
      // Arrow head at start points in opposite direction
      this.drawArrowHead(ctx, start, angle + Math.PI);
    }
  }
}

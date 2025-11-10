import { Point } from "../models/Point";
import { GlobalSettings } from "../utils/GlobalSettings";
import { Line } from "./Line";

export class PartialLine extends Line {
  private progress: number; // 0 to 1, how much of the line to draw

  constructor(
    fromPoint: Point,
    toPoint: Point,
    progress: number = 1,
    zigZagged = false,
    color = "#000",
    lineWidth = 2,
    zigzagSpacing = 6,
    oneZigZagLength = 4,
    straightLengthWhenZigZag = 2
  ) {
    super(
      fromPoint,
      toPoint,
      zigZagged,
      color,
      lineWidth,
      zigzagSpacing,
      oneZigZagLength,
      straightLengthWhenZigZag
    );
    this.progress = Math.max(0, Math.min(1, progress));
  }

  setProgress(progress: number) {
    this.progress = Math.max(0, Math.min(1, progress));
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.progress === 0) return;
    if (this.progress === 1) {
      super.draw(ctx);
      return;
    }

    const settings = GlobalSettings.instance;
    // Handle PBC if needed
    var dx = this.to.x - this.from.x;
    var dy = this.to.y - this.from.y;
    const yPBC = Math.abs(dy) > 0.5001 * settings.canvasSize.y;
    const xPBC = Math.abs(dx) > 0.5001 * settings.canvasSize.x;
    
    if ((yPBC || xPBC) && !settings.disablePBC) {
      // For PBC, draw partial segments
      [
        new PartialLine(
          new Point(this.from.x, this.from.y),
          new Point(
            this.to.x + settings.canvasSize.x * (xPBC ? (dx < 0 ? 1 : -1) : 0),
            this.to.y + settings.canvasSize.y * (yPBC ? (dy < 0 ? 1 : -1) : 0)
          ),
          this.progress,
          this.zigZagged,
          this.color,
          this.lineWidth,
          this.zigzagSpacing,
          this.oneZigZagLength,
          this.straightLengthWhenZigZag
        ),
        new PartialLine(
          new Point(this.to.x, this.to.y),
          new Point(
            this.from.x + settings.canvasSize.x * (xPBC ? (dx < 0 ? -1 : 1) : 0),
            this.from.y + settings.canvasSize.y * (yPBC ? (dy < 0 ? -1 : 1) : 0)
          ),
          this.progress,
          this.zigZagged,
          this.color,
          this.lineWidth,
          this.zigzagSpacing,
          this.oneZigZagLength,
          this.straightLengthWhenZigZag
        ),
      ].forEach((line: PartialLine) => line.draw(ctx));
      return;
    }

    // Calculate partial endpoint
    const partialTo = new Point(
      this.from.x + (this.to.x - this.from.x) * this.progress,
      this.from.y + (this.to.y - this.from.y) * this.progress
    );

    if (this.dashed) {
      ctx.setLineDash([4, 2]);
    }

    ctx.lineCap = "round";
    ctx.lineWidth = this.lineWidth;
    ctx.strokeStyle = this.color;

    if (this.zigZagged) {
      this.drawPartialZigZagged(ctx, partialTo);
    } else {
      ctx.beginPath();
      ctx.moveTo(this.from.x, this.from.y);
      ctx.lineTo(partialTo.x, partialTo.y);
      ctx.stroke();
    }
  }

  private drawPartialZigZagged(ctx: CanvasRenderingContext2D, _partialTo: Point) {
    const partialLength = this.lineLength * this.progress;

    ctx.save();
    ctx.beginPath();
    ctx.translate(this.from.x, this.from.y);
    ctx.rotate(this.lineRadians);
    ctx.moveTo(0, 0);

    if (partialLength <= this.straightLengthWhenZigZag) {
      // Still in the initial straight section
      ctx.lineTo(partialLength, 0);
    } else if (partialLength >= this.lineLength - this.straightLengthWhenZigZag) {
      // Reached the final straight section
      ctx.lineTo(this.straightLengthWhenZigZag, 0);
      let zx = this.straightLengthWhenZigZag;
      for (let n = 0; zx < this.lineLength - this.straightLengthWhenZigZag; n++) {
        zx = (n + 1) * this.zigzagSpacing;
        const zy = n % 2 == 0 ? -this.oneZigZagLength : this.oneZigZagLength;
        ctx.lineTo(zx, zy);
      }
      ctx.lineTo(this.lineLength - this.straightLengthWhenZigZag, 0);
      ctx.lineTo(partialLength, 0);
    } else {
      // In the zigzag section
      ctx.lineTo(this.straightLengthWhenZigZag, 0);
      let zx = this.straightLengthWhenZigZag;
      for (let n = 0; zx < partialLength; n++) {
        zx = (n + 1) * this.zigzagSpacing;
        if (zx >= partialLength) {
          // Interpolate the last partial segment
          const prevZx = n * this.zigzagSpacing;
          const prevZy = (n - 1) % 2 == 0 ? -this.oneZigZagLength : this.oneZigZagLength;
          const targetZy = n % 2 == 0 ? -this.oneZigZagLength : this.oneZigZagLength;
          const segmentProgress = (partialLength - prevZx) / this.zigzagSpacing;
          const partialZy = prevZy + (targetZy - prevZy) * segmentProgress;
          ctx.lineTo(partialLength, partialZy);
          break;
        }
        const zy = n % 2 == 0 ? -this.oneZigZagLength : this.oneZigZagLength;
        ctx.lineTo(zx, zy);
      }
    }

    ctx.stroke();
    ctx.restore();
  }
}

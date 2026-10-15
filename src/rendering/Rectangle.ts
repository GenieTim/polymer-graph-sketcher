import { Point } from "../models/Point";
import { Drawable } from "./Drawable";

export class Rectangle implements Drawable {
  topLeft: Point;
  width: number;
  height: number;
  strokeColor: string;
  lineWidth: number;
  fillColor: string | null;
  dashed: boolean;

  constructor(
    topLeft: Point | null = null,
    width: number = 100,
    height: number = 100,
    lineWidth: number = 2.0,
    strokeColor: string = "#000",
    fillColor: string | null = null,
    dashed: boolean = false
  ) {
    this.topLeft = topLeft || new Point(0, 0);
    this.width = width;
    this.height = height;
    this.strokeColor = strokeColor;
    this.lineWidth = lineWidth;
    this.fillColor = fillColor;
    this.dashed = dashed;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    
    if (this.dashed) {
      ctx.setLineDash([5, 5]);
    }
    
    ctx.beginPath();
    ctx.rect(this.topLeft.x, this.topLeft.y, this.width, this.height);
    
    if (this.fillColor) {
      ctx.fillStyle = this.fillColor;
    } else {
      ctx.fillStyle = "transparent";
    }
    ctx.fill();
    
    ctx.lineWidth = this.lineWidth;
    if (this.strokeColor) {
      ctx.strokeStyle = this.strokeColor;
      ctx.stroke();
    }
    
    ctx.restore();
  }
}

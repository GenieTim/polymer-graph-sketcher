import { Point } from "../models/Point";
import { Drawable } from "./Drawable";

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

import { Point } from "./primitives";


export class GlobalSettings {
  isScaled: boolean = false;
  canvasSize: Point;
  backgroundColor: string;
  imageScaleFactor: number;

  constructor(
    canvasSize: Point = new Point(825, 445),
    backgroundColor: string = "#FFFFFF",
    imageScaleFactor: number = 10
  ) {
    this.canvasSize = canvasSize;
    this.backgroundColor = backgroundColor;
    this.imageScaleFactor = imageScaleFactor;
  }
}

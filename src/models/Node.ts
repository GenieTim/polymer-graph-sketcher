import { Point } from "./Point";

// Forward declaration - will be properly imported when services are fully organized
export interface Selectable {}

export class Node implements Selectable {
  id: number;
  coordinates: Point;
  radius: number;
  strokeWidth: number;
  fillColor: string;
  strokeColor: string;

  constructor(
    id: number,
    coordinates: Point,
    radius: number = 5,
    strokeWidth: number = 1,
    fillColor: string = "#000",
    strokeColor: string = "#000"
  ) {
    // validate that `id` is integer
    if (typeof id !== "number" || !Number.isInteger(id) || id < 0) {
      throw new Error(
        "Invalid `id` parameter. It must be a non-negative integer, got `" +
          id +
          "`."
      );
    }

    this.id = id;
    this.coordinates = coordinates;
    this.radius = radius;
    this.strokeWidth = strokeWidth;
    this.fillColor = fillColor;
    this.strokeColor = strokeColor;
  }
}

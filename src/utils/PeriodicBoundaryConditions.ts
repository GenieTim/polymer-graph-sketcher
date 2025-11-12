import { Point, Vector2d } from "../models";
import { GlobalSettings } from "./GlobalSettings";

/**
 * Utility functions for Periodic Boundary Conditions (PBC)
 */

/**
 * Apply periodic boundary conditions to a distance vector
 * Adjusts the vector to use the shortest path across boundaries
 * 
 * @param distance - The distance vector to adjust
 * @param boxHalf - Half of the box size (width/2, height/2)
 * @returns The adjusted distance vector
 */
export function applyPBC(distance: Vector2d, boxHalf: Vector2d): Vector2d {
  const result = new Vector2d(distance.x, distance.y);
  
  // Adjust x coordinate
  while (result.x > boxHalf.x) {
    result.x -= boxHalf.x * 2;
  }
  while (result.x < -boxHalf.x) {
    result.x += boxHalf.x * 2;
  }
  
  // Adjust y coordinate
  while (result.y > boxHalf.y) {
    result.y -= boxHalf.y * 2;
  }
  while (result.y < -boxHalf.y) {
    result.y += boxHalf.y * 2;
  }
  
  return result;
}

/**
 * Move a point back into the box boundaries using periodic wrapping
 * 
 * @param point - The point to move
 * @param boxSize - The size of the box
 * @returns The wrapped point
 */
export function moveIntoBox(point: Point, boxSize: Vector2d): Point {
  const result = new Point(point.x, point.y);
  
  while (result.x < 0) {
    result.x += boxSize.x;
  }
  while (result.x > boxSize.x) {
    result.x -= boxSize.x;
  }
  while (result.y < 0) {
    result.y += boxSize.y;
  }
  while (result.y > boxSize.y) {
    result.y -= boxSize.y;
  }
  
  return result;
}

/**
 * Calculate the shortest displacement between two positions considering PBC
 * Returns the displacement that may cross boundaries
 * 
 * @param start - Starting position
 * @param end - Ending position
 * @param boxSize - The size of the box
 * @returns The shortest displacement vector
 */
export function getShortestDisplacement(
  start: Point,
  end: Point,
  boxSize: Vector2d
): { dx: number; dy: number } {
  let dx = end.x - start.x;
  let dy = end.y - start.y;
  
  // Check if wrapping around is shorter for x
  if (Math.abs(dx) > boxSize.x / 2) {
    if (dx > 0) {
      dx -= boxSize.x;
    } else {
      dx += boxSize.x;
    }
  }
  
  // Check if wrapping around is shorter for y
  if (Math.abs(dy) > boxSize.y / 2) {
    if (dy > 0) {
      dy -= boxSize.y;
    } else {
      dy += boxSize.y;
    }
  }
  
  return { dx, dy };
}

/**
 * Interpolate between two positions considering PBC
 * 
 * @param start - Starting position
 * @param end - Ending position
 * @param progress - Progress from 0 to 1
 * @param boxSize - The size of the box
 * @returns The interpolated position, wrapped into the box
 */
export function interpolateWithPBC(
  start: Point,
  end: Point,
  progress: number,
  boxSize: Vector2d
): Point {
  // Get shortest displacement
  const { dx, dy } = getShortestDisplacement(start, end, boxSize);
  
  // Interpolate using the shortest displacement
  const interpolated = new Point(
    start.x + dx * progress,
    start.y + dy * progress
  );
  
  // Wrap coordinates back into the box
  return moveIntoBox(interpolated, boxSize);
}

/**
 * Get the current box size from global settings
 */
export function getBoxSize(): Vector2d {
  return new Vector2d(
    GlobalSettings.instance.canvasSize.x,
    GlobalSettings.instance.canvasSize.y
  );
}

/**
 * Get half of the current box size from global settings
 */
export function getBoxHalf(): Vector2d {
  return getBoxSize().multiply(0.5);
}

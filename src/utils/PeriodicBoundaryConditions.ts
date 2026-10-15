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
 * Cubic Hermite spline interpolation with PBC
 * Uses the four-point method (Catmull-Rom style tangents)
 * 
 * @param p0 - Previous position (for tangent calculation)
 * @param p1 - Start position
 * @param p2 - End position
 * @param p3 - Next position (for tangent calculation)
 * @param progress - Progress from 0 to 1 (between p1 and p2)
 * @param boxSize - The size of the box
 * @returns The interpolated position, wrapped into the box
 */
export function interpolateCubicWithPBC(
  p0: Point | null,
  p1: Point,
  p2: Point,
  p3: Point | null,
  progress: number,
  boxSize: Vector2d
): Point {
  // If we don't have enough points for cubic interpolation, fall back to linear
  if (p0 === null && p3 === null) {
    return interpolateWithPBC(p1, p2, progress, boxSize);
  }
  
  // Calculate displacements considering PBC
  const d01 = p0 ? getShortestDisplacement(p0, p1, boxSize) : { dx: 0, dy: 0 };
  const d12 = getShortestDisplacement(p1, p2, boxSize);
  const d23 = p3 ? getShortestDisplacement(p2, p3, boxSize) : { dx: 0, dy: 0 };
  
  // Calculate tangents at p1 and p2 using Catmull-Rom method
  // m1 = (p2 - p0) / 2
  // m2 = (p3 - p1) / 2
  const m1x = p0 ? (d01.dx + d12.dx) / 2 : d12.dx;
  const m1y = p0 ? (d01.dy + d12.dy) / 2 : d12.dy;
  const m2x = p3 ? (d12.dx + d23.dx) / 2 : d12.dx;
  const m2y = p3 ? (d12.dy + d23.dy) / 2 : d12.dy;
  
  // Hermite basis functions
  const t = progress;
  const t2 = t * t;
  const t3 = t2 * t;
  
  const h00 = 2 * t3 - 3 * t2 + 1;  // (2t³ - 3t² + 1)
  const h10 = t3 - 2 * t2 + t;      // (t³ - 2t² + t)
  const h01 = -2 * t3 + 3 * t2;     // (-2t³ + 3t²)
  const h11 = t3 - t2;              // (t³ - t²)
  
  // Interpolate in displacement space
  const interpX = h00 * 0 + h10 * m1x + h01 * d12.dx + h11 * m2x;
  const interpY = h00 * 0 + h10 * m1y + h01 * d12.dy + h11 * m2y;
  
  // Add to start position
  const interpolated = new Point(
    p1.x + interpX,
    p1.y + interpY
  );
  
  // Wrap coordinates back into the box
  return moveIntoBox(interpolated, boxSize);
}

/**
 * Catmull-Rom spline interpolation with PBC
 * This is a special case of cubic interpolation with specific tension
 * 
 * @param p0 - Previous position (for tangent calculation)
 * @param p1 - Start position
 * @param p2 - End position
 * @param p3 - Next position (for tangent calculation)
 * @param progress - Progress from 0 to 1 (between p1 and p2)
 * @param boxSize - The size of the box
 * @returns The interpolated position, wrapped into the box
 */
export function interpolateCatmullRomWithPBC(
  p0: Point | null,
  p1: Point,
  p2: Point,
  p3: Point | null,
  progress: number,
  boxSize: Vector2d
): Point {
  // If we don't have enough points for Catmull-Rom, fall back to linear
  if (p0 === null && p3 === null) {
    return interpolateWithPBC(p1, p2, progress, boxSize);
  }
  
  // Calculate displacements considering PBC
  const d01 = p0 ? getShortestDisplacement(p0, p1, boxSize) : { dx: 0, dy: 0 };
  const d12 = getShortestDisplacement(p1, p2, boxSize);
  const d23 = p3 ? getShortestDisplacement(p2, p3, boxSize) : { dx: 0, dy: 0 };
  
  // For Catmull-Rom, we work in a coordinate system where p1 is at origin
  // and interpolate between there and p1 + d12
  
  // Calculate control points in displacement space
  // p0_rel, p1_rel (0,0), p2_rel, p3_rel
  const p0_rel = p0 ? { x: -d01.dx, y: -d01.dy } : { x: -d12.dx, y: -d12.dy };
  const p1_rel = { x: 0, y: 0 };
  const p2_rel = { x: d12.dx, y: d12.dy };
  const p3_rel = p3 ? { x: d12.dx + d23.dx, y: d12.dy + d23.dy } : { x: 2 * d12.dx, y: 2 * d12.dy };
  
  // Catmull-Rom matrix coefficients
  const t = progress;
  const t2 = t * t;
  const t3 = t2 * t;
  
  // Catmull-Rom basis: 0.5 * [
  //   (-t³ + 2t² - t)p0 + (3t³ - 5t² + 2)p1 + (-3t³ + 4t² + t)p2 + (t³ - t²)p3
  // ]
  const a0 = -t3 + 2 * t2 - t;
  const a1 = 3 * t3 - 5 * t2 + 2;
  const a2 = -3 * t3 + 4 * t2 + t;
  const a3 = t3 - t2;
  
  const interpX = 0.5 * (a0 * p0_rel.x + a1 * p1_rel.x + a2 * p2_rel.x + a3 * p3_rel.x);
  const interpY = 0.5 * (a0 * p0_rel.y + a1 * p1_rel.y + a2 * p2_rel.y + a3 * p3_rel.y);
  
  // Add to start position
  const interpolated = new Point(
    p1.x + interpX,
    p1.y + interpY
  );
  
  // Wrap coordinates back into the box
  return moveIntoBox(interpolated, boxSize);
}

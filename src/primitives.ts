export class Point {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

export class Vector2d extends Point {
  constructor(p: Point | number, y?: number) {
    if (p instanceof Point) {
      super(p.x, p.y);
      this.x = p.x;
      this.y = p.y;
    } else {
      super(p, y!);
      this.x = p;
      this.y = y!;
    }
  }

  add(other: Vector2d): Vector2d {
    return new Vector2d(this.x + other.x, this.y + other.y);
  }

  subtract(other: Vector2d): Vector2d {
    return new Vector2d(this.x - other.x, this.y - other.y);
  }

  multiply(scalar: number): Vector2d {
    return new Vector2d(this.x * scalar, this.y * scalar);
  }

  toString(): string {
    return `(${this.x}, ${this.y})`;
  }
}

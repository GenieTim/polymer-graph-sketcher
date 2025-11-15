/**
 * Represents an arrow connecting two nodes in the graph.
 * Arrows are directional and can have heads at either or both ends.
 */
export class Arrow {
  fromId: number;
  toId: number;
  color: string;
  width: number;
  id: number;
  /** Whether to show arrow head at the start (from) end */
  headAtStart: boolean;
  /** Whether to show arrow head at the end (to) end */
  headAtEnd: boolean;

  constructor(
    fromId: number,
    toId: number,
    id: number,
    color: string = "#000",
    width: number = 2,
    headAtStart: boolean = false,
    headAtEnd: boolean = true
  ) {
    this.fromId = fromId;
    this.toId = toId;
    this.id = id;
    this.color = color;
    this.width = width;
    this.headAtStart = headAtStart;
    this.headAtEnd = headAtEnd;
  }

  /**
   * Get the ID of the other node connected by this arrow
   */
  getOtherNodeId(nodeId: number): number {
    return this.fromId === nodeId ? this.toId : this.fromId;
  }

  /**
   * Check if this arrow connects the same two nodes as another arrow
   */
  connectsSameNodes(other: Arrow): boolean {
    return (
      (this.fromId === other.fromId && this.toId === other.toId) ||
      (this.fromId === other.toId && this.toId === other.fromId)
    );
  }
}

export class Edge {
  fromId: number;
  toId: number;
  weight: number;
  color: string;
  id: number;

  constructor(
    fromId: number,
    toId: number,
    id: number,
    weight: number = 1,
    color: string = "#000"
  ) {
    this.fromId = fromId;
    this.toId = toId;
    this.id = id;
    this.weight = weight;
    this.color = color;
  }

  getOtherNodeId(nodeId: number): number {
    return this.fromId === nodeId ? this.toId : this.fromId;
  }
}

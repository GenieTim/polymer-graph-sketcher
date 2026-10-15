import { Container } from "../core/Container";
import { Graph, Node } from "../models";
import { ActionManager } from "../actions";
import { SelectionService } from "./SelectionService";
import { Application } from "../core/Application";
import { collapseEdgesByColor, removeTwofunctionalNodes } from "../topology";
import type { UIFacade } from "../facades/UIFacade";

/**
 * Service for graph manipulation operations
 * Handles topology operations like side chain generation, node removal, etc.
 */
export class GraphOperationsService {
  private container: Container;

  constructor(container: Container) {
    this.container = container;
  }

  /**
   * Generate side chains on selected nodes
   */
  generateSideChains(
    sideChainLength: number,
    sideChainProbability: number,
    sideChainLengthRandomness: number,
    sideChainAngleRandomness: number
  ): void {
    const selection = this.container.get<SelectionService>("selection");
    const graph = this.container.get<Graph>("graph");
    const actionManager = this.container.get<ActionManager>("actionManager");
    const nodeCounter = this.container.get<{ value: number }>("nodeCounter");
    const uiFacade = this.container.get<UIFacade>("ui");

    const selectedNodes = selection.getItemsOfClass(Node);

    selectedNodes.forEach((node: Node) => {
      const edges = graph.getEdgesInvolvingNode(node.id);
      if (edges.length !== 2) {
        return;
      }

      const connectedNode1 = graph.getNode(edges[0].getOtherNodeId(node.id));
      const connectedNode2 = graph.getNode(edges[1].getOtherNodeId(node.id));

      if (!connectedNode1 || !connectedNode2) {
        return;
      }

      // Calculate the direction vector of the main chain
      const dirX = connectedNode2.coordinates.x - connectedNode1.coordinates.x;
      const dirY = connectedNode2.coordinates.y - connectedNode1.coordinates.y;
      const length = Math.sqrt(dirX * dirX + dirY * dirY);
      const normalizedDirX = dirX / length;
      const normalizedDirY = dirY / length;

      // Calculate perpendicular vectors
      const perpDirX1 = -normalizedDirY;
      const perpDirY1 = normalizedDirX;
      const perpDirX2 = normalizedDirY;
      const perpDirY2 = -normalizedDirX;

      // Determine number of side chains
      const numSideChains = Math.floor(sideChainProbability);
      const remainingProb = sideChainProbability - numSideChains;
      const totalChains =
        numSideChains + (Math.random() < remainingProb ? 1 : 0);

      let firstDirection = Math.random() < 0.5;

      const AddNodeAction = this.container.get<any>("AddNodeAction");
      const AddEdgeAction = this.container.get<any>("AddEdgeAction");

      for (let i = 0; i < totalChains; i++) {
        firstDirection = !firstDirection;
        const perpDirX = firstDirection ? perpDirX1 : perpDirX2;
        const perpDirY = firstDirection ? perpDirY1 : perpDirY2;

        // Add random angle variation
        const angleVariation = Math.PI * sideChainAngleRandomness;
        const randomAngle = (Math.random() * 2 - 1) * angleVariation;
        const cosAngle = Math.cos(randomAngle);
        const sinAngle = Math.sin(randomAngle);
        const finalDirX = perpDirX * cosAngle - perpDirY * sinAngle;
        const finalDirY = perpDirX * sinAngle + perpDirY * cosAngle;

        // Calculate position of new node
        const newNodeX =
          node.coordinates.x +
          finalDirX *
            sideChainLength *
            (1 - sideChainLengthRandomness * Math.random());
        const newNodeY =
          node.coordinates.y +
          finalDirY *
            sideChainLength *
            (1 - sideChainLengthRandomness * Math.random());

        const newNodeId = nodeCounter.value++;
        const newNode = new Node(
          newNodeId,
          { x: newNodeX, y: newNodeY },
          node.radius,
          node.strokeWidth,
          node.fillColor,
          node.strokeColor
        );

        actionManager.addAction(
          new AddNodeAction(newNodeId, { x: newNodeX, y: newNodeY }, uiFacade)
        );
        actionManager.addAction(new AddEdgeAction(node, [newNode], uiFacade));
      }
    });
  }

  /**
   * Remove bifunctional (2-connected) nodes
   */
  removeBifunctionalNodes(): void {
    const app = this.container.get<Application>("app");

    removeTwofunctionalNodes();
    app.render();
  }

  /**
   * Merge/collapse edges by color
   */
  mergeEdgesByColor(color: string): void {
    const app = this.container.get<Application>("app");

    collapseEdgesByColor(color);
    app.render();
  }

  /**
   * Remove duplicate edges from the graph
   */
  removeDuplicateEdges(): void {
    const graph = this.container.get<Graph>("graph");
    const app = this.container.get<Application>("app");

    graph.removeDuplicateEdges();
    app.render();
  }

  /**
   * Remove self-edges from the graph
   */
  removeSelfEdges(): void {
    const graph = this.container.get<Graph>("graph");
    const app = this.container.get<Application>("app");

    graph.cleanupEdges();
    app.render();
  }

  /**
   * Clear the entire graph
   */
  clearGraph(): void {
    const graph = this.container.get<Graph>("graph");
    const selection = this.container.get<SelectionService>("selection");
    const modeFactory = this.container.get<any>("modeFactory");
    const app = this.container.get<Application>("app");

    graph.clear();
    selection.clearSelection();
    modeFactory.setCurrentMode("vertex");
    app.render();
  }
}

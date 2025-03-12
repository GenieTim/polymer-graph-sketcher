import { Edge, Node, graph } from "./graph";
import { Point } from "./primitives";
import { Selectable, selection } from "./selection";
/**
 * The interface for actions that can be performed, and undone
 */
export interface Action {
  do(): void;
  undo(): void;
}

/**
 * The ActionManager class manages a stack of actions and provides methods to add, undo, and redo actions.
 */
export class ActionManager {
  private doneStack: Action[] = [];
  private undoneStack: Action[] = [];

  private afterActionCallback: () => void;

  constructor(afterActionCallback: () => void) {
    this.afterActionCallback = afterActionCallback;
  }

  addAction(action: Action): void {
    this.doneStack.push(action);
    action.do();
    this.undoneStack = [];
    this.afterActionCallback();
  }

  undo(): void {
    // console.log("Undoing action");
    if (this.doneStack.length) {
      const action: Action = this.doneStack.pop() as Action;
      action.undo();
      this.undoneStack.push(action);
      this.afterActionCallback();
    }
  }

  redo(): void {
    // console.log("Redoing action");
    if (this.undoneStack.length) {
      const action: Action = this.undoneStack.pop() as Action;
      action.do();
      this.doneStack.push(action);
      this.afterActionCallback();
    }
  }
}

/**
 * Specific & Abstract Actions
 */

export class NodePropertyUpdateAction<K extends keyof Node> implements Action {
  private affectedNodes: Node[];
  private originalValues: Node[K][];
  private targetValue: Node[K];
  private property: K;

  constructor(affectedNodes: Node[], targetValue: Node[K], property: K) {
    this.affectedNodes = affectedNodes;
    this.originalValues = affectedNodes.map((node) => node[property]);
    this.targetValue = targetValue;
    this.property = property;
  }

  do() {
    this.affectedNodes.forEach((node, index) => {
      node[this.property] = this.targetValue;
    });
  }

  undo() {
    this.affectedNodes.forEach((node, index) => {
      node[this.property] = this.originalValues[index];
    });
  }
}

export class AddNodeAction implements Action {
  constructor(
    private nodeId: number,
    private position: Point
  ) {}

  do() {
    graph.setNode(
      new Node(
        this.nodeId,
        this.position,
        parseFloat(
          (document.getElementById("vertexRadius") as HTMLInputElement).value
        ),
        parseFloat(
          (document.getElementById("vertexStrokeWidth") as HTMLInputElement)
            .value
        ),
        (document.getElementById("nodeFillColor") as HTMLInputElement).value,
        (document.getElementById("nodeColor") as HTMLInputElement).value
      )
    );
    selection.setItem(graph.getNode(this.nodeId));
  }

  undo() {
    graph.deleteNode(this.nodeId);
  }
}

export class DeleteNodesAction implements Action {
  private affectedEdges: Edge[] = [];

  constructor(private affectedNodes: Node[]) {}

  do() {
    this.affectedNodes.forEach((node) => {
      graph.getEdgesInvolvingNode(node.id).forEach((edge) => {
        this.affectedEdges.push(edge);
      });
      selection.removeItem(node);
      graph.deleteNode(node.id);
    });
  }

  undo() {
    this.affectedNodes.forEach((node) => {
      graph.setNode(node);
      selection.addItem(node);
    });
    this.affectedEdges.forEach((edge) => {
      graph.addEdge(edge.fromId, edge.toId, edge.color, edge.weight);
    });
  }
}

export class SelectNodesAction implements Action {
  private previousSelectedNodes: Selectable[] = selection.getSelectedItems();

  constructor(
    private affectedNodes: Node[],
    private clearSelection = false
  ) {}

  do(): void {
    if (this.clearSelection) {
      selection.setSelectedItems(this.affectedNodes);
    } else {
      this.affectedNodes.forEach((node) => {
        selection.addItem(node);
      });
    }
  }

  undo(): void {
    selection.setSelectedItems(this.previousSelectedNodes);
  }
}

export class UnselectNodesAction implements Action {
  private previousSelectedNodes: Selectable[] = selection.getSelectedItems();

  constructor(private affectedNodes: Node[]) {
    this.affectedNodes.forEach((node) => {
      if (!this.previousSelectedNodes.includes(node)) {
        console.warn("Trying to unselect a node that is not selected");
      }
    });
    console.log("Unselecting nodes:", this.affectedNodes);
  }
  do(): void {
    selection.setSelectedItems(
      this.previousSelectedNodes.filter(
        (node) => !(node instanceof Node && this.affectedNodes.includes(node))
      )
    );
  }
  undo(): void {
    selection.setSelectedItems(this.previousSelectedNodes);
  }
}

export class SelectAllNodesAction implements Action {
  constructor(
    private previousSelectedNodes: Node[] = selection.getItemsOfClass(Node)
  ) {}

  do() {
    selection.setSelectedItems(graph.getAllNodes());
  }

  undo() {
    selection.setSelectedItems(this.previousSelectedNodes);
  }
}

export class ClearSelectionAction implements Action {
  constructor(
    private previousSelectedNodes: Selectable[] = selection.getSelectedItems()
  ) {}

  do() {
    selection.clearSelection();
  }

  undo() {
    selection.setSelectedItems(this.previousSelectedNodes);
  }
}

export class AddEdgeAction implements Action {
  private edgeIds: number[] = [];

  constructor(
    private fromNode: Node,
    private affectedNodes: Node[]
  ) {}

  do() {
    this.affectedNodes.forEach((node) => {
      this.edgeIds.push(
        graph.addEdge(
          this.fromNode.id,
          node.id,
          (document.getElementById("edgeColor") as HTMLInputElement).value,
          parseFloat(
            (document.getElementById("lineWidth") as HTMLInputElement).value
          )
        )
      );
    });
    if (this.affectedNodes.length <= 1) {
      selection.setItem(this.fromNode);
    }
  }

  undo() {
    this.edgeIds
      .slice()
      .reverse()
      .forEach((edgeId) => {
        graph.deleteEdge(edgeId);
      });
    selection.setSelectedItems(this.affectedNodes);
  }
}

export class DeleteEdgesAction implements Action {
  private edges: Edge[] = [];

  constructor(
    affectedNodes: Node[],
    private additionalNode: Node | null
  ) {
    if (additionalNode) {
      affectedNodes.push(additionalNode);
    }
    this.edges = graph.getEdgesInvolvingNodes(
      affectedNodes.map((node) => node.id)
    );
  }

  do() {
    this.edges.forEach((edge) => {
      graph.deleteEdge(edge);
    });
    if (this.additionalNode) {
      selection.addItem(this.additionalNode);
    }
  }

  undo() {
    this.edges.forEach((edge) => {
      graph.addEdge(edge.fromId, edge.toId, edge.color, edge.weight);
    });
    if (this.additionalNode) {
      selection.removeItem(this.additionalNode);
    }
  }
}

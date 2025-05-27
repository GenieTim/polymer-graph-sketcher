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
 * It maintains two stacks: one for completed actions that can be undone, and another for undone actions
 * that can be redone.
 */
export class ActionManager {
  /** Stack of actions that have been performed and can be undone */
  private doneStack: Action[] = [];

  /** Stack of actions that have been undone and can be redone */
  private undoneStack: Action[] = [];

  /** Callback function that is called after any action is performed, undone, or redone */
  private afterActionCallback: () => void;

  /**
   * Creates a new ActionManager instance.
   *
   * @param afterActionCallback - A callback function that will be invoked after any action
   *                             is performed, undone, or redone. Typically used to update the UI
   *                             or application state after an action completes.
   */
  constructor(afterActionCallback: () => void) {
    this.afterActionCallback = afterActionCallback;
  }

  /**
   * Adds a new action to the manager and immediately executes it.
   * This method also clears the undo stack, as adding a new action
   * creates a new branch in the action history.
   *
   * @param action - The action to add and execute
   */
  addAction(action: Action): void {
    this.doneStack.push(action);
    action.do();
    this.undoneStack = [];
    this.afterActionCallback();
  }

  /**
   * Undoes the most recent action in the done stack.
   * The undone action is moved to the undone stack so it can be redone if needed.
   * If the done stack is empty, this method does nothing.
   */
  undo(): void {
    // console.log("Undoing action");
    if (this.doneStack.length) {
      const action: Action = this.doneStack.pop() as Action;
      action.undo();
      this.undoneStack.push(action);
      this.afterActionCallback();
    }
  }

  /**
   * Redoes the most recently undone action.
   * The redone action is moved back to the done stack.
   * If the undone stack is empty, this method does nothing.
   */
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

/**
 * Action that handles updating a specific property for multiple nodes simultaneously.
 * This action tracks the original values of the property for each node to enable undoing.
 *
 * @typeParam K - The key of the Node property being updated
 */
export class NodePropertyUpdateAction<K extends keyof Node> implements Action {
  private affectedNodes: Node[];
  private originalValues: Node[K][];
  private targetValue: Node[K];
  private property: K;

  /**
   * Creates a new NodePropertyUpdateAction.
   *
   * @param affectedNodes - The nodes whose property will be updated
   * @param targetValue - The new value to set for the specified property
   * @param property - The property key to update on each node
   */
  constructor(affectedNodes: Node[], targetValue: Node[K], property: K) {
    this.affectedNodes = affectedNodes;
    this.originalValues = affectedNodes.map((node) => node[property]);
    this.targetValue = targetValue;
    this.property = property;
  }

  /**
   * Performs the property update by setting the specified property
   * to the target value for all affected nodes.
   */
  do() {
    this.affectedNodes.forEach((node) => {
      node[this.property] = this.targetValue;
    });
  }

  /**
   * Undoes the property update by restoring each node's original
   * property value from before the action was performed.
   */
  undo() {
    this.affectedNodes.forEach((node, index) => {
      node[this.property] = this.originalValues[index];
    });
  }
}

/**
 * Action that handles the addition of multiple nodes to the graph.
 * This action creates new nodes with the specified properties and selects them after creation.
 */
export class AddNodesAction implements Action {
  /**
   * Creates a new AddNodesAction.
   *
   * @param nodes - An array of Node objects to be added to the graph
   */
  constructor(private nodes: Node[]) {}

  /**
   * Performs the node addition by:
   * 1. Creating new nodes in the graph with properties from the provided nodes
   * 2. Selecting all the newly created nodes
   */
  do() {
    this.nodes.forEach((node) => {
      graph.setNode(
        new Node(
          node.id,
          node.coordinates,
          node.radius,
          node.strokeWidth,
          node.fillColor,
          node.strokeColor
        )
      );
    });
    selection.setSelectedItems(
      this.nodes.map((node) => {
        return graph.getNode(node.id);
      })
    );
  }

  /**
   * Undoes the node addition by removing all added nodes from the graph.
   */
  undo() {
    this.nodes.forEach((node) => {
      graph.deleteNode(node.id);
    });
  }
}

/**
 * Action that handles the addition of a single node to the graph.
 * This action creates a new node at the specified position with styling properties
 * retrieved from the UI elements, and selects the newly created node.
 */
export class AddNodeAction implements Action {
  /**
   * Creates a new AddNodeAction.
   *
   * @param nodeId - The unique identifier for the new node
   * @param position - The coordinates where the node should be placed
   */
  constructor(
    private nodeId: number,
    private position: Point
  ) {}

  /**
   * Performs the node addition by:
   * 1. Creating a new node with the specified ID and position
   * 2. Applying styling properties from the UI input elements
   * 3. Adding the node to the graph
   * 4. Selecting the newly created node
   */
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

  /**
   * Undoes the node addition by removing the node from the graph.
   */
  undo() {
    graph.deleteNode(this.nodeId);
  }
}

/**
 * Action that handles the deletion of nodes from the graph.
 * When nodes are deleted, any edges connected to those nodes are also removed.
 * This action tracks both the deleted nodes and their connected edges to enable undoing.
 */
export class DeleteNodesAction implements Action {
  /**
   * Stores the edges that are removed as a result of deleting the nodes.
   * These edges are needed for the undo operation.
   */
  private affectedEdges: Edge[] = [];

  /**
   * Creates a new DeleteNodesAction.
   *
   * @param affectedNodes - The nodes to be deleted from the graph
   */
  constructor(private affectedNodes: Node[]) {}

  /**
   * Performs the node deletion by:
   * 1. Collecting all edges connected to the nodes being deleted
   * 2. Removing the nodes from the current selection
   * 3. Deleting the nodes from the graph
   */
  do() {
    this.affectedNodes.forEach((node) => {
      graph.getEdgesInvolvingNode(node.id).forEach((edge) => {
        this.affectedEdges.push(edge);
      });
      selection.removeItem(node);
      graph.deleteNode(node.id);
    });
  }

  /**
   * Restores the previously deleted nodes and their connected edges by:
   * 1. Re-adding the deleted nodes to the graph
   * 2. Adding the nodes back to the selection
   * 3. Re-creating all edges that were connected to the deleted nodes
   */
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

/**
 * Action that selects one or more nodes in the graph.
 * This action can either add nodes to the current selection or replace the current selection entirely.
 */
export class SelectNodesAction implements Action {
  /**
   * Stores the previously selected items to enable undoing the selection change
   */
  private previousSelectedNodes: Selectable[] = selection.getSelectedItems();

  /**
   * Creates a new SelectNodesAction
   *
   * @param affectedNodes - The nodes to be selected
   * @param clearSelection - If true, replaces the current selection with the affected nodes.
   *                         If false, adds the affected nodes to the current selection.
   */
  constructor(
    private affectedNodes: Node[],
    private clearSelection = false
  ) {}

  /**
   * Performs the selection action by either adding the affected nodes to the current selection
   * or replacing the current selection with the affected nodes.
   */
  do(): void {
    if (this.clearSelection) {
      selection.setSelectedItems(this.affectedNodes);
    } else {
      this.affectedNodes.forEach((node) => {
        selection.addItem(node);
      });
    }
  }

  /**
   * Undoes the selection action by restoring the previous selection state.
   */
  undo(): void {
    selection.setSelectedItems(this.previousSelectedNodes);
  }
}

/**
 * Action that removes specific nodes from the current selection.
 * This action tracks the previous selection state to enable undoing the unselection.
 */
export class UnselectNodesAction implements Action {
  /**
   * Stores the complete selection state before the unselection occurs
   */
  private previousSelectedNodes: Selectable[] = selection.getSelectedItems();

  /**
   * Creates a new UnselectNodesAction.
   *
   * @param affectedNodes - The nodes to be removed from the current selection
   */
  constructor(private affectedNodes: Node[]) {
    this.affectedNodes.forEach((node) => {
      if (!this.previousSelectedNodes.includes(node)) {
        console.warn("Trying to unselect a node that is not selected");
      }
    });
    console.log("Unselecting nodes:", this.affectedNodes);
  }

  /**
   * Performs the unselection by filtering out the affected nodes from the current selection.
   */
  do(): void {
    selection.setSelectedItems(
      this.previousSelectedNodes.filter(
        (node) => !(node instanceof Node && this.affectedNodes.includes(node))
      )
    );
  }

  /**
   * Undoes the unselection by restoring the previous selection state.
   */
  undo(): void {
    selection.setSelectedItems(this.previousSelectedNodes);
  }
}

/**
 * Action that selects all nodes in the graph.
 * This action replaces the current selection with all nodes present in the graph,
 * while preserving the previous selection state to enable undoing.
 */
export class SelectAllNodesAction implements Action {
  /**
   * Creates a new SelectAllNodesAction.
   *
   * @param previousSelectedNodes - The nodes that were selected before this action.
   *                               Defaults to the currently selected nodes of type Node.
   *                               This is stored to enable undoing the selection change.
   */
  constructor(
    private previousSelectedNodes: Node[] = selection.getItemsOfClass(Node)
  ) {}

  /**
   * Performs the select-all action by setting the selection to include all nodes in the graph.
   */
  do() {
    selection.setSelectedItems(graph.getAllNodes());
  }

  /**
   * Undoes the select-all action by restoring the previous selection state.
   */
  undo() {
    selection.setSelectedItems(this.previousSelectedNodes);
  }
}

/**
 * Action that clears all currently selected items in the graph.
 * This action removes all items from the current selection while preserving
 * the previous selection state to enable undoing.
 */
export class ClearSelectionAction implements Action {
  /**
   * Creates a new ClearSelectionAction.
   *
   * @param previousSelectedNodes - The items that were selected before this action.
   *                               Defaults to the currently selected items.
   *                               This is stored to enable undoing the selection change.
   */
  constructor(
    private previousSelectedNodes: Selectable[] = selection.getSelectedItems()
  ) {}

  /**
   * Performs the clear selection action by removing all items from the current selection.
   */
  do() {
    selection.clearSelection();
  }

  /**
   * Undoes the clear selection action by restoring the previous selection state.
   */
  undo() {
    selection.setSelectedItems(this.previousSelectedNodes);
  }
}

/**
 * Action that inverts the current selection of nodes in the graph.
 * This action toggles the selection state of all nodes, effectively selecting all previously
 * unselected nodes and unselecting all previously selected nodes. It preserves the previous
 * selection state to enable undoing.
 */
export class InvertSelectionAction implements Action {
  /**
   * Creates a new InvertSelectionAction.
   *
   * @param previousSelectedNodes - The items that were selected before this action.
   *                               Defaults to the currently selected items.
   *                               This is stored to enable undoing the selection change.
   */
  constructor(
    private previousSelectedNodes: Selectable[] = selection.getSelectedItems()
  ) {}

  /**
   * Performs the invert selection action by toggling the selection state of all nodes in the graph.
   * This selects all previously unselected nodes and unselects all previously selected nodes.
   */
  do() {
    selection.toggleItems(graph.getAllNodes());
  }

  /**
   * Undoes the invert selection action by restoring the previous selection state.
   */
  undo() {
    selection.setSelectedItems(this.previousSelectedNodes);
  }
}

/**
 * Action that handles the addition of multiple edges to the graph.
 * This action creates new edges between specified node pairs, using styling properties
 * retrieved from the UI elements, and tracks the created edges to enable undoing.
 */
export class AddEdgesAction implements Action {
  /** Stores the IDs of edges created by this action for later removal during undo */
  private edgeIds: number[] = [];

  /**
   * Creates a new AddEdgesAction.
   *
   * @param edgesFrom - Array of node IDs representing the source nodes of the edges
   * @param edgesTo - Array of node IDs representing the target nodes of the edges
   * @throws Error if the edgesFrom and edgesTo arrays have different lengths
   */
  constructor(
    private edgesFrom: number[],
    private edgesTo: number[]
  ) {
    if (edgesFrom.length !== edgesTo.length) {
      throw new Error("edgesFrom and edgesTo must have the same length");
    }
  }

  /**
   * Performs the edge addition by creating edges between each pair of nodes
   * specified in the edgesFrom and edgesTo arrays, using styling properties
   * from the UI elements.
   */
  do() {
    for (let i = 0; i < this.edgesFrom.length; i++) {
      this.edgeIds.push(
        graph.addEdge(
          this.edgesFrom[i],
          this.edgesTo[i],
          (document.getElementById("edgeColor") as HTMLInputElement).value,
          parseFloat(
            (document.getElementById("lineWidth") as HTMLInputElement).value
          )
        )
      );
    }
  }

  /**
   * Undoes the edge addition by removing all edges created by this action
   * in reverse order to maintain consistency.
   */
  undo() {
    this.edgeIds
      .slice()
      .reverse()
      .forEach((edgeId) => {
        graph.deleteEdge(edgeId);
      });
  }
}

/**
 * Action that handles the addition of edges from a source node to one or more target nodes.
 * This action creates new edges between the specified nodes using styling properties
 * retrieved from the UI elements, and tracks the created edges to enable undoing.
 */
export class AddEdgeAction implements Action {
  /** Stores the IDs of edges created by this action for later removal during undo */
  private edgeIds: number[] = [];

  /**
   * Creates a new AddEdgeAction.
   *
   * @param fromNode - The source node from which all edges will originate
   * @param affectedNodes - Array of target nodes to which edges will be created from the source node
   */
  constructor(
    private fromNode: Node,
    private affectedNodes: Node[]
  ) {}

  /**
   * Performs the edge addition by creating edges from the source node to each target node,
   * using styling properties from the UI elements. If only one or zero target nodes are specified,
   * selects the source node after edge creation.
   */
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

  /**
   * Undoes the edge addition by removing all edges created by this action
   * in reverse order to maintain consistency, and restores the selection to
   * the previously affected nodes.
   */
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

/**
 * Action that handles the deletion of edges connected to specified nodes in the graph.
 * This action removes all edges involving the specified nodes and tracks the removed edges
 * to enable undoing the deletion. It can also optionally add an additional node to the selection
 * after deletion.
 */
export class DeleteEdgesAction implements Action {
  /** Stores the edges that are removed by this action for later restoration during undo */
  private edges: Edge[] = [];

  /**
   * Creates a new DeleteEdgesAction.
   *
   * @param affectedNodes - The nodes whose connected edges will be deleted
   * @param additionalNode - An optional node to add to the selection after edge deletion.
   *                         If provided, this node is also included in the set of nodes
   *                         whose edges will be deleted.
   */
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

  /**
   * Performs the edge deletion by removing all edges connected to the specified nodes.
   * If an additional node was specified, adds it to the current selection after deletion.
   */
  do() {
    this.edges.forEach((edge) => {
      graph.deleteEdge(edge);
    });
    if (this.additionalNode) {
      selection.addItem(this.additionalNode);
    }
  }

  /**
   * Undoes the edge deletion by restoring all previously removed edges.
   * If an additional node was added to the selection, removes it from the selection.
   */
  undo() {
    this.edges.forEach((edge) => {
      graph.addEdge(edge.fromId, edge.toId, edge.color, edge.weight);
    });
    if (this.additionalNode) {
      selection.removeItem(this.additionalNode);
    }
  }
}

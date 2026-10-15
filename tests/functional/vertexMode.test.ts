/**
 * Functional tests for vertex mode interaction
 * Tests that clicking on canvas in vertex mode adds vertices
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Container } from '@/core/Container';
import { Application } from '@/core/Application';
import { Graph } from '@/models/Graph';
import { Point } from '@/models/Point';
import { CanvasController } from '@/controllers/CanvasController';
import {
  createTestContainer,
  simulateCanvasClick,
  cleanupTestEnvironment,
} from '../testUtils';

describe('Vertex Mode - Click to Add Vertex', () => {
  let container: Container;
  let graph: Graph;
  let canvasController: CanvasController;
  let app: Application;

  beforeEach(() => {
    // Create test environment
    container = createTestContainer(800, 600);
    graph = container.get<Graph>('graph');
    app = container.get<Application>('app');
    
    // Initialize canvas controller
    canvasController = new CanvasController(container);
    canvasController.attachEventListeners();
    
    // Set mode to vertex
    const modeFactory = container.get<any>('modeFactory');
    modeFactory.setCurrentMode('vertex');
  });

  afterEach(() => {
    canvasController.detachEventListeners();
    cleanupTestEnvironment();
  });

  it('should add a vertex when clicking on canvas in vertex mode', () => {
    // Arrange: Get initial node count
    const initialNodeCount = graph.getNrOfNodes();
    expect(initialNodeCount).toBe(0);

    // Act: Click on canvas at specific coordinates
    const clickPoint = new Point(100, 200);
    simulateCanvasClick(container, clickPoint.x, clickPoint.y);

    // Assert: Check that a node was added
    const finalNodeCount = graph.getNrOfNodes();
    expect(finalNodeCount).toBe(1);

    // Verify the node is at approximately the clicked location
    const nodes = graph.getAllNodes();
    expect(nodes.length).toBe(1);
    
    const addedNode = nodes[0];
    expect(addedNode.coordinates.x).toBeCloseTo(clickPoint.x, 1);
    expect(addedNode.coordinates.y).toBeCloseTo(clickPoint.y, 1);
  });

  it('should add multiple vertices when clicking multiple times', () => {
    // Arrange: Define click points
    const clickPoints = [
      new Point(100, 100),
      new Point(200, 200),
      new Point(300, 150),
    ];

    // Act: Click at each point
    clickPoints.forEach(point => {
      simulateCanvasClick(container, point.x, point.y);
    });

    // Assert: Check that all nodes were added
    const nodes = graph.getAllNodes();
    expect(nodes.length).toBe(3);

    // Verify each node is at approximately the clicked location
    nodes.forEach((node, index) => {
      expect(node.coordinates.x).toBeCloseTo(clickPoints[index].x, 1);
      expect(node.coordinates.y).toBeCloseTo(clickPoints[index].y, 1);
    });
  });

  it('should increment node IDs for each new vertex', () => {
    // Act: Add three vertices
    simulateCanvasClick(container, 100, 100);
    simulateCanvasClick(container, 200, 200);
    simulateCanvasClick(container, 300, 300);

    // Assert: Check node IDs are sequential
    const nodes = graph.getAllNodes();
    const nodeIds = nodes.map(n => n.id).sort((a, b) => a - b);
    
    expect(nodeIds.length).toBe(3);
    expect(nodeIds[0]).toBe(0);
    expect(nodeIds[1]).toBe(1);
    expect(nodeIds[2]).toBe(2);
  });

  it('should use default vertex properties from UI when adding vertices', () => {
    // Arrange: Set UI values
    const uiFacade = container.get<any>('ui');
    uiFacade.setValue('vertexRadius', '15');
    uiFacade.setValue('vertexStrokeWidth', '3');
    uiFacade.setValue('nodeFillColor', '#ff0000');
    uiFacade.setValue('nodeColor', '#00ff00');

    // Act: Add a vertex
    simulateCanvasClick(container, 100, 100);

    // Assert: Check vertex properties match UI values
    const nodes = graph.getAllNodes();
    expect(nodes.length).toBe(1);
    
    const node = nodes[0];
    expect(node.radius).toBe(15);
    expect(node.strokeWidth).toBe(3);
    expect(node.fillColor).toBe('#ff0000');
    expect(node.strokeColor).toBe('#00ff00');
  });

  it('should not add vertex when clicking in a different mode', () => {
    // Arrange: Switch to select mode
    const modeFactory = container.get<any>('modeFactory');
    modeFactory.setCurrentMode('select');

    // Act: Click on canvas
    simulateCanvasClick(container, 100, 100);

    // Assert: No vertex should be added
    expect(graph.getNrOfNodes()).toBe(0);
  });

  it('should trigger re-render after adding vertex', () => {
    // Arrange: Spy on app.render to verify it's called
    const renderSpy = vi.spyOn(app, 'render');
    const initialNodeCount = graph.getNrOfNodes();

    // Act: Add a vertex
    simulateCanvasClick(container, 100, 100);

    // Assert: Vertex was added
    expect(graph.getNrOfNodes()).toBe(initialNodeCount + 1);
    // Assert: render() was called to update the display
    expect(renderSpy).toHaveBeenCalled();
    
    renderSpy.mockRestore();
  });

  it('should support undo/redo for vertex addition', () => {
    // Arrange: Add a vertex
    simulateCanvasClick(container, 100, 100);
    expect(graph.getNrOfNodes()).toBe(1);

    // Act: Undo the action
    const actionManager = container.get<any>('actionManager');
    actionManager.undo();

    // Assert: Vertex should be removed
    expect(graph.getNrOfNodes()).toBe(0);

    // Act: Redo the action
    actionManager.redo();

    // Assert: Vertex should be added back
    expect(graph.getNrOfNodes()).toBe(1);
    const nodes = graph.getAllNodes();
    expect(nodes[0].coordinates.x).toBeCloseTo(100, 1);
    expect(nodes[0].coordinates.y).toBeCloseTo(100, 1);
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContainer, createTestGraph, cleanupTestEnvironment } from '../testUtils';
import { Container } from '../../src/core/Container';
import { Application } from '../../src/core/Application';
import { CanvasFacade } from '../../src/facades/CanvasFacade';
import { GlobalSettings } from '../../src/utils/GlobalSettings';
import { Graph } from '../../src/models/Graph';

describe('Arrow Scaling - PNG and Movie Export', () => {
  let container: Container;
  let app: Application;
  let canvasFacade: CanvasFacade;
  let settings: GlobalSettings;
  let graph: Graph;

  beforeEach(() => {
    container = createTestContainer();
    app = container.get<Application>('app');
    canvasFacade = container.get<CanvasFacade>('canvas');
    settings = container.get<GlobalSettings>('settings');
    graph = container.get<Graph>('graph');

    // Create a graph with 2 nodes
    createTestGraph(container, { nodeCount: 2, withEdges: false });
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  it('should scale arrow width when exporting with withScaledCanvas', () => {
    // Arrange: Add an arrow between the two nodes
    const nodes = graph.getAllNodes();
    graph.addArrow(
      nodes[0].id,
      nodes[1].id,
      '#FF0000',
      2,
      false,
      true
    );

    const arrows = graph.getAllArrows();
    expect(arrows.length).toBe(1);
    const originalWidth = arrows[0].width;
    expect(originalWidth).toBe(2);

    const scaleFactor = 3;
    let scaledWidth: number = 0;

    // Act: Export with scaling
    canvasFacade.withScaledCanvas(
      () => {
        scaledWidth = graph.getAllArrows()[0].width;
        app.render();
      },
      scaleFactor,
      app,
      graph,
      settings
    );

    // Assert: Arrow width should be scaled during export
    expect(scaledWidth).toBe(originalWidth * scaleFactor);

    // Assert: Arrow width should be restored after export
    expect(graph.getAllArrows()[0].width).toBe(originalWidth);
  });

  it('should scale arrow width proportionally with different scale factors', () => {
    // Arrange: Add an arrow with width 5
    const nodes = graph.getAllNodes();
    graph.addArrow(
      nodes[0].id,
      nodes[1].id,
      '#00FF00',
      5,
      false,
      true
    );

    const originalWidth = 5;
    const scaleFactors = [1, 2, 3, 4];

    scaleFactors.forEach(scaleFactor => {
      let scaledWidth: number = 0;

      // Act: Export with different scale factors
      canvasFacade.withScaledCanvas(
        () => {
          scaledWidth = graph.getAllArrows()[0].width;
          app.render();
        },
        scaleFactor,
        app,
        graph,
        settings
      );

      // Assert: Check scaled width matches expected value
      expect(scaledWidth).toBe(originalWidth * scaleFactor);

      // Assert: Width should be restored
      expect(graph.getAllArrows()[0].width).toBe(originalWidth);
    });
  });

  it('should restore arrow width correctly even with multiple arrows', () => {
    // Arrange: Add multiple arrows with different widths
    const nodes = graph.getAllNodes();
    
    graph.addArrow(
      nodes[0].id,
      nodes[1].id,
      '#FF0000',
      2,
      false,
      true
    );

    graph.addArrow(
      nodes[1].id,
      nodes[0].id,
      '#0000FF',
      4,
      true,
      false
    );

    const arrows = graph.getAllArrows();
    expect(arrows.length).toBe(2);
    const originalWidth1 = arrows[0].width;
    const originalWidth2 = arrows[1].width;

    const scaleFactor = 2;

    // Act: Export with scaling
    canvasFacade.withScaledCanvas(
      () => {
        app.render();
      },
      scaleFactor,
      app,
      graph,
      settings
    );

    // Assert: All arrow widths should be restored
    expect(graph.getAllArrows()[0].width).toBe(originalWidth1);
    expect(graph.getAllArrows()[1].width).toBe(originalWidth2);
  });

  it('should scale arrow coordinates correctly (via node scaling)', () => {
    // Arrange: Add an arrow
    const nodes = graph.getAllNodes();
    graph.addArrow(
      nodes[0].id,
      nodes[1].id,
      '#000000',
      3,
      false,
      true
    );

    const originalNode0X = nodes[0].coordinates.x;
    const originalNode0Y = nodes[0].coordinates.y;
    const originalNode1X = nodes[1].coordinates.x;
    const originalNode1Y = nodes[1].coordinates.y;

    const scaleFactor = 2;
    let scaledNode0X: number = 0;
    let scaledNode1X: number = 0;

    // Act: Export with scaling
    canvasFacade.withScaledCanvas(
      () => {
        const scaledNodes = graph.getAllNodes();
        scaledNode0X = scaledNodes[0].coordinates.x;
        scaledNode1X = scaledNodes[1].coordinates.x;
        app.render();
      },
      scaleFactor,
      app,
      graph,
      settings
    );

    // Assert: Node coordinates (and thus arrow endpoints) should be scaled
    expect(scaledNode0X).toBe(originalNode0X * scaleFactor);
    expect(scaledNode1X).toBe(originalNode1X * scaleFactor);

    // Assert: Coordinates should be restored
    expect(nodes[0].coordinates.x).toBe(originalNode0X);
    expect(nodes[0].coordinates.y).toBe(originalNode0Y);
    expect(nodes[1].coordinates.x).toBe(originalNode1X);
    expect(nodes[1].coordinates.y).toBe(originalNode1Y);
  });

  it('should handle arrows during async export operations', async () => {
    // Arrange: Add an arrow
    const nodes = graph.getAllNodes();
    graph.addArrow(
      nodes[0].id,
      nodes[1].id,
      '#FFFF00',
      2,
      false,
      true
    );

    const originalWidth = 2;
    const scaleFactor = 4;

    // Act: Export with async callback
    const result = await canvasFacade.withScaledCanvas(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        const scaledWidth = graph.getAllArrows()[0].width;
        app.render();
        return scaledWidth;
      },
      scaleFactor,
      app,
      graph,
      settings
    );

    // Assert: Async result should have scaled width
    expect(result).toBe(originalWidth * scaleFactor);

    // Assert: Width should be restored after async operation
    expect(graph.getAllArrows()[0].width).toBe(originalWidth);
  });
});

/**
 * Functional tests for image export functionality
 * Tests that exporting to PNG produces correctly scaled images
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Container } from '@/core/Container';
import { CanvasFacade } from '@/facades/CanvasFacade';
import { Application } from '@/core/Application';
import { GlobalSettings } from '@/utils/GlobalSettings';
import {
  createTestContainer,
  createTestGraph,
  extractDimensionsFromDataURL,
  cleanupTestEnvironment,
} from '../testUtils';

describe('Image Export - PNG with Correct Dimensions', () => {
  let container: Container;
  let canvasFacade: CanvasFacade;
  let app: Application;
  let settings: GlobalSettings;

  beforeEach(() => {
    // Create test environment with a specific canvas size
    container = createTestContainer(800, 600);
    canvasFacade = container.get<CanvasFacade>('canvas');
    app = container.get<Application>('app');
    settings = container.get<GlobalSettings>('settings');
    
    // Initialize the application
    app.initialize();
    
    // Create a simple test graph
    createTestGraph(container, { nodeCount: 3, withEdges: true });
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  it('should export PNG with original canvas dimensions when scale factor is 1', () => {
    // Arrange: Render the graph
    app.render();
    
    // Act: Export to PNG without scaling
    const dataURL = canvasFacade.toDataURL('image/png');
    
    // Assert: Check that data URL is valid PNG
    expect(dataURL).toContain('data:image/png');
    
    // Extract dimensions from our mock
    const dimensions = extractDimensionsFromDataURL(dataURL);
    expect(dimensions).not.toBeNull();
    expect(dimensions!.width).toBe(800);
    expect(dimensions!.height).toBe(600);
  });

  it('should export PNG with scaled dimensions when using withScaledCanvas', () => {
    // Arrange: Define scale factor
    const scaleFactor = 2;
    const originalWidth = canvasFacade.canvas.width;
    const originalHeight = canvasFacade.canvas.height;
    
    let capturedDataURL: string = '';
    
    // Act: Use withScaledCanvas to scale up and export
    canvasFacade.withScaledCanvas(
      () => {
        app.render();
        capturedDataURL = canvasFacade.toDataURL('image/png');
        return capturedDataURL;
      },
      scaleFactor,
      app,
      container.get('graph'),
      settings
    );
    
    // Assert: Check scaled dimensions during callback
    expect(capturedDataURL).toContain('data:image/png');
    const scaledDimensions = extractDimensionsFromDataURL(capturedDataURL);
    expect(scaledDimensions).not.toBeNull();
    expect(scaledDimensions!.width).toBe(originalWidth * scaleFactor);
    expect(scaledDimensions!.height).toBe(originalHeight * scaleFactor);
    
    // Assert: Canvas should be restored to original dimensions after callback
    expect(canvasFacade.canvas.width).toBe(originalWidth);
    expect(canvasFacade.canvas.height).toBe(originalHeight);
  });

  it('should export PNG with different scale factors correctly', () => {
    // Arrange: Test multiple scale factors
    const scaleFactors = [1, 2, 3, 4];
    const originalWidth = canvasFacade.canvas.width;
    const originalHeight = canvasFacade.canvas.height;
    
    scaleFactors.forEach(scaleFactor => {
      // Act: Scale and export
      const dataURL = canvasFacade.withScaledCanvas(
        () => {
          app.render();
          return canvasFacade.toDataURL('image/png');
        },
        scaleFactor,
        app,
        container.get('graph'),
        settings
      );
      
      // Assert: Check dimensions match expected scaling
      const dimensions = extractDimensionsFromDataURL(dataURL as string);
      expect(dimensions).not.toBeNull();
      expect(dimensions!.width).toBe(originalWidth * scaleFactor);
      expect(dimensions!.height).toBe(originalHeight * scaleFactor);
    });
    
    // Assert: Canvas is restored after all operations
    expect(canvasFacade.canvas.width).toBe(originalWidth);
    expect(canvasFacade.canvas.height).toBe(originalHeight);
  });

  it('should scale graph elements proportionally when exporting', () => {
    // Arrange: Get initial graph state
    const graph = container.get<any>('graph');
    const originalNodes = graph.getAllNodes();
    const initialNodeRadius = originalNodes[0].radius;
    const initialNodeX = originalNodes[0].coordinates.x;
    
    const scaleFactor = 2;
    
    let scaledNodeRadius = 0;
    let scaledNodeX = 0;
    
    // Act: Scale and capture node properties during scaling
    canvasFacade.withScaledCanvas(
      () => {
        const scaledNodes = graph.getAllNodes();
        scaledNodeRadius = scaledNodes[0].radius;
        scaledNodeX = scaledNodes[0].coordinates.x;
        app.render();
      },
      scaleFactor,
      app,
      graph,
      settings
    );
    
    // Assert: During scaling, elements should be scaled
    expect(scaledNodeRadius).toBe(initialNodeRadius * scaleFactor);
    expect(scaledNodeX).toBe(initialNodeX * scaleFactor);
    
    // Assert: After scaling, elements should be restored
    const restoredNodes = graph.getAllNodes();
    expect(restoredNodes[0].radius).toBe(initialNodeRadius);
    expect(restoredNodes[0].coordinates.x).toBe(initialNodeX);
  });

  it('should hide selection indicators when exporting', () => {
    // Arrange: Select some nodes
    const graph = container.get<any>('graph');
    const selection = container.get<any>('selection');
    const nodes = graph.getAllNodes();
    selection.addItem(nodes[0]);
    
    // Initially, selection should be shown
    expect(app.renderModeInteractive.value).toBe(true);
    
    let selectionVisibleDuringExport = true;
    
    // Act: Export with scaling (which should hide selection)
    canvasFacade.withScaledCanvas(
      () => {
        selectionVisibleDuringExport = app.renderModeInteractive.value;
        app.render();
      },
      2,
      app,
      graph,
      settings
    );
    
    // Assert: Selection should be hidden during export
    expect(selectionVisibleDuringExport).toBe(false);
    
    // Assert: Selection should be restored after export
    expect(app.renderModeInteractive.value).toBe(true);
  });

  it('should maintain aspect ratio when scaling', () => {
    // Arrange: Use a non-square canvas
    const nonSquareContainer = createTestContainer(800, 400);
    const nonSquareCanvas = nonSquareContainer.get<CanvasFacade>('canvas');
    const nonSquareApp = nonSquareContainer.get<Application>('app');
    const nonSquareSettings = nonSquareContainer.get<GlobalSettings>('settings');
    const nonSquareGraph = nonSquareContainer.get('graph');
    
    createTestGraph(nonSquareContainer, { nodeCount: 2, withEdges: true });
    nonSquareApp.initialize();
    
    const scaleFactor = 3;
    const originalWidth = 800;
    const originalHeight = 400;
    
    // Act: Scale and export
    const dataURL = nonSquareCanvas.withScaledCanvas(
      () => {
        nonSquareApp.render();
        return nonSquareCanvas.toDataURL('image/png');
      },
      scaleFactor,
      nonSquareApp,
      nonSquareGraph,
      nonSquareSettings
    );
    
    // Assert: Dimensions should maintain aspect ratio
    const dimensions = extractDimensionsFromDataURL(dataURL as string);
    expect(dimensions).not.toBeNull();
    expect(dimensions!.width).toBe(originalWidth * scaleFactor);
    expect(dimensions!.height).toBe(originalHeight * scaleFactor);
    
    // Check aspect ratio is preserved
    const originalAspectRatio = originalWidth / originalHeight;
    const scaledAspectRatio = dimensions!.width / dimensions!.height;
    expect(scaledAspectRatio).toBeCloseTo(originalAspectRatio, 5);
  });

  it('should handle async export operations correctly', async () => {
    // Arrange: Create an async export function
    const asyncExport = async (): Promise<string> => {
      const result = await canvasFacade.withScaledCanvas(
        async () => {
          // Simulate some async operation
          await new Promise(resolve => setTimeout(resolve, 10));
          app.render();
          return canvasFacade.toDataURL('image/png');
        },
        2,
        app,
        container.get('graph'),
        settings
      );
      return result as string;
    };
    
    // Act: Perform async export
    const dataURL = await asyncExport();
    
    // Assert: Export completed successfully
    expect(dataURL).toContain('data:image/png');
    const dimensions = extractDimensionsFromDataURL(dataURL);
    expect(dimensions).not.toBeNull();
    expect(dimensions!.width).toBe(1600);
    expect(dimensions!.height).toBe(1200);
    
    // Assert: Canvas was restored
    expect(canvasFacade.canvas.width).toBe(800);
    expect(canvasFacade.canvas.height).toBe(600);
  });

  it('should support different image formats', () => {
    // Arrange: Define formats to test
    const formats = ['image/png', 'image/jpeg', 'image/webp'];
    
    formats.forEach(format => {
      // Act: Export in the format
      app.render();
      const dataURL = canvasFacade.toDataURL(format);
      
      // Assert: Data URL contains the format
      expect(dataURL).toContain(`data:${format}`);
    });
  });
});

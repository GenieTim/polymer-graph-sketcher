/**
 * Test utilities and helpers
 * Provides reusable test helpers following DRY principles
 */

import { Container } from '@/core/Container';
import { Application } from '@/core/Application';
import { Graph } from '@/models/Graph';
import { Node } from '@/models/Node';
import { Point } from '@/models/Point';
import { GlobalSettings } from '@/utils/GlobalSettings';
import { CanvasFacade } from '@/facades/CanvasFacade';
import { UIFacade } from '@/facades/UIFacade';
import { MovieFacade } from '@/facades/MovieFacade';
import { ActionManager } from '@/actions/ActionManager';
import { InteractionModeFactory } from '@/interaction-modes/ModeFactory';
import { Circle } from '@/rendering/Circle';
import { Line } from '@/rendering/Line';
import { Rectangle } from '@/rendering/Rectangle';
import { PartialLine } from '@/rendering/PartialLine';
import { vi } from 'vitest';
import { graph as globalGraph } from '@/models';
import { selection as globalSelection } from '@/services';

/**
 * Create a mock canvas element with specified dimensions
 */
export function createMockCanvas(width: number = 800, height: number = 600): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Create a mock UI element with common input fields
 */
export function createMockUIElements(): void {
  const elements = [
    { id: 'backgroundColor', value: '#ffffff' },
    { id: 'borderColor', value: '#000000' },
    { id: 'vertexRadius', value: '10' },
    { id: 'vertexStrokeWidth', value: '2' },
    { id: 'nodeFillColor', value: '#ffffff' },
    { id: 'nodeColor', value: '#000000' },
    { id: 'edgeColor', value: '#000000' },
    { id: 'lineWidth', value: '2' },
    { id: 'graph-stats', value: '' },
    { id: 'resizeElements', value: 'true', type: 'checkbox' },
    { id: 'canvas-parent', type: 'div' },
    { id: 'canvas-size', type: 'div' },
    { id: 'canvasWidth', value: '800' },
    { id: 'canvasHeight', value: '600' },
    { id: 'movieRecordingStatus', type: 'div' },
    { id: 'recordingEdgeCount', type: 'div' },
    { id: 'stopMotionIndicator', type: 'div' },
    { id: 'stopMotionFrameCount', type: 'div' },
    { id: 'stopMotionFrameDuration', value: '500' },
  ];

  elements.forEach(({ id, value, type }) => {
    let element: HTMLElement;
    if (type === 'checkbox') {
      element = document.createElement('input');
      (element as HTMLInputElement).type = 'checkbox';
      (element as HTMLInputElement).checked = value === 'true';
    } else if (type === 'div') {
      element = document.createElement('div');
    } else {
      element = document.createElement('input');
      const inputElement = element as HTMLInputElement;
      inputElement.type = 'text';
      inputElement.value = value || '';
      // Override valueAsNumber to parse the value string
      Object.defineProperty(inputElement, 'valueAsNumber', {
        get() {
          return parseFloat(this.value) || 0;
        }
      });
    }
    element.id = id;
    document.body.appendChild(element);
  });
}

/**
 * Create a fully configured container with all dependencies
 */
export function createTestContainer(canvasWidth: number = 800, canvasHeight: number = 600): Container {
  const container = Container.getInstance();
  container.clear(); // Clear any previous services
  
  // Create canvas
  const canvas = createMockCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d')!;
  
  // Setup mock UI elements
  createMockUIElements();
  
  // Initialize settings
  const settings = GlobalSettings.instance;
  settings.canvasSize = new Point(canvasWidth, canvasHeight);
  settings.isScaled = false;
  settings.imageScaleFactor = 1;
  
  // Clear the global graph and selection
  globalGraph.clear();
  globalSelection.clearSelection();
  
  // Register core services using global instances where needed
  container.register('settings', settings);
  container.register('graph', globalGraph);  // Use global graph instance
  container.register('canvas', new CanvasFacade(canvas, ctx, settings));
  container.register('ui', new UIFacade());
  container.register('selection', globalSelection);  // Use global selection instance
  
  // Register rendering classes
  container.register('Circle', Circle);
  container.register('Line', Line);
  container.register('Rectangle', Rectangle);
  container.register('PartialLine', PartialLine);
  container.register('Node', Node);
  
  // Register movie facade
  const movieFacade = new MovieFacade(canvas, container);
  movieFacade.initialize();
  container.register('movie', movieFacade);
  
  // Register mode factory  
  const nodeCounter = { value: 0 };
  const doRandomWalk = (_startPoint: Point) => {/* mock */};
  const modeFactory = new InteractionModeFactory(
    nodeCounter,
    container.get('graph'),
    container.get('selection'),
    doRandomWalk,
    container
  );
  container.register('modeFactory', modeFactory);
  container.register('nodeCounter', nodeCounter);
  
  // Register application
  const app = new Application(container);
  container.register('app', app);
  
  // Register action manager with callback that triggers render
  const afterActionCallback = () => app.render();
  container.register('actionManager', new ActionManager(afterActionCallback));
  
  return container;
}

/**
 * Create a test graph with nodes and edges
 */
export function createTestGraph(container: Container, options: {
  nodeCount?: number;
  withEdges?: boolean;
} = {}): Graph {
  const { nodeCount = 3, withEdges = true } = options;
  const graph = container.get<Graph>('graph');
  const settings = container.get<GlobalSettings>('settings');
  
  // Add nodes in a simple pattern
  for (let i = 0; i < nodeCount; i++) {
    const x = (settings.canvasSize.x / (nodeCount + 1)) * (i + 1);
    const y = settings.canvasSize.y / 2;
    const node = new Node(i, new Point(x, y), 10, 2, '#ffffff', '#000000');
    graph.setNode(node);
  }
  
  // Add edges between consecutive nodes
  if (withEdges && nodeCount > 1) {
    for (let i = 0; i < nodeCount - 1; i++) {
      graph.addEdge(i, i + 1, '#000000', 2);
    }
  }
  
  return graph;
}

/**
 * Simulate a canvas click at specific coordinates
 */
export function simulateCanvasClick(
  container: Container,
  x: number,
  y: number
): void {
  const canvas = container.get<CanvasFacade>('canvas').canvas;
  const event = new MouseEvent('click', {
    clientX: x + canvas.offsetLeft,
    clientY: y + canvas.offsetTop,
    bubbles: true,
  });
  canvas.dispatchEvent(event);
}

/**
 * Extract dimensions from a data URL that was created by our mock
 * Returns null if dimensions can't be extracted
 */
export function extractDimensionsFromDataURL(dataURL: string): { width: number; height: number } | null {
  const match = dataURL.match(/width=(\d+),height=(\d+)/);
  if (match) {
    return {
      width: parseInt(match[1], 10),
      height: parseInt(match[2], 10),
    };
  }
  return null;
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 50
): Promise<void> {
  const startTime = Date.now();
  
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

/**
 * Clean up test environment
 */
export function cleanupTestEnvironment(): void {
  // Remove all mock UI elements
  document.body.innerHTML = '';
  
  // Reset global settings
  const settings = GlobalSettings.instance;
  settings.canvasSize = new Point(800, 600);
  settings.isScaled = false;
  settings.imageScaleFactor = 1;
}

/**
 * Create a spy on canvas rendering methods to track what was drawn
 */
export function createCanvasRenderingSpy(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  
  return {
    clearRectCalls: vi.spyOn(ctx, 'clearRect'),
    fillRectCalls: vi.spyOn(ctx, 'fillRect'),
    strokeRectCalls: vi.spyOn(ctx, 'strokeRect'),
    arcCalls: vi.spyOn(ctx, 'arc'),
    lineToCall: vi.spyOn(ctx, 'lineTo'),
    fillCalls: vi.spyOn(ctx, 'fill'),
    strokeCalls: vi.spyOn(ctx, 'stroke'),
    getImageDataCalls: vi.spyOn(ctx, 'getImageData'),
    putImageDataCalls: vi.spyOn(ctx, 'putImageData'),
  };
}

/**
 * Mock download behavior for testing file exports
 */
export function mockDownload(): { downloadedFiles: Array<{ blob: Blob; filename: string }> } {
  const downloadedFiles: Array<{ blob: Blob; filename: string }> = [];
  
  // Override createElement to capture download links
  const originalCreateElement = document.createElement.bind(document);
  document.createElement = vi.fn((tagName: string) => {
    const element = originalCreateElement(tagName);
    
    if (tagName.toLowerCase() === 'a') {
      // Spy on click to capture download
      const originalClick = element.click.bind(element);
      element.click = vi.fn(() => {
        if (element instanceof HTMLAnchorElement && element.download) {
          // In our mock, we just record that a download was attempted
          downloadedFiles.push({
            blob: new Blob(), // We can't easily get the actual blob from the URL
            filename: element.download,
          });
        }
        originalClick();
      });
    }
    
    return element;
  }) as any;
  
  return { downloadedFiles };
}

/**
 * Check if a video blob has expected properties
 */
export function validateVideoBlob(blob: Blob): boolean {
  return blob.type.includes('video') && blob.size > 0;
}

/**
 * Calculate expected video duration from frames
 */
export function calculateExpectedDuration(
  frames: Array<{ durationMs: number }>
): number {
  const totalMs = frames.reduce((sum, frame) => sum + frame.durationMs, 0);
  return totalMs;
}

/**
 * Check if frames are different (not identical)
 * In a real test environment, this would compare actual image data
 */
export function checkFramesDifferent(
  frame1: ImageData,
  frame2: ImageData
): boolean {
  if (frame1.width !== frame2.width || frame1.height !== frame2.height) {
    return true;
  }
  
  // Compare pixel data
  for (let i = 0; i < frame1.data.length; i++) {
    if (frame1.data[i] !== frame2.data[i]) {
      return true;
    }
  }
  
  return false;
}

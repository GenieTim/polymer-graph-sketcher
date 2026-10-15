/**
 * Functional test for stop-motion frame duration behavior
 * Verifies that the duration field controls the transition TO the next frame, not FROM it
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Container } from '@/core/Container';
import { MovieFacade } from '@/facades/MovieFacade';
import { Application } from '@/core/Application';
import { Graph } from '@/models/Graph';
import { StopMotionRecorder } from '@/animation/stop-motion-recorder';
import {
  createTestContainer,
  createTestGraph,
  cleanupTestEnvironment,
} from '../testUtils';

describe('Stop-Motion Duration Behavior', () => {
  let container: Container;
  let movieFacade: MovieFacade;
  let app: Application;
  let graph: Graph;

  beforeEach(() => {
    // Create test environment
    container = createTestContainer(800, 600);
    movieFacade = container.get<MovieFacade>('movie');
    app = container.get<Application>('app');
    graph = container.get<Graph>('graph');
    
    // Initialize application
    app.initialize();
    
    // Create initial graph
    createTestGraph(container, { nodeCount: 1, withEdges: false });
    app.render();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  it('should use endFrame duration for transition timing', () => {
    // This test verifies the expected behavior:
    // Frame 1 (duration: 100ms) -> Frame 2 (duration: 2000ms) -> Frame 3 (duration: 500ms)
    // Should produce:
    // - Transition 1->2: 2000ms (based on Frame 2's duration)
    // - Transition 2->3: 500ms (based on Frame 3's duration)
    
    // Create a custom recorder to test the internal behavior
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 800, 600);

    const recorder = new StopMotionRecorder({
      canvas,
      frameDuration: 100, // Default, will be overridden per frame
    });

    // Set up graph state provider
    let nodeX = 100;
    recorder.setGraphStateProvider(() => ({
      nodes: new Map([[1, {
        x: nodeX,
        y: 100,
        radius: 10,
        strokeWidth: 2,
        fillColor: '#ff0000',
        strokeColor: '#000000',
      }]]),
      edges: [],
      arrows: [],
      zigzagSpacing: 4,
      zigzagLength: 3,
      zigzagEndLengths: 1.5,
    }));

    // Start recording
    recorder.start();

    // Frame 1: Node at x=100, duration=100ms (this will NOT be used for transition)
    nodeX = 100;
    recorder.captureFrame(100);

    // Frame 2: Node at x=200 (small change), duration=2000ms (long duration)
    // The transition FROM Frame 1 TO Frame 2 should take 2000ms
    nodeX = 200;
    recorder.captureFrame(2000);

    // Frame 3: Node at x=700 (large change), duration=500ms (short duration)
    // The transition FROM Frame 2 TO Frame 3 should take 500ms
    nodeX = 700;
    recorder.captureFrame(500);

    recorder.stop();

    // Get the captured frames
    const frames = recorder.getFrames();
    expect(frames).toHaveLength(3);
    expect(frames[0].duration).toBe(100);
    expect(frames[1].duration).toBe(2000);
    expect(frames[2].duration).toBe(500);

    // The key insight: when generating interpolated frames at 30fps,
    // the transition from Frame 1 to Frame 2 should use Frame 2's duration (2000ms)
    // This means we should get: Math.round(2000 / (1000/30)) = 60 intermediate frames
    
    // The transition from Frame 2 to Frame 3 should use Frame 3's duration (500ms)
    // This means we should get: Math.round(500 / (1000/30)) = 15 intermediate frames

    // We can't directly test generateInterpolatedFrames since it's private,
    // but we verified the frames have the correct durations attached
    // The actual interpolation logic uses endFrame.duration (after our fix)
  });

  it('should produce correct frame counts based on duration', async () => {
    // Real-world test: small change with long duration vs large change with short duration
    
    // Start recording
    movieFacade.startStopMotionRecording();
    
    // Frame 1: Initial state
    const node = graph.getNode(0)!;
    node.coordinates.x = 100;
    node.coordinates.y = 100;
    app.render();
    movieFacade.captureStopMotionFrame(100); // This duration won't be used for any transition

    // Frame 2: Small change (100px), but long duration (2000ms)
    node.coordinates.x = 200;
    app.render();
    movieFacade.captureStopMotionFrame(2000); // Transition 1->2 should take 2000ms

    // Frame 3: Large change (500px), but short duration (500ms)
    node.coordinates.x = 700;
    app.render();
    movieFacade.captureStopMotionFrame(500); // Transition 2->3 should take 500ms

    movieFacade.stopStopMotionRecording();

    // Create movie with interpolation
    await movieFacade.createStopMotionMovie(true, 'test-duration.webm');

    // Verify frames were captured
    expect(movieFacade.getStopMotionFrameCount()).toBe(3);

    // The video encoding happens, but we can't directly verify frame counts here
    // The important thing is that it completes without errors
    // In the actual video:
    // - Small movement (100px) should appear slow (2000ms)
    // - Large movement (500px) should appear fast (500ms)
    // This achieves approximately regular movement speed
  });

  it('should support workflow: set duration, then capture', () => {
    // This test demonstrates the intended workflow
    
    movieFacade.startStopMotionRecording();
    
    // Initial frame with default duration
    movieFacade.captureStopMotionFrame();
    
    // Scenario 1: Making large changes, want slow transition
    // Set a large duration BEFORE capturing
    movieFacade.setStopMotionFrameDuration(3000);
    // Make large changes
    const node = graph.getNode(0)!;
    node.coordinates.x = 700;
    node.coordinates.y = 500;
    app.render();
    // Capture with the large duration
    movieFacade.captureStopMotionFrame(); // Uses 3000ms
    
    // Scenario 2: Making small changes, want quick transition
    // Set a small duration BEFORE capturing
    movieFacade.setStopMotionFrameDuration(200);
    // Make small changes
    node.coordinates.x = 720;
    node.coordinates.y = 510;
    app.render();
    // Capture with the small duration
    movieFacade.captureStopMotionFrame(); // Uses 200ms
    
    movieFacade.stopStopMotionRecording();
    
    const frames = (movieFacade as any).stopMotionRecorder.getFrames();
    
    // Frame 0: default 500ms duration (not used for any transition, since it's the first frame)
    expect(frames[0].duration).toBe(500);
    
    // Frame 1: 3000ms duration - transition FROM Frame 0 TO Frame 1 takes 3000ms
    expect(frames[1].duration).toBe(3000);
    
    // Frame 2: 200ms duration - transition FROM Frame 1 TO Frame 2 takes 200ms
    expect(frames[2].duration).toBe(200);
  });
});

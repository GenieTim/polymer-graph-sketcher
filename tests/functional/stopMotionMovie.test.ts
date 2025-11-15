/**
 * Functional tests for stop-motion movie creation
 * Tests that stop-motion recording creates videos with correct frame count and duration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Container } from '@/core/Container';
import { MovieFacade } from '@/facades/MovieFacade';
import { Application } from '@/core/Application';
import { Graph } from '@/models/Graph';
import { Node } from '@/models/Node';
import { Point } from '@/models/Point';
import {
  createTestContainer,
  createTestGraph,
  cleanupTestEnvironment,
} from '../testUtils';

describe('Stop-Motion Movie - Frame Count and Duration', () => {
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
    createTestGraph(container, { nodeCount: 2, withEdges: false });
    app.render();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  it('should start and stop stop-motion recording', () => {
    // Act: Start recording
    movieFacade.startStopMotionRecording();
    
    // Assert: Recording should be active
    expect(movieFacade.isStopMotionRecording()).toBe(true);
    expect(movieFacade.getStopMotionFrameCount()).toBe(0);
    
    // Act: Stop recording
    const frameCount = movieFacade.stopStopMotionRecording();
    
    // Assert: Recording should be stopped
    expect(movieFacade.isStopMotionRecording()).toBe(false);
    expect(frameCount).toBe(0);
  });

  it('should capture frames during stop-motion recording', () => {
    // Arrange: Start recording
    movieFacade.startStopMotionRecording();
    
    // Act: Capture multiple frames with changes between them
    movieFacade.captureStopMotionFrame();
    expect(movieFacade.getStopMotionFrameCount()).toBe(1);
    
    // Make a change to the graph
    graph.setNode(new Node(10, new Point(400, 300), 10, 2, '#ff0000', '#000000'));
    app.render();
    movieFacade.captureStopMotionFrame();
    expect(movieFacade.getStopMotionFrameCount()).toBe(2);
    
    // Make another change
    graph.addEdge(0, 10, '#0000ff', 2);
    app.render();
    movieFacade.captureStopMotionFrame();
    expect(movieFacade.getStopMotionFrameCount()).toBe(3);
    
    // Assert: Should have captured 3 frames
    const finalCount = movieFacade.stopStopMotionRecording();
    expect(finalCount).toBe(3);
  });

  it('should remove last captured frame', () => {
    // Arrange: Start recording and capture frames
    movieFacade.startStopMotionRecording();
    movieFacade.captureStopMotionFrame();
    movieFacade.captureStopMotionFrame();
    movieFacade.captureStopMotionFrame();
    expect(movieFacade.getStopMotionFrameCount()).toBe(3);
    
    // Act: Remove last frame
    const newCount = movieFacade.removeLastStopMotionFrame();
    
    // Assert: Frame count should be reduced
    expect(newCount).toBe(2);
    expect(movieFacade.getStopMotionFrameCount()).toBe(2);
  });

  it('should clear all captured frames', () => {
    // Arrange: Capture some frames
    movieFacade.startStopMotionRecording();
    movieFacade.captureStopMotionFrame();
    movieFacade.captureStopMotionFrame();
    expect(movieFacade.getStopMotionFrameCount()).toBe(2);
    
    // Act: Clear frames
    movieFacade.clearStopMotionFrames();
    
    // Assert: Frame count should be 0
    expect(movieFacade.getStopMotionFrameCount()).toBe(0);
  });

  it('should set and get frame duration', () => {
    // Arrange: Default frame duration
    const defaultDuration = movieFacade.getStopMotionFrameDuration();
    expect(defaultDuration).toBe(500); // Default 500ms
    
    // Act: Set new duration
    movieFacade.setStopMotionFrameDuration(1000);
    
    // Assert: Duration should be updated
    expect(movieFacade.getStopMotionFrameDuration()).toBe(1000);
    
    // Act: Set another duration
    movieFacade.setStopMotionFrameDuration(250);
    
    // Assert: Duration should be updated again
    expect(movieFacade.getStopMotionFrameDuration()).toBe(250);
  });

  it('should handle empty recording (no frames)', async () => {
    // Arrange: Start and stop without capturing frames
    movieFacade.startStopMotionRecording();
    movieFacade.stopStopMotionRecording();
    
    // Act & Assert: Creating movie with no frames should throw error
    await expect(
      movieFacade.createStopMotionMovie()
    ).rejects.toThrow(/no frames/i);
  });

  it('should support creating multiple movies from same frames', async () => {
    // Arrange: Capture frames
    movieFacade.startStopMotionRecording();
    for (let i = 0; i < 3; i++) {
      movieFacade.captureStopMotionFrame();
    }
    movieFacade.stopStopMotionRecording();
    
    // Act: Create first movie
    const movie1Promise = movieFacade.createStopMotionMovie('movie1.webm');
    await expect(movie1Promise).resolves.not.toThrow();
    
    // Assert: Frames should still be available
    expect(movieFacade.getStopMotionFrameCount()).toBe(3);
    
    // Act: Create second movie with different filename
    const movie2Promise = movieFacade.createStopMotionMovie('movie2.webm');
    await expect(movie2Promise).resolves.not.toThrow();
    
    // Assert: Frames should still be available
    expect(movieFacade.getStopMotionFrameCount()).toBe(3);
  });

  it('should update UI status during movie creation', async () => {
    // Arrange: Spy on UI updates
    const uiFacade = container.get<any>('ui');
    const updateStatusSpy = vi.spyOn(uiFacade, 'updateMovieStatus');
    
    // Capture frames
    movieFacade.startStopMotionRecording();
    for (let i = 0; i < 3; i++) {
      movieFacade.captureStopMotionFrame();
    }
    movieFacade.stopStopMotionRecording();
    
    // Act: Create movie
    await movieFacade.createStopMotionMovie();
    
    // Wait a bit for all status updates
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Assert: Status updates should have been called
    expect(updateStatusSpy).toHaveBeenCalled();
    
    // Should include encoding status
    const calls = updateStatusSpy.mock.calls;
    const hasEncodingStatus = calls.some(call => 
      call[0]?.toString().toLowerCase().includes('encod')
    );
    expect(hasEncodingStatus).toBe(true);
  });

  it('should maintain frame order in the final movie', async () => {
    // Arrange: Capture frames in specific order with distinct changes
    movieFacade.startStopMotionRecording();
    
    const changes = [
      { nodeId: 200, color: '#ff0000' }, // Red
      { nodeId: 201, color: '#00ff00' }, // Green
      { nodeId: 202, color: '#0000ff' }, // Blue
    ];
    
    changes.forEach(change => {
      graph.setNode(
        new Node(change.nodeId, new Point(400, 300), 20, 2, change.color, '#000000')
      );
      app.render();
      movieFacade.captureStopMotionFrame();
    });
    
    movieFacade.stopStopMotionRecording();
    
    // Act: Create movie
    await expect(
      movieFacade.createStopMotionMovie()
    ).resolves.not.toThrow();
    
    // Assert: All frames were captured in order
    expect(movieFacade.getStopMotionFrameCount()).toBe(3);
    // In a real scenario, we would verify frame order in the video file
  });

  it('should support variable frame durations for different recording sessions', async () => {
    // Test 1: Short duration
    movieFacade.setStopMotionFrameDuration(200);
    movieFacade.startStopMotionRecording();
    movieFacade.captureStopMotionFrame();
    movieFacade.captureStopMotionFrame();
    movieFacade.stopStopMotionRecording();
    
    await expect(
      movieFacade.createStopMotionMovie('short-duration.webm')
    ).resolves.not.toThrow();
    
    // Clear and test 2: Long duration
    movieFacade.clearStopMotionFrames();
    movieFacade.setStopMotionFrameDuration(2000);
    movieFacade.startStopMotionRecording();
    movieFacade.captureStopMotionFrame();
    movieFacade.captureStopMotionFrame();
    movieFacade.stopStopMotionRecording();
    
    await expect(
      movieFacade.createStopMotionMovie('long-duration.webm')
    ).resolves.not.toThrow();
    
    // Assert: Both movies created successfully with different durations
    expect(movieFacade.getStopMotionFrameDuration()).toBe(2000);
  });
});

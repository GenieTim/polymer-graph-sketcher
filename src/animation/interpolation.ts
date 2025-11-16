/**
 * Graph State Interpolation Module
 * 
 * Provides utilities for interpolating between graph states,
 * including node positions (with PBC), edges, and arrows.
 */

import { Point, Graph } from '../models';
import { 
  interpolateWithPBC, 
  interpolateCubicWithPBC,
  interpolateCatmullRomWithPBC,
  getBoxSize 
} from '../utils/PeriodicBoundaryConditions';
import { PartialLine } from '../rendering/PartialLine';
import { ArrowLine } from '../rendering/ArrowLine';
import { GlobalSettings } from '../utils/GlobalSettings';
import type { GraphState } from './stop-motion-recorder';
import type { Drawable } from '../rendering/Drawable';

/**
 * Identifies elements that differ between two graph states
 */
export interface GraphStateDiff {
  // Nodes that exist in both states
  commonNodes: number[];
  // Nodes only in the start state (will disappear)
  removedNodes: number[];
  // Nodes only in the end state (will appear)
  addedNodes: number[];
  
  // Edges only in start state (will disappear)
  removedEdges: Array<{ fromId: number; toId: number; color: string; weight: number }>;
  // Edges only in end state (will appear)
  addedEdges: Array<{ fromId: number; toId: number; color: string; weight: number }>;
  
  // Arrows only in start state (will disappear)
  removedArrows: Array<{ fromId: number; toId: number; color: string; width: number; headAtStart: boolean; headAtEnd: boolean }>;
  // Arrows only in end state (will appear)
  addedArrows: Array<{ fromId: number; toId: number; color: string; width: number; headAtStart: boolean; headAtEnd: boolean }>;
}

/**
 * Compare two graph states and identify differences
 */
export function diffGraphStates(start: GraphState, end: GraphState): GraphStateDiff {
  const startNodeIds = new Set(start.nodes.keys());
  const endNodeIds = new Set(end.nodes.keys());
  
  const commonNodes = Array.from(startNodeIds).filter(id => endNodeIds.has(id));
  const removedNodes = Array.from(startNodeIds).filter(id => !endNodeIds.has(id));
  const addedNodes = Array.from(endNodeIds).filter(id => !startNodeIds.has(id));
  
  // Helper to create edge key for comparison
  const edgeKey = (fromId: number, toId: number, color: string) => 
    `${Math.min(fromId, toId)}-${Math.max(fromId, toId)}-${color}`;
  
  const startEdges = new Map(start.edges.map(e => [edgeKey(e.fromId, e.toId, e.color), e]));
  const endEdges = new Map(end.edges.map(e => [edgeKey(e.fromId, e.toId, e.color), e]));
  
  const removedEdges = start.edges.filter(e => !endEdges.has(edgeKey(e.fromId, e.toId, e.color)));
  const addedEdges = end.edges.filter(e => !startEdges.has(edgeKey(e.fromId, e.toId, e.color)));
  
  // Helper to create arrow key for comparison (arrows are directional)
  const arrowKey = (fromId: number, toId: number, color: string) => 
    `${fromId}-${toId}-${color}`;
  
  const startArrows = new Map(start.arrows.map(a => [arrowKey(a.fromId, a.toId, a.color), a]));
  const endArrows = new Map(end.arrows.map(a => [arrowKey(a.fromId, a.toId, a.color), a]));
  
  const removedArrows = start.arrows.filter(a => !endArrows.has(arrowKey(a.fromId, a.toId, a.color)));
  const addedArrows = end.arrows.filter(a => !startArrows.has(arrowKey(a.fromId, a.toId, a.color)));
  
  return {
    commonNodes,
    removedNodes,
    addedNodes,
    removedEdges,
    addedEdges,
    removedArrows,
    addedArrows,
  };
}

/**
 * Apply a graph state to the actual graph
 */
export function applyGraphState(graph: Graph, state: GraphState): void {
  // Clear existing state
  graph.clear();
  
  // Add nodes
  state.nodes.forEach((nodeData, nodeId) => {
    graph.setNode({
      id: nodeId,
      coordinates: new Point(nodeData.x, nodeData.y),
      radius: nodeData.radius,
      strokeWidth: nodeData.strokeWidth,
      fillColor: nodeData.fillColor,
      strokeColor: nodeData.strokeColor,
    } as any);
  });
  
  // Add edges
  state.edges.forEach(edge => {
    graph.addEdge(edge.fromId, edge.toId, edge.color, edge.weight);
  });
  
  // Add arrows
  state.arrows.forEach(arrow => {
    graph.addArrow(
      arrow.fromId,
      arrow.toId,
      arrow.color,
      arrow.width,
      arrow.headAtStart,
      arrow.headAtEnd
    );
  });
}

/**
 * Interpolate node positions between graph states
 * Supports linear, cubic, and Catmull-Rom interpolation
 * 
 * @param graph - The graph to modify
 * @param prevState - Previous graph state (for higher-order interpolation, can be null)
 * @param startState - Start graph state
 * @param endState - End graph state
 * @param nextState - Next graph state (for higher-order interpolation, can be null)
 * @param progress - Progress from 0 to 1 (between startState and endState)
 * @param commonNodes - Array of node IDs that exist in all relevant states
 */
export function interpolateNodePositions(
  graph: Graph,
  prevState: GraphState | null,
  startState: GraphState,
  endState: GraphState,
  nextState: GraphState | null,
  progress: number,
  commonNodes: number[]
): void {
  const boxSize = getBoxSize();
  const settings = GlobalSettings.instance;
  
  commonNodes.forEach(nodeId => {
    const prevNode = prevState?.nodes.get(nodeId) || null;
    const startNode = startState.nodes.get(nodeId);
    const endNode = endState.nodes.get(nodeId);
    const nextNode = nextState?.nodes.get(nodeId) || null;
    const graphNode = graph.getNode(nodeId);
    
    if (startNode && endNode && graphNode) {
      const startPos = new Point(startNode.x, startNode.y);
      const endPos = new Point(endNode.x, endNode.y);
      
      let interpolated: Point;
      
      // Choose interpolation method based on settings
      if (settings.interpolationMode === 'cubic') {
        const prevPos = prevNode ? new Point(prevNode.x, prevNode.y) : null;
        const nextPos = nextNode ? new Point(nextNode.x, nextNode.y) : null;
        interpolated = interpolateCubicWithPBC(prevPos, startPos, endPos, nextPos, progress, boxSize);
      } else if (settings.interpolationMode === 'catmull-rom') {
        const prevPos = prevNode ? new Point(prevNode.x, prevNode.y) : null;
        const nextPos = nextNode ? new Point(nextNode.x, nextNode.y) : null;
        interpolated = interpolateCatmullRomWithPBC(prevPos, startPos, endPos, nextPos, progress, boxSize);
      } else {
        // Default: linear interpolation
        interpolated = interpolateWithPBC(startPos, endPos, progress, boxSize);
      }
      
      graphNode.coordinates.x = interpolated.x;
      graphNode.coordinates.y = interpolated.y;
      
      // Also interpolate other properties
      graphNode.radius = startNode.radius + (endNode.radius - startNode.radius) * progress;
      graphNode.strokeWidth = startNode.strokeWidth + (endNode.strokeWidth - startNode.strokeWidth) * progress;
      
      // For colors, we'll just switch at 50% progress (smooth color interpolation is complex)
      if (progress < 0.5) {
        graphNode.fillColor = startNode.fillColor;
        graphNode.strokeColor = startNode.strokeColor;
      } else {
        graphNode.fillColor = endNode.fillColor;
        graphNode.strokeColor = endNode.strokeColor;
      }
    }
  });
}

/**
 * Create partial drawables for appearing/disappearing edges
 */
export function createEdgeAnimationDrawables(
  graph: Graph,
  diff: GraphStateDiff,
  progress: number
): Drawable[] {
  const drawables: Drawable[] = [];
  // Get the current scaling factor from GlobalSettings when in scaled mode
  // This matches how ScalingService works - when isScaled is true, use imageScaleFactor
  const settings = GlobalSettings.instance;
  const scalingFactor = settings.isScaled 
    ? { x: settings.imageScaleFactor, y: settings.imageScaleFactor }
    : { x: 1, y: 1 };
  const scaleFactor = Math.max(scalingFactor.x, scalingFactor.y);
  
  // Appearing edges (growing from start to end)
  diff.addedEdges.forEach(edge => {
    const fromNode = graph.getNode(edge.fromId);
    const toNode = graph.getNode(edge.toId);
    
    if (fromNode && toNode) {
      const fromPos = fromNode.coordinates;
      const toPos = toNode.coordinates;
      
      // Scale coordinates (same as Graph.toDrawables())
      const scaledFromX = fromPos.x * scalingFactor.x;
      const scaledFromY = fromPos.y * scalingFactor.y;
      const scaledToX = toPos.x * scalingFactor.x;
      const scaledToY = toPos.y * scalingFactor.y;
      
      // Start from 0.01 instead of 0 so the line is always visible
      const visibleProgress = Math.max(0.01, progress);
      
      const partialLine = new PartialLine(
        { x: scaledFromX, y: scaledFromY },
        { x: scaledToX, y: scaledToY },
        visibleProgress,
        true, // zigZagged
        edge.color,
        edge.weight * scaleFactor,
        graph.zigzagSpacing * scaleFactor,
        graph.zigzagLength * scaleFactor,
        graph.zigzagEndLengths * scaleFactor
      );
      
      drawables.push(partialLine);
    }
  });
  
  // Disappearing edges (shrinking from end to start)
  diff.removedEdges.forEach(edge => {
    // Check if nodes exist in current graph state
    try {
      const fromNode = graph.getNode(edge.fromId);
      const toNode = graph.getNode(edge.toId);
      
      if (fromNode && toNode) {
        const fromPos = fromNode.coordinates;
        const toPos = toNode.coordinates;
        
        // Scale coordinates (same as Graph.toDrawables())
        const scaledFromX = fromPos.x * scalingFactor.x;
        const scaledFromY = fromPos.y * scalingFactor.y;
        const scaledToX = toPos.x * scalingFactor.x;
        const scaledToY = toPos.y * scalingFactor.y;
        
        // Shrink from full to nothing
        const remainingProgress = 1 - progress;
        
        const partialLine = new PartialLine(
          { x: scaledFromX, y: scaledFromY },
          { x: scaledToX, y: scaledToY },
          remainingProgress,
          true, // zigZagged
          edge.color,
          edge.weight * scaleFactor,
          graph.zigzagSpacing * scaleFactor,
          graph.zigzagLength * scaleFactor,
          graph.zigzagEndLengths * scaleFactor
        );
        
        drawables.push(partialLine);
      }
    } catch (e) {
      // Node doesn't exist, skip this edge
    }
  });
  
  return drawables;
}

/**
 * Create partial drawables for appearing/disappearing arrows
 */
export function createArrowAnimationDrawables(
  graph: Graph,
  diff: GraphStateDiff,
  progress: number
): Drawable[] {
  const drawables: Drawable[] = [];
  // Get the current scaling factor from GlobalSettings when in scaled mode
  // This matches how ScalingService works - when isScaled is true, use imageScaleFactor
  const settings = GlobalSettings.instance;
  const scalingFactor = settings.isScaled 
    ? { x: settings.imageScaleFactor, y: settings.imageScaleFactor }
    : { x: 1, y: 1 };
  const scaleFactor = Math.max(scalingFactor.x, scalingFactor.y);
  
  // Appearing arrows (growing from start to end)
  diff.addedArrows.forEach(arrow => {
    const fromNode = graph.getNode(arrow.fromId);
    const toNode = graph.getNode(arrow.toId);
    
    if (fromNode && toNode) {
      const fromPos = fromNode.coordinates;
      const toPos = toNode.coordinates;
      
      // Calculate partial end point
      const dx = toPos.x - fromPos.x;
      const dy = toPos.y - fromPos.y;
      const partialEndX = fromPos.x + dx * progress;
      const partialEndY = fromPos.y + dy * progress;
      
      // Scale coordinates (same as Graph.toDrawables())
      const scaledFromX = fromPos.x * scalingFactor.x;
      const scaledFromY = fromPos.y * scalingFactor.y;
      const scaledPartialEndX = partialEndX * scalingFactor.x;
      const scaledPartialEndY = partialEndY * scalingFactor.y;
      
      // Check if an edge exists between the same nodes for offset
      const hasEdge = graph.hasEdgeBetween(arrow.fromId, arrow.toId);
      const offset = hasEdge ? 8 * scaleFactor : 0;
      
      // Only show arrow heads when progress is high enough (> 0.9)
      const showHeads = progress > 0.9;
      
      const arrowLine = new ArrowLine(
        { x: scaledFromX, y: scaledFromY },
        { x: scaledPartialEndX, y: scaledPartialEndY },
        arrow.color,
        arrow.width * scaleFactor,
        arrow.headAtStart && showHeads,
        arrow.headAtEnd && showHeads,
        offset,
        fromNode.radius * scaleFactor,
        toNode.radius * scaleFactor
      );
      
      drawables.push(arrowLine);
    }
  });
  
  // Disappearing arrows (shrinking from end to start)
  diff.removedArrows.forEach(arrow => {
    try {
      const fromNode = graph.getNode(arrow.fromId);
      const toNode = graph.getNode(arrow.toId);
      
      if (fromNode && toNode) {
        const fromPos = fromNode.coordinates;
        const toPos = toNode.coordinates;
        
        // Calculate partial end point
        const remainingProgress = 1 - progress;
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const partialEndX = fromPos.x + dx * remainingProgress;
        const partialEndY = fromPos.y + dy * remainingProgress;
        
        // Scale coordinates (same as Graph.toDrawables())
        const scaledFromX = fromPos.x * scalingFactor.x;
        const scaledFromY = fromPos.y * scalingFactor.y;
        const scaledPartialEndX = partialEndX * scalingFactor.x;
        const scaledPartialEndY = partialEndY * scalingFactor.y;
        
        const hasEdge = graph.hasEdgeBetween(arrow.fromId, arrow.toId);
        const offset = hasEdge ? 8 * scaleFactor : 0;
        
        // Keep arrow heads visible while shrinking (until progress > 0.1)
        const showHeads = remainingProgress > 0.1;
        
        const arrowLine = new ArrowLine(
          { x: scaledFromX, y: scaledFromY },
          { x: scaledPartialEndX, y: scaledPartialEndY },
          arrow.color,
          arrow.width * scaleFactor,
          arrow.headAtStart && showHeads,
          arrow.headAtEnd && showHeads,
          offset,
          fromNode.radius * scaleFactor,
          toNode.radius * scaleFactor
        );
        
        drawables.push(arrowLine);
      }
    } catch (e) {
      // Node doesn't exist, skip this arrow
    }
  });
  
  return drawables;
}

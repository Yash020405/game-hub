'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Target, Trophy, Zap, ArrowRight, MapPin, Route, CheckCircle, Lightbulb } from 'lucide-react';
import GameLayout from '@/components/GameLayout';
import toast from 'react-hot-toast';
import Confetti from 'react-confetti';

interface Node {
  id: number;
  x: number;
  y: number;
  connections: { targetId: number; weight: number }[];
  distance: number;
  visited: boolean;
  current: boolean;
  path: boolean;
  previous: number | null;
  label: string;
}

interface GameState {
  nodes: Node[];
  userPath: number[];
  userDistance: number;
  optimalDistance: number;
  score: number;
  level: number;
  gameStarted: boolean;
  gameWon: boolean;
  startNode: number;
  endNode: number;
  isSelectingPath: boolean;
  showOptimal: boolean;
  showDijkstraDemo: boolean;
  dijkstraSteps: Node[][];
  currentDijkstraStep: number;
}

const generateComplexWeightedGraph = (level: number): Node[] => {
  const nodeCount = Math.min(6 + level, 10);
  const nodes: Node[] = [];
  
  // Create a cleaner grid-based layout for better visibility
  const gridSize = Math.ceil(Math.sqrt(nodeCount));
  const spacing = 140; // Increased spacing
  const offsetX = 80;
  const offsetY = 80;
  
  let nodeId = 0;
  for (let row = 0; row < gridSize && nodeId < nodeCount; row++) {
    for (let col = 0; col < gridSize && nodeId < nodeCount; col++) {
      // Add some controlled randomness for natural look
      const randomOffsetX = (Math.random() - 0.5) * 40;
      const randomOffsetY = (Math.random() - 0.5) * 40;
      
      const x = offsetX + col * spacing + randomOffsetX;
      const y = offsetY + row * spacing + randomOffsetY;
      
      nodes.push({
        id: nodeId,
        x,
        y,
        connections: [],
        distance: Infinity,
        visited: false,
        current: false,
        path: false,
        previous: null,
        label: String.fromCharCode(65 + nodeId)
      });
      nodeId++;
    }
  }
  
  // Create strategic connections with reasonable weights
  for (let i = 0; i < nodes.length; i++) {
    const maxConnections = Math.min(3, nodes.length - 1);
    let connectionCount = 0;
    
    // Connect to nearby nodes for better visualization
    for (let j = 0; j < nodes.length && connectionCount < maxConnections; j++) {
      if (i === j) continue;
      
      const distance = Math.sqrt(
        Math.pow(nodes[i].x - nodes[j].x, 2) + 
        Math.pow(nodes[i].y - nodes[j].y, 2)
      );
      
      // Only connect nodes within reasonable distance
      if (distance < spacing * 1.8) {
        const alreadyConnected = nodes[i].connections.some(c => c.targetId === j) ||
                                nodes[j].connections.some(c => c.targetId === i);
        
        if (!alreadyConnected && Math.random() < 0.7) {
          const weight = Math.floor(distance / 20) + Math.floor(Math.random() * 8) + 1;
          
          nodes[i].connections.push({ targetId: j, weight });
          nodes[j].connections.push({ targetId: i, weight });
          connectionCount++;
        }
      }
    }
  }
  
  // Ensure connectivity
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].connections.length === 0) {
      // Find nearest unconnected node
      let nearest = -1;
      let minDistance = Infinity;
      
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        
        const alreadyConnected = nodes[i].connections.some(c => c.targetId === j);
        if (alreadyConnected) continue;
        
        const distance = Math.sqrt(
          Math.pow(nodes[i].x - nodes[j].x, 2) + 
          Math.pow(nodes[i].y - nodes[j].y, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearest = j;
        }
      }
      
      if (nearest !== -1) {
        const weight = Math.floor(minDistance / 20) + 5;
        nodes[i].connections.push({ targetId: nearest, weight });
        nodes[nearest].connections.push({ targetId: i, weight });
      }
    }
  }
  
  return nodes;
};

const dijkstra = (nodes: Node[], startId: number, endId: number): { distance: number; path: number[]; steps: Node[][] } => {
  const nodesCopy = nodes.map(node => ({ ...node }));
  nodesCopy[startId].distance = 0;
  const unvisited = new Set(nodesCopy.map((_, i) => i));
  const steps: Node[][] = [];
  
  while (unvisited.size > 0) {
    let minDistance = Infinity;
    let currentId = -1;
    
    for (const id of unvisited) {
      if (nodesCopy[id].distance < minDistance) {
        minDistance = nodesCopy[id].distance;
        currentId = id;
      }
    }
    
    if (currentId === -1 || minDistance === Infinity) break;
    
    unvisited.delete(currentId);
    nodesCopy[currentId].visited = true;
    nodesCopy[currentId].current = true;
    
    // Add step
    steps.push(nodesCopy.map(node => ({ ...node })));
    
    for (const connection of nodesCopy[currentId].connections) {
      const neighborId = connection.targetId;
      if (unvisited.has(neighborId)) {
        const newDistance = nodesCopy[currentId].distance + connection.weight;
        if (newDistance < nodesCopy[neighborId].distance) {
          nodesCopy[neighborId].distance = newDistance;
          nodesCopy[neighborId].previous = currentId;
        }
      }
    }
    
    nodesCopy[currentId].current = false;
  }
  
  // Reconstruct path
  const path: number[] = [];
  let current = endId;
  while (current !== startId && current !== null) {
    path.unshift(current);
    current = nodesCopy[current].previous!;
  }
  if (current === startId) {
    path.unshift(startId);
  }
  
  return { distance: nodesCopy[endId].distance, path, steps };
};

export default function ShortestPathGame() {
  const [gameState, setGameState] = useState<GameState>({
    nodes: [],
    userPath: [],
    userDistance: 0,
    optimalDistance: 0,
    score: 0,
    level: 1,
    gameStarted: false,
    gameWon: false,
    startNode: 0,
    endNode: 1,
    isSelectingPath: false,
    showOptimal: false,
    showDijkstraDemo: false,
    dijkstraSteps: [],
    currentDijkstraStep: 0
  });

  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  const initializeGame = useCallback(() => {
    const newNodes = generateComplexWeightedGraph(gameState.level);
    const startNode = 0;
    const endNode = newNodes.length - 1;
    
    const optimal = dijkstra(newNodes, startNode, endNode);
    
    setGameState(prev => ({
      ...prev,
      nodes: newNodes,
      userPath: [],
      userDistance: 0,
      optimalDistance: optimal.distance,
      gameStarted: true,
      gameWon: false,
      startNode,
      endNode,
      isSelectingPath: false,
      showOptimal: false,
      showDijkstraDemo: false,
      dijkstraSteps: optimal.steps,
      currentDijkstraStep: 0
    }));
  }, [gameState.level]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const handleNodeClick = (nodeId: number) => {
    if (gameState.gameWon || gameState.showOptimal || gameState.showDijkstraDemo) return;

    const newUserPath = [...gameState.userPath];
    
    // First click must be start node
    if (newUserPath.length === 0) {
      if (nodeId !== gameState.startNode) {
        toast.error(`Start from node ${gameState.nodes[gameState.startNode].label}!`);
        return;
      }
      newUserPath.push(nodeId);
      setGameState(prev => ({
        ...prev,
        userPath: newUserPath,
        isSelectingPath: true
      }));
      
      if (nodeId === gameState.endNode) {
        completeLevel(0);
        return;
      }
      
      toast.success(`Started! Find shortest path to ${gameState.nodes[gameState.endNode].label}!`);
      return;
    }

    // Check if the clicked node is connected to the current node
    const currentNodeId = newUserPath[newUserPath.length - 1];
    const currentNode = gameState.nodes[currentNodeId];
    const connection = currentNode.connections.find(c => c.targetId === nodeId);
    
    if (!connection) {
      toast.error('Not connected! Choose an adjacent node.');
      return;
    }

    // Check if already in path
    if (newUserPath.includes(nodeId)) {
      toast.error('Already in path! Choose a different node.');
      return;
    }

    newUserPath.push(nodeId);
    const newDistance = gameState.userDistance + connection.weight;
    
    setGameState(prev => ({
      ...prev,
      userPath: newUserPath,
      userDistance: newDistance
    }));

    // Check if reached target
    if (nodeId === gameState.endNode) {
      completeLevel(newDistance);
    } else {
      toast.success(`Added ${gameState.nodes[nodeId].label} (total distance: ${newDistance})`);
    }
  };

  const completeLevel = (totalDistance: number) => {
    const efficiency = gameState.optimalDistance > 0 ? (gameState.optimalDistance / totalDistance) * 100 : 100;
    const bonus = Math.floor(efficiency * 15);
    const newScore = gameState.score + 25 + bonus;
    
    setGameState(prev => ({
      ...prev,
      gameWon: true,
      score: newScore,
      level: prev.level + 1
    }));
    
    const message = totalDistance === gameState.optimalDistance 
      ? '🎉 Perfect! Optimal path found!' 
      : `Path found! Efficiency: ${efficiency.toFixed(1)}%`;
    
    toast.success(`${message} +${1000 + bonus} points`);
  };

  const showOptimalPath = () => {
    const optimal = dijkstra(gameState.nodes, gameState.startNode, gameState.endNode);
    
    setGameState(prev => ({
      ...prev,
      showOptimal: true,
      nodes: prev.nodes.map(node => ({
        ...node,
        path: optimal.path.includes(node.id)
      }))
    }));
    
    toast(`Optimal path shown! Distance: ${optimal.distance}`);
  };

  const startDijkstraDemo = () => {
    setGameState(prev => ({
      ...prev,
      showDijkstraDemo: true,
      currentDijkstraStep: 0,
      nodes: prev.dijkstraSteps[0] || prev.nodes
    }));
  };

  const nextDijkstraStep = () => {
    if (gameState.currentDijkstraStep < gameState.dijkstraSteps.length - 1) {
      const nextStep = gameState.currentDijkstraStep + 1;
      setGameState(prev => ({
        ...prev,
        currentDijkstraStep: nextStep,
        nodes: prev.dijkstraSteps[nextStep]
      }));
    }
  };

  const resetGame = () => {
    initializeGame();
  };

  const clearPath = () => {
    setGameState(prev => ({
      ...prev,
      userPath: [],
      userDistance: 0,
      isSelectingPath: false,
      showOptimal: false,
      showDijkstraDemo: false,
      nodes: prev.nodes.map(node => ({ ...node, path: false, visited: false, current: false }))
    }));
  };

  const getNodeColor = (node: Node) => {
    if (node.id === gameState.startNode) return "#10b981"; // Green for start
    if (node.id === gameState.endNode) return "#ef4444"; // Red for end
    if (node.path && gameState.showOptimal) return "#f59e0b"; // Yellow for optimal path
    if (node.current && gameState.showDijkstraDemo) return "#3b82f6"; // Blue for current in demo
    if (node.visited && gameState.showDijkstraDemo) return "#8b5cf6"; // Purple for visited in demo
    if (gameState.userPath.includes(node.id)) return "#06b6d4"; // Cyan for user path
    return "#6b7280"; // Gray for unvisited
  };

  const getEdgeColor = (fromId: number, toId: number) => {
    if (gameState.showOptimal && gameState.nodes[fromId].path && gameState.nodes[toId].path) {
      return "#f59e0b"; // Yellow for optimal path
    }
    
    const fromIndex = gameState.userPath.indexOf(fromId);
    const toIndex = gameState.userPath.indexOf(toId);
    
    if (fromIndex >= 0 && toIndex >= 0 && Math.abs(fromIndex - toIndex) === 1) {
      return "#06b6d4"; // Cyan for user path
    }
    
    return "#6b7280"; // Gray for unused
  };

  return (
    <GameLayout
      title="Shortest Path Challenge"
      description="Find optimal routes through complex weighted graphs!"
      score={gameState.score}
      level={gameState.level}
    >
      {gameState.gameWon && <Confetti width={windowSize.width} height={windowSize.height} />}
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Enhanced Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-900/30 via-blue-900/30 to-cyan-900/30 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-8 shadow-2xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-lg font-bold text-green-400">Start</div>
                <div className="text-sm text-green-200">
                  {gameState.nodes[gameState.startNode]?.label || '?'}
                </div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-400">Target</div>
                <div className="text-sm text-red-200">
                  {gameState.nodes[gameState.endNode]?.label || '?'}
                </div>
              </div>
              <div>
                <div className="text-lg font-bold text-cyan-400">Your Distance</div>
                <div className="text-sm text-cyan-200">{gameState.userDistance}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-400">Optimal</div>
                <div className="text-sm text-yellow-200">{gameState.optimalDistance}</div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startDijkstraDemo}
                disabled={gameState.showDijkstraDemo}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
              >
                <Target className="w-5 h-5 inline mr-2" />
                Dijkstra Demo
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={showOptimalPath}
                disabled={gameState.showOptimal}
                className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl font-medium hover:from-yellow-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
              >
                <Route className="w-5 h-5 inline mr-2" />
                Show Optimal
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearPath}
                className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg"
              >
                Clear Path
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resetGame}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-pink-700 transition-all duration-300 shadow-lg"
              >
                <RotateCcw className="w-5 h-5 inline mr-2" />
                New Challenge
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Dijkstra Demo Controls */}
        {gameState.showDijkstraDemo && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="text-white">
                <strong>Dijkstra's Algorithm Demo</strong> - Step {gameState.currentDijkstraStep + 1}/{gameState.dijkstraSteps.length}
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={nextDijkstraStep}
                disabled={gameState.currentDijkstraStep >= gameState.dijkstraSteps.length - 1}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Next Step
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Current Path Display */}
        {gameState.userPath.length > 0 && !gameState.showDijkstraDemo && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-6"
          >
            <h3 className="text-lg font-bold text-white mb-3">Your Path (Distance: {gameState.userDistance}):</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {gameState.userPath.map((nodeId, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="px-3 py-1 bg-cyan-600 text-white rounded-lg font-bold">
                    {gameState.nodes[nodeId]?.label}
                  </div>
                  {index < gameState.userPath.length - 1 && (
                    <div className="flex items-center gap-1">
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-400">
                        {gameState.nodes[gameState.userPath[index]]?.connections.find(c => c.targetId === gameState.userPath[index + 1])?.weight}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Graph Visualization */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-8"
        >
          <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-lg rounded-3xl p-12 border-2 border-white/20 shadow-2xl">
            <svg width="800" height="600" className="w-full h-full" style={{ filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.3))' }}>
              {/* Background grid for better reference */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Edge shadows */}
              {gameState.nodes.map((node) =>
                node.connections.map((connection) => {
                  const target = gameState.nodes.find(n => n.id === connection.targetId);
                  if (!target || connection.targetId < node.id) return null;
                  
                  return (
                    <line
                      key={`shadow-${node.id}-${connection.targetId}`}
                      x1={node.x + 2}
                      y1={node.y + 2}
                      x2={target.x + 2}
                      y2={target.y + 2}
                      stroke="rgba(0,0,0,0.3)"
                      strokeWidth={getEdgeColor(node.id, connection.targetId) === "#6b7280" ? 3 : 6}
                    />
                  );
                })
              )}
              
              {/* Connections */}
              {gameState.nodes.map((node) =>
                node.connections.map((connection) => {
                  const target = gameState.nodes.find(n => n.id === connection.targetId);
                  if (!target || connection.targetId < node.id) return null;
                  
                  const edgeColor = getEdgeColor(node.id, connection.targetId);
                  const isHighlighted = edgeColor !== "#6b7280";
                  
                  return (
                    <g key={`${node.id}-${connection.targetId}`}>
                      <line
                        x1={node.x}
                        y1={node.y}
                        x2={target.x}
                        y2={target.y}
                        stroke={edgeColor}
                        strokeWidth={isHighlighted ? 6 : 3}
                        strokeLinecap="round"
                        style={{ filter: isHighlighted ? 'drop-shadow(0 0 8px currentColor)' : 'none' }}
                      />
                      
                      {/* Weight label with better background */}
                      <g>
                        <rect
                          x={(node.x + target.x) / 2 - 15}
                          y={(node.y + target.y) / 2 - 18}
                          width="30"
                          height="20"
                          fill="rgba(0,0,0,0.8)"
                          stroke="rgba(255,255,255,0.3)"
                          strokeWidth="1"
                          rx="4"
                        />
                        <text
                          x={(node.x + target.x) / 2}
                          y={(node.y + target.y) / 2 - 4}
                          textAnchor="middle"
                          fill="white"
                          fontSize="14"
                          fontWeight="bold"
                        >
                          {connection.weight}
                        </text>
                      </g>
                    </g>
                  );
                })
              )}

              {/* Node shadows */}
              {gameState.nodes.map((node) => (
                <circle
                  key={`shadow-${node.id}`}
                  cx={node.x + 3}
                  cy={node.y + 3}
                  r={node.id === gameState.startNode || node.id === gameState.endNode ? 36 : 30}
                  fill="rgba(0,0,0,0.3)"
                />
              ))}

              {/* Nodes */}
              {gameState.nodes.map((node) => {
                const isSpecial = node.id === gameState.startNode || node.id === gameState.endNode;
                const radius = isSpecial ? 35 : 28;
                const nodeColor = getNodeColor(node);
                
                return (
                  <g key={node.id}>
                    {/* Node border/glow effect */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={radius + 4}
                      fill="none"
                      stroke={nodeColor}
                      strokeWidth="3"
                      opacity="0.6"
                      style={{ filter: 'blur(2px)' }}
                    />
                    
                    {/* Main node */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={radius}
                      fill={nodeColor}
                      stroke="white"
                      strokeWidth="3"
                      className="cursor-pointer transition-all duration-200 hover:stroke-yellow-300 hover:stroke-4"
                      onClick={() => handleNodeClick(node.id)}
                      style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.5))' }}
                    />
                    
                    {/* Node label */}
                    <text
                      x={node.x}
                      y={node.y + 6}
                      textAnchor="middle"
                      fill="white"
                      fontSize="16"
                      fontWeight="bold"
                    >
                      {node.label}
                    </text>
                    
                    {/* Distance labels for Dijkstra demo */}
                    {gameState.showDijkstraDemo && node.distance !== Infinity && (
                      <text
                        x={node.x}
                        y={node.y - 40}
                        textAnchor="middle"
                        fill="#fbbf24"
                        fontSize="12"
                        fontWeight="bold"
                      >
                        d: {node.distance}
                      </text>
                    )}
                    
                    {/* Node indicators */}
                    {node.id === gameState.startNode && (
                      <text
                        x={node.x}
                        y={node.y - 50}
                        textAnchor="middle"
                        fill="#10b981"
                        fontSize="12"
                        fontWeight="bold"
                      >
                        START
                      </text>
                    )}
                    {node.id === gameState.endNode && (
                      <text
                        x={node.x}
                        y={node.y - 50}
                        textAnchor="middle"
                        fill="#ef4444"
                        fontSize="12"
                        fontWeight="bold"
                      >
                        TARGET
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </motion.div>

        {/* Instructions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">How to Play</h3>
            <div className="space-y-2 text-blue-200">
              <div>• Start from the GREEN node</div>
              <div>• Click adjacent nodes to build your path</div>
              <div>• Edge weights show the cost of each move</div>
              <div>• Find the RED target with minimum total distance</div>
              <div>• Use Dijkstra demo to see the optimal algorithm</div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Path Colors</h3>
            <div className="space-y-2 text-purple-200">
              <div>• <strong>Green:</strong> Start node</div>
              <div>• <strong>Red:</strong> Target node</div>
              <div>• <strong>Cyan:</strong> Your selected path</div>
              <div>• <strong>Yellow:</strong> Optimal path (when shown)</div>
              <div>• <strong>Blue/Purple:</strong> Dijkstra algorithm progress</div>
            </div>
          </div>
        </motion.div>

        {/* Success Modal */}
        <AnimatePresence>
          {gameState.gameWon && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-gradient-to-br from-purple-900/90 to-blue-900/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-white/20 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
              >
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle className="w-8 h-8 text-white" />
                  </motion.div>
                  
                  <h2 className="text-2xl font-bold text-white mb-2">Path Found!</h2>
                  <p className="text-blue-200 mb-6">
                    {gameState.userDistance === gameState.optimalDistance 
                      ? 'Perfect! You found the optimal path!' 
                      : 'Good job! Try to find shorter paths next time.'}
                  </p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between">
                      <span className="text-blue-200">Your Distance:</span>
                      <span className="text-white font-bold">{gameState.userDistance}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-200">Optimal Distance:</span>
                      <span className="text-white font-bold">{gameState.optimalDistance}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-200">Score:</span>
                      <span className="text-white font-bold">{gameState.score.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setGameState(prev => ({
                          ...prev,
                          gameWon: false,
                          level: prev.level + 1,
                          userPath: [],
                          userDistance: 0,
                          isSelectingPath: false,
                          showOptimal: false,
                          showDijkstraDemo: false,
                          dijkstraSteps: [],
                          currentDijkstraStep: 0
                        }));
                        
                        // Generate new graph for next level
                        setTimeout(() => {
                          const newNodes = generateComplexWeightedGraph(gameState.level + 1);
                          const startNode = 0;
                          const endNode = newNodes.length - 1;
                          const optimal = dijkstra(newNodes, startNode, endNode);
                          
                          setGameState(prev => ({
                            ...prev,
                            nodes: newNodes,
                            startNode,
                            endNode,
                            optimalDistance: optimal.distance
                          }));
                        }, 100);
                        
                        toast.success(`Level ${gameState.level + 1} - New Graph Generated!`);
                      }}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200 text-center min-h-[44px] flex items-center justify-center"
                    >
                      Next Challenge
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={resetGame}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-200 text-center min-h-[44px] flex items-center justify-center"
                    >
                      Play Again
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GameLayout>
  );
}
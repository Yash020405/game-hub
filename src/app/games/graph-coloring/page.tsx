'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Palette, Trophy, Zap, CheckCircle, Lightbulb, Target } from 'lucide-react';
import GameLayout from '@/components/GameLayout';
import toast from 'react-hot-toast';
import Confetti from 'react-confetti';

interface Node {
  id: number;
  x: number;
  y: number;
  connections: number[];
  color: number | null;
  label: string;
}

interface GameState {
  nodes: Node[];
  availableColors: string[];
  selectedColor: number;
  score: number;
  level: number;
  gameStarted: boolean;
  gameWon: boolean;
  moves: number;
  colorsUsed: number;
  isComplete: boolean;
  chromaticNumber: number | null;
}

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

const generateComplexGraph = (level: number): Node[] => {
  const nodeCount = Math.min(6 + level * 2, 15);
  const nodes: Node[] = [];
  
  // Create a more challenging graph structure
  if (level <= 2) {
    // Simple cycle for early levels
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * 2 * Math.PI;
      const radius = 150;
      const x = Math.cos(angle) * radius + 300;
      const y = Math.sin(angle) * radius + 200;
      
      nodes.push({
        id: i,
        x,
        y,
        connections: [],
        color: null,
        label: String.fromCharCode(65 + i)
      });
    }
    
    // Connect in a cycle
    for (let i = 0; i < nodeCount; i++) {
      nodes[i].connections.push((i + 1) % nodeCount);
      nodes[i].connections.push((i - 1 + nodeCount) % nodeCount);
    }
  } else if (level <= 4) {
    // Wheel graph (cycle + center node)
    for (let i = 0; i < nodeCount - 1; i++) {
      const angle = (i / (nodeCount - 1)) * 2 * Math.PI;
      const radius = 150;
      const x = Math.cos(angle) * radius + 300;
      const y = Math.sin(angle) * radius + 200;
      
      nodes.push({
        id: i,
        x,
        y,
        connections: [],
        color: null,
        label: String.fromCharCode(65 + i)
      });
    }
    
    // Add center node
    nodes.push({
      id: nodeCount - 1,
      x: 300,
      y: 200,
      connections: [],
      color: null,
      label: String.fromCharCode(65 + nodeCount - 1)
    });
    
    // Connect outer nodes in a cycle
    for (let i = 0; i < nodeCount - 1; i++) {
      nodes[i].connections.push((i + 1) % (nodeCount - 1));
      nodes[i].connections.push((i - 1 + nodeCount - 1) % (nodeCount - 1));
      // Connect to center
      nodes[i].connections.push(nodeCount - 1);
      nodes[nodeCount - 1].connections.push(i);
    }
  } else {
    // More complex graph for higher levels
    // Create multiple clusters
    const clusters = Math.min(3 + Math.floor(level / 2), 4);
    const nodesPerCluster = Math.ceil(nodeCount / clusters);
    
    let nodeId = 0;
    for (let cluster = 0; cluster < clusters && nodeId < nodeCount; cluster++) {
      const centerX = 200 + (cluster % 2) * 300;
      const centerY = 150 + Math.floor(cluster / 2) * 300;
      const clusterSize = Math.min(nodesPerCluster, nodeCount - nodeId);
      
      for (let i = 0; i < clusterSize; i++) {
        const angle = (i / clusterSize) * 2 * Math.PI;
        const radius = 80;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        nodes.push({
          id: nodeId,
          x,
          y,
          connections: [],
          color: null,
          label: String.fromCharCode(65 + nodeId)
        });
        nodeId++;
      }
    }
    
    // Create dense connections within clusters
    for (let cluster = 0; cluster < clusters; cluster++) {
      const clusterStart = cluster * nodesPerCluster;
      const clusterEnd = Math.min(clusterStart + nodesPerCluster, nodeCount);
      
      // Make clusters nearly complete graphs
      for (let i = clusterStart; i < clusterEnd; i++) {
        for (let j = i + 1; j < clusterEnd; j++) {
          if (Math.random() < 0.8) { // 80% chance of connection within cluster
            nodes[i].connections.push(j);
            nodes[j].connections.push(i);
          }
        }
      }
    }
    
    // Add some inter-cluster connections
    for (let cluster1 = 0; cluster1 < clusters; cluster1++) {
      for (let cluster2 = cluster1 + 1; cluster2 < clusters; cluster2++) {
        const cluster1Start = cluster1 * nodesPerCluster;
        const cluster1End = Math.min(cluster1Start + nodesPerCluster, nodeCount);
        const cluster2Start = cluster2 * nodesPerCluster;
        const cluster2End = Math.min(cluster2Start + nodesPerCluster, nodeCount);
        
        // Add 1-2 connections between clusters
        const connectionCount = Math.floor(Math.random() * 2) + 1;
        for (let c = 0; c < connectionCount; c++) {
          const node1 = cluster1Start + Math.floor(Math.random() * (cluster1End - cluster1Start));
          const node2 = cluster2Start + Math.floor(Math.random() * (cluster2End - cluster2Start));
          
          if (!nodes[node1].connections.includes(node2)) {
            nodes[node1].connections.push(node2);
            nodes[node2].connections.push(node1);
          }
        }
      }
    }
  }
  
  return nodes;
};

const calculateChromaticNumber = (nodes: Node[]): number => {
  // Simple greedy coloring to estimate minimum colors needed
  const nodesCopy: Node[] = nodes.map(node => ({ ...node, color: null }));
  let maxColor = 0;
  
  for (let i = 0; i < nodesCopy.length; i++) {
    const usedColors = new Set<number>();
    
    for (const neighborId of nodesCopy[i].connections) {
      if (nodesCopy[neighborId].color !== null) {
        usedColors.add(nodesCopy[neighborId].color);
      }
    }
    
    let color = 0;
    while (usedColors.has(color)) {
      color++;
    }
    
    nodesCopy[i].color = color;
    maxColor = Math.max(maxColor, color);
  }
  
  return maxColor + 1;
};

export default function GraphColoringGame() {
  const [gameState, setGameState] = useState<GameState>({
    nodes: [],
    availableColors: COLORS.slice(0, 8),
    selectedColor: 0,
    score: 0,
    level: 1,
    gameStarted: false,
    gameWon: false,
    moves: 0,
    colorsUsed: 0,
    isComplete: false,
    chromaticNumber: null
  });

  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  const initializeGame = useCallback(() => {
    const newNodes = generateComplexGraph(gameState.level);
    const availableColors = COLORS.slice(0, Math.min(8, newNodes.length));
    const chromaticNumber = calculateChromaticNumber(newNodes);
    
    setGameState(prev => ({
      ...prev,
      nodes: newNodes,
      availableColors,
      selectedColor: 0,
      gameStarted: true,
      gameWon: false,
      moves: 0,
      colorsUsed: 0,
      isComplete: false,
      chromaticNumber
    }));
  }, [gameState.level]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const colorNode = (nodeId: number) => {
    if (!gameState.gameStarted || gameState.gameWon) return;
    
    const node = gameState.nodes[nodeId];
    const selectedColorValue = gameState.selectedColor;
    
    // Check if coloring is valid
    const hasConflict = node.connections.some(neighborId => {
      const neighbor = gameState.nodes[neighborId];
      return neighbor.color === selectedColorValue;
    });
    
    if (hasConflict) {
      toast.error('Invalid coloring! Adjacent nodes cannot have the same color.');
      return;
    }
    
    // Apply color
    const newNodes = [...gameState.nodes];
    const oldColor = newNodes[nodeId].color;
    newNodes[nodeId].color = selectedColorValue;
    
    // Calculate colors used
    const usedColors = new Set(newNodes.map(node => node.color).filter(c => c !== null));
    const colorsUsed = usedColors.size;
    
    setGameState(prev => ({
      ...prev,
      nodes: newNodes,
      moves: prev.moves + 1,
      colorsUsed
    }));
    
    // Check if all nodes are colored
    const allColored = newNodes.every(node => node.color !== null);
    if (allColored) {
      const isOptimal = colorsUsed === gameState.chromaticNumber;
      const colorBonus = Math.max(0, (gameState.availableColors.length - colorsUsed) * 300);
      const moveBonus = Math.max(0, (50 - gameState.moves) * 20);
      const optimalBonus = isOptimal ? 2000 : 0;
      const newScore = gameState.score + 25 + colorBonus + moveBonus + optimalBonus;
      
      setGameState(prev => ({
        ...prev,
        gameWon: true,
        score: newScore,
        level: prev.level + 1,
        isComplete: true
      }));
      
      const message = isOptimal 
        ? `🎉 Perfect! Optimal coloring with ${colorsUsed} colors!`
        : `Graph colored with ${colorsUsed} colors! (Optimal: ${gameState.chromaticNumber})`;
      
      toast.success(`${message} +${1000 + colorBonus + moveBonus + optimalBonus} points`);
    } else {
      toast.success(`Node ${node.label} colored!`);
    }
  };

  const resetGame = () => {
    initializeGame();
  };

  const clearColors = () => {
    const newNodes = gameState.nodes.map(node => ({ ...node, color: null }));
    setGameState(prev => ({
      ...prev,
      nodes: newNodes,
      moves: 0,
      colorsUsed: 0,
      isComplete: false
    }));
  };

  const giveHint = () => {
    // Find a node that can be colored with the current color
    const uncoloredNodes = gameState.nodes.filter(node => node.color === null);
    
    if (uncoloredNodes.length === 0) {
      toast('All nodes are already colored!');
      return;
    }
    
    const validNode = uncoloredNodes.find(node => {
      return !node.connections.some(neighborId => {
        const neighbor = gameState.nodes[neighborId];
        return neighbor.color === gameState.selectedColor;
      });
    });
    
    if (validNode) {
      toast(`Hint: Node ${validNode.label} can be colored with the current color!`);
    } else {
      toast('Try selecting a different color for the remaining nodes.');
    }
  };

  const isValidColoring = () => {
    return gameState.nodes.every(node => {
      if (node.color === null) return true;
      return !node.connections.some(neighborId => {
        const neighbor = gameState.nodes[neighborId];
        return neighbor.color === node.color;
      });
    });
  };

  return (
    <GameLayout
      title="Graph Coloring Challenge"
      description="Color vertices optimally with no adjacent conflicts!"
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
            <div className="flex items-center gap-6">
              <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-purple-400 flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Colors Used
                </div>
                <div className="text-sm text-purple-200">{gameState.colorsUsed}</div>
              </motion.div>
              <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-blue-400 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Moves
                </div>
                <div className="text-sm text-blue-200">{gameState.moves}</div>
              </motion.div>
              <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-green-400 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Colored
                </div>
                <div className="text-sm text-green-200">
                  {gameState.nodes.filter(n => n.color !== null).length}/{gameState.nodes.length}
                </div>
              </motion.div>
            </div>
            
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={giveHint}
                className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl font-medium hover:from-yellow-600 hover:to-orange-700 transition-all duration-300 shadow-lg"
              >
                <Lightbulb className="w-5 h-5 inline mr-2" />
                Hint
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearColors}
                className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg"
              >
                Clear All
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

        {/* Color Palette */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-8"
        >
          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <span className="text-white text-sm font-medium">Select Color:</span>
            <div className="flex gap-2">
              {gameState.availableColors.map((color, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setGameState(prev => ({ ...prev, selectedColor: index }))}
                  className={`w-12 h-12 rounded-full border-2 transition-all duration-200 ${
                    gameState.selectedColor === index 
                      ? 'border-white shadow-lg scale-110' 
                      : 'border-gray-400 hover:border-white'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Graph Visualization */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-white/10 shadow-2xl">
            <svg width="700" height="500" className="w-full h-full">
              {/* Connections */}
              {gameState.nodes.map((node) =>
                node.connections.map((targetId) => {
                  const target = gameState.nodes.find(n => n.id === targetId);
                  if (!target || targetId < node.id) return null;
                  
                  const hasConflict = node.color !== null && target.color !== null && node.color === target.color;
                  
                  return (
                    <motion.line
                      key={`${node.id}-${targetId}`}
                      x1={node.x}
                      y1={node.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={hasConflict ? "#ef4444" : "#6b7280"}
                      strokeWidth={hasConflict ? 4 : 2}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5 }}
                    />
                  );
                })
              )}

              {/* Nodes */}
              {gameState.nodes.map((node) => (
                <motion.g
                  key={node.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: node.id * 0.05 }}
                >
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r={25}
                    fill={node.color !== null ? gameState.availableColors[node.color] : "#374151"}
                    stroke="white"
                    strokeWidth={3}
                    className="cursor-pointer"
                    onClick={() => colorNode(node.id)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  />
                  <text
                    x={node.x}
                    y={node.y + 5}
                    textAnchor="middle"
                    fill="white"
                    fontSize="16"
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    {node.label}
                  </text>
                </motion.g>
              ))}
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
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              How to Play
            </h3>
            <div className="space-y-2 text-blue-200">
              <div>• Select a color from the palette</div>
              <div>• Click on nodes to color them</div>
              <div>• Adjacent nodes cannot have the same color</div>
              <div>• Try to use the minimum number of colors</div>
              <div>• Color all nodes to complete the level</div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Graph Coloring Theory</h3>
            <div className="space-y-2 text-purple-200">
              <div>• <strong>Chromatic Number:</strong> Minimum colors needed</div>
              <div>• <strong>NP-Complete Problem:</strong> No efficient algorithm exists</div>
              <div>• <strong>Applications:</strong> Scheduling, register allocation, map coloring</div>
              <div>• <strong>Four Color Theorem:</strong> Planar graphs need ≤4 colors</div>
              <div>• <strong>Greedy Coloring:</strong> Simple but not always optimal</div>
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
                  
                  <h2 className="text-2xl font-bold text-white mb-2">Graph Colored!</h2>
                  <p className="text-blue-200 mb-6">
                    {gameState.colorsUsed === gameState.chromaticNumber 
                      ? 'Excellent! You found the optimal coloring!'
                      : `Good job! You used ${gameState.colorsUsed} colors.`}
                  </p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between">
                      <span className="text-blue-200">Colors Used:</span>
                      <span className="text-white font-bold">{gameState.colorsUsed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-200">Optimal Colors:</span>
                      <span className="text-white font-bold">{gameState.chromaticNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-200">Moves:</span>
                      <span className="text-white font-bold">{gameState.moves}</span>
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
                          selectedColor: 0,
                          moves: 0,
                          colorsUsed: 0,
                          isComplete: false
                        }));
                        
                        // Generate new graph for next level
                        setTimeout(() => {
                          const newNodes = generateComplexGraph(gameState.level + 1);
                          const chromaticNumber = calculateChromaticNumber(newNodes);
                          
                          setGameState(prev => ({
                            ...prev,
                            nodes: newNodes,
                            chromaticNumber,
                            gameStarted: true
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
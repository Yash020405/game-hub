'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, TrendingUp, Trophy, Zap, CheckCircle, ArrowRight } from 'lucide-react';
import GameLayout from '@/components/GameLayout';
import toast from 'react-hot-toast';
import Confetti from 'react-confetti';

interface Node {
  id: number;
  x: number;
  y: number;
  label: string;
  inDegree: number;
  outgoing: number[];
  processed: boolean;
  available: boolean;
}

interface GameState {
  nodes: Node[];
  sortedOrder: number[];
  currentStep: number;
  score: number;
  level: number;
  gameStarted: boolean;
  gameWon: boolean;
  isRunning: boolean;
  dependencies: string[];
}

const generateDAG = (level: number): { nodes: Node[], dependencies: string[] } => {
  const nodeCount = Math.min(5 + level, 10);
  const nodes: Node[] = [];
  const dependencies: string[] = [];
  
  // Create nodes in layers to ensure DAG property
  const layers = Math.min(3 + Math.floor(level / 2), 5);
  const nodesPerLayer = Math.ceil(nodeCount / layers);
  
  let nodeId = 0;
  for (let layer = 0; layer < layers && nodeId < nodeCount; layer++) {
    const layerNodes = Math.min(nodesPerLayer, nodeCount - nodeId);
    
    for (let i = 0; i < layerNodes; i++) {
      const x = 100 + layer * 120;
      const y = 100 + (i * 300) / layerNodes;
      
      nodes.push({
        id: nodeId,
        x,
        y,
        label: String.fromCharCode(65 + nodeId),
        inDegree: 0,
        outgoing: [],
        processed: false,
        available: false
      });
      
      nodeId++;
    }
  }
  
  // Add dependencies (edges) between layers
  for (let i = 0; i < nodes.length; i++) {
    const currentLayer = Math.floor(i / nodesPerLayer);
    const nextLayerStart = (currentLayer + 1) * nodesPerLayer;
    const nextLayerEnd = Math.min(nextLayerStart + nodesPerLayer, nodes.length);
    
    if (nextLayerStart < nodes.length) {
      const numConnections = Math.min(1 + Math.floor(Math.random() * 2), nextLayerEnd - nextLayerStart);
      
      for (let j = 0; j < numConnections; j++) {
        const targetId = nextLayerStart + Math.floor(Math.random() * (nextLayerEnd - nextLayerStart));
        
        if (!nodes[i].outgoing.includes(targetId)) {
          nodes[i].outgoing.push(targetId);
          nodes[targetId].inDegree++;
          dependencies.push(`${nodes[i].label} → ${nodes[targetId].label}`);
        }
      }
    }
  }
  
  // Mark nodes with no incoming edges as available
  nodes.forEach(node => {
    node.available = node.inDegree === 0;
  });
  
  return { nodes, dependencies };
};

export default function TopologicalSortGame() {
  const [gameState, setGameState] = useState<GameState>({
    nodes: [],
    sortedOrder: [],
    currentStep: 0,
    score: 0,
    level: 1,
    gameStarted: false,
    gameWon: false,
    isRunning: false,
    dependencies: []
  });

  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  const initializeGame = useCallback(() => {
    const { nodes, dependencies } = generateDAG(gameState.level);
    
    setGameState(prev => ({
      ...prev,
      nodes,
      dependencies,
      sortedOrder: [],
      currentStep: 0,
      gameStarted: true,
      gameWon: false,
      isRunning: false
    }));
  }, [gameState.level]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const selectNode = (nodeId: number) => {
    if (!gameState.gameStarted || gameState.gameWon || gameState.isRunning) return;
    
    const node = gameState.nodes[nodeId];
    if (!node.available || node.processed) {
      toast.error('This node is not available yet! Check dependencies.');
      return;
    }
    
    // Process the node
    const newNodes = [...gameState.nodes];
    const newSortedOrder = [...gameState.sortedOrder, nodeId];
    
    newNodes[nodeId].processed = true;
    newNodes[nodeId].available = false;
    
    // Update availability of dependent nodes
    node.outgoing.forEach(targetId => {
      newNodes[targetId].inDegree--;
      if (newNodes[targetId].inDegree === 0 && !newNodes[targetId].processed) {
        newNodes[targetId].available = true;
      }
    });
    
    setGameState(prev => ({
      ...prev,
      nodes: newNodes,
      sortedOrder: newSortedOrder,
      currentStep: prev.currentStep + 1
    }));
    
    // Check if game is won
    if (newSortedOrder.length === gameState.nodes.length) {
      const timeBonus = Math.max(0, 300 * 10);
      const stepBonus = Math.max(0, (gameState.nodes.length - gameState.currentStep) * 50);
      const newScore = gameState.score + 25 + timeBonus + stepBonus;
      
      setGameState(prev => ({
        ...prev,
        gameWon: true,
        score: newScore,
        level: prev.level + 1
      }));
      
      toast.success(`🎉 Topological sort complete! +${1000 + timeBonus + stepBonus} points`);
    }
  };

  const resetGame = () => {
    initializeGame();
  };

  const showHint = () => {
    const availableNodes = gameState.nodes.filter(node => node.available && !node.processed);
    if (availableNodes.length > 0) {
      const hintNode = availableNodes[0];
      toast.success(`Hint: Node ${hintNode.label} is ready to be processed!`);
    }
  };

  const getNodeColor = (node: Node) => {
    if (node.processed) return "#10b981"; // Green for processed
    if (node.available) return "#3b82f6"; // Blue for available
    return "#6b7280"; // Gray for not available
  };

  return (
    <GameLayout
      title="Topological Sort"
      description="Order vertices in directed acyclic graphs!"
      score={gameState.score}
      level={gameState.level}
    >
      {gameState.gameWon && <Confetti width={windowSize.width} height={windowSize.height} />}
      
      <div className="max-w-6xl mx-auto p-6">
        {/* Game Status */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-blue-400 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Progress
                </div>
                <div className="text-sm text-blue-200">{gameState.currentStep}/{gameState.nodes.length}</div>
              </motion.div>
              <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-green-400 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Available
                </div>
                <div className="text-sm text-green-200">
                  {gameState.nodes.filter(n => n.available && !n.processed).length}
                </div>
              </motion.div>
            </div>
            
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={showHint}
                className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg font-medium hover:from-yellow-600 hover:to-orange-700 transition-all duration-200"
              >
                Hint
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resetGame}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-pink-700 transition-all duration-200"
              >
                <RotateCcw className="w-4 h-4 inline mr-2" />
                Reset
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Sorted Order Display */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-8"
        >
          <h3 className="text-lg font-bold text-white mb-4">Topological Order:</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {gameState.sortedOrder.map((nodeId, index) => (
              <motion.div
                key={nodeId}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-2"
              >
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                  {gameState.nodes[nodeId].label}
                </div>
                {index < gameState.sortedOrder.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                )}
              </motion.div>
            ))}
            {gameState.sortedOrder.length < gameState.nodes.length && (
              <div className="w-10 h-10 border-2 border-dashed border-gray-400 rounded-full flex items-center justify-center text-gray-400">
                ?
              </div>
            )}
          </div>
        </motion.div>

        {/* Graph Visualization */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-8"
        >
          <div className="relative bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-white/10 shadow-2xl">
            <svg width="600" height="400" className="w-full h-full">
              {/* Edges */}
              {gameState.nodes.map((node) =>
                node.outgoing.map((targetId) => {
                  const target = gameState.nodes[targetId];
                  
                  return (
                    <g key={`${node.id}-${targetId}`}>
                      <motion.line
                        x1={node.x}
                        y1={node.y}
                        x2={target.x}
                        y2={target.y}
                        stroke="#6b7280"
                        strokeWidth={2}
                        markerEnd="url(#arrowhead)"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5 }}
                      />
                    </g>
                  );
                })
              )}

              {/* Arrow marker definition */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#6b7280"
                  />
                </marker>
              </defs>

              {/* Nodes */}
              {gameState.nodes.map((node) => (
                <motion.g
                  key={node.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: node.id * 0.1 }}
                >
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r={25}
                    fill={getNodeColor(node)}
                    stroke="white"
                    strokeWidth={node.available && !node.processed ? 3 : 2}
                    className={node.available && !node.processed ? "cursor-pointer" : ""}
                    onClick={() => selectNode(node.id)}
                    whileHover={node.available && !node.processed ? { scale: 1.1 } : {}}
                    whileTap={node.available && !node.processed ? { scale: 0.9 } : {}}
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
                  {!node.processed && node.inDegree > 0 && (
                    <text
                      x={node.x}
                      y={node.y - 35}
                      textAnchor="middle"
                      fill="white"
                      fontSize="12"
                      fontWeight="bold"
                    >
                      {node.inDegree}
                    </text>
                  )}
                </motion.g>
              ))}
            </svg>
          </div>
        </motion.div>

        {/* Dependencies List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Dependencies</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {gameState.dependencies.map((dep, index) => (
                <div key={index} className="text-blue-200 text-sm">
                  {dep}
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">How to Play</h3>
            <div className="space-y-2 text-purple-200">
              <div>• Click on blue nodes (available to process)</div>
              <div>• Process nodes in dependency order</div>
              <div>• Numbers show remaining dependencies</div>
              <div>• Green = processed, Blue = available, Gray = waiting</div>
              <div>• Complete all nodes to win!</div>
            </div>
          </div>
        </motion.div>
      </div>
    </GameLayout>
  );
}
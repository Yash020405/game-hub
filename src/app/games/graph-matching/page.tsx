'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Link as LinkIcon, Trophy, Zap, CheckCircle, Users, Target } from 'lucide-react';
import GameLayout from '@/components/GameLayout';
import toast from 'react-hot-toast';
import Confetti from 'react-confetti';

interface Node {
  id: number;
  x: number;
  y: number;
  label: string;
  group: 'left' | 'right';
  matched: boolean;
  color: string;
}

interface Edge {
  from: number;
  to: number;
  selected: boolean;
  weight?: number;
}

interface Matching {
  edges: Edge[];
  isMaximal: boolean;
  isPerfect: boolean;
  weight: number;
}

interface GameState {
  nodes: Node[];
  edges: Edge[];
  selectedEdges: Edge[];
  currentMatching: Matching;
  score: number;
  level: number;
  gameStarted: boolean;
  gameWon: boolean;
  targetType: 'maximum' | 'perfect' | 'weighted';
  optimalMatching: Edge[];
  optimalWeight: number;
}

const generateBipartiteGraph = (level: number): { nodes: Node[], edges: Edge[], optimalMatching: Edge[], optimalWeight: number } => {
  const leftCount = Math.min(4 + level, 8);
  const rightCount = Math.min(4 + level, 8);
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Create left side nodes
  for (let i = 0; i < leftCount; i++) {
    nodes.push({
      id: i,
      x: 150,
      y: 100 + (i * 300) / leftCount,
      label: `L${i + 1}`,
      group: 'left',
      matched: false,
      color: '#ef4444'
    });
  }

  // Create right side nodes
  for (let i = 0; i < rightCount; i++) {
    nodes.push({
      id: leftCount + i,
      x: 450,
      y: 100 + (i * 300) / rightCount,
      label: `R${i + 1}`,
      group: 'right',
      matched: false,
      color: '#3b82f6'
    });
  }

  // Create edges with some randomness
  for (let i = 0; i < leftCount; i++) {
    const connectionCount = Math.min(Math.floor(Math.random() * rightCount) + 1, rightCount);
    const availableRight = Array.from({ length: rightCount }, (_, idx) => leftCount + idx);
    
    for (let j = 0; j < connectionCount; j++) {
      if (availableRight.length === 0) break;
      
      const randomIndex = Math.floor(Math.random() * availableRight.length);
      const rightNodeId = availableRight[randomIndex];
      availableRight.splice(randomIndex, 1);
      
      const weight = Math.floor(Math.random() * 10) + 1;
      
      edges.push({
        from: i,
        to: rightNodeId,
        selected: false,
        weight
      });
    }
  }

  // Calculate optimal matching using greedy approach (simplified)
  const { matching: optimalMatching, weight: optimalWeight } = findMaximumWeightMatching(nodes, edges);

  return { nodes, edges, optimalMatching, optimalWeight };
};

const findMaximumWeightMatching = (nodes: Node[], edges: Edge[]): { matching: Edge[], weight: number } => {
  // Sort edges by weight (descending)
  const sortedEdges = [...edges].sort((a, b) => (b.weight || 0) - (a.weight || 0));
  const matching: Edge[] = [];
  const usedNodes = new Set<number>();
  let totalWeight = 0;

  for (const edge of sortedEdges) {
    if (!usedNodes.has(edge.from) && !usedNodes.has(edge.to)) {
      matching.push(edge);
      usedNodes.add(edge.from);
      usedNodes.add(edge.to);
      totalWeight += edge.weight || 0;
    }
  }

  return { matching, weight: totalWeight };
};

export default function GraphMatchingGame() {
  const [gameState, setGameState] = useState<GameState>({
    nodes: [],
    edges: [],
    selectedEdges: [],
    currentMatching: {
      edges: [],
      isMaximal: false,
      isPerfect: false,
      weight: 0
    },
    score: 0,
    level: 1,
    gameStarted: false,
    gameWon: false,
    targetType: 'maximum',
    optimalMatching: [],
    optimalWeight: 0
  });

  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  const initializeGame = useCallback(() => {
    const { nodes, edges, optimalMatching, optimalWeight } = generateBipartiteGraph(gameState.level);
    
    // Determine target type based on level
    const targetType = gameState.level <= 2 ? 'maximum' : 
                      gameState.level <= 4 ? 'perfect' : 'weighted';
    
    setGameState(prev => ({
      ...prev,
      nodes,
      edges,
      selectedEdges: [],
      currentMatching: {
        edges: [],
        isMaximal: false,
        isPerfect: false,
        weight: 0
      },
      gameStarted: true,
      gameWon: false,
      targetType,
      optimalMatching,
      optimalWeight
    }));
  }, [gameState.level]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const toggleEdge = (edgeIndex: number) => {
    if (!gameState.gameStarted || gameState.gameWon) return;

    const edge = gameState.edges[edgeIndex];
    const newEdges = [...gameState.edges];
    const newSelectedEdges = [...gameState.selectedEdges];

    if (edge.selected) {
      // Deselect edge
      newEdges[edgeIndex].selected = false;
      const selectedIndex = newSelectedEdges.findIndex(e => 
        e.from === edge.from && e.to === edge.to
      );
      if (selectedIndex !== -1) {
        newSelectedEdges.splice(selectedIndex, 1);
      }
    } else {
      // Check if selecting this edge would violate matching constraints
      const wouldViolate = newSelectedEdges.some(selectedEdge =>
        selectedEdge.from === edge.from || selectedEdge.to === edge.to
      );

      if (wouldViolate) {
        toast.error('Each node can only be matched once!');
        return;
      }

      // Select edge
      newEdges[edgeIndex].selected = true;
      newSelectedEdges.push(edge);
    }

    // Update node matched status
    const newNodes = gameState.nodes.map(node => ({
      ...node,
      matched: newSelectedEdges.some(e => e.from === node.id || e.to === node.id)
    }));

    // Calculate matching properties
    const totalWeight = newSelectedEdges.reduce((sum, e) => sum + (e.weight || 0), 0);
    const leftNodes = gameState.nodes.filter(n => n.group === 'left');
    const rightNodes = gameState.nodes.filter(n => n.group === 'right');
    const isPerfect = newSelectedEdges.length === Math.min(leftNodes.length, rightNodes.length);
    const isMaximal = checkIfMaximal(newSelectedEdges, gameState.edges, gameState.nodes);

    const newMatching = {
      edges: newSelectedEdges,
      isMaximal,
      isPerfect,
      weight: totalWeight
    };

    setGameState(prev => ({
      ...prev,
      edges: newEdges,
      selectedEdges: newSelectedEdges,
      nodes: newNodes,
      currentMatching: newMatching
    }));

    // Check win condition
    checkWinCondition(newMatching);
  };

  const checkIfMaximal = (selectedEdges: Edge[], allEdges: Edge[], nodes: Node[]): boolean => {
    // A matching is maximal if no more edges can be added
    const usedNodes = new Set<number>();
    selectedEdges.forEach(edge => {
      usedNodes.add(edge.from);
      usedNodes.add(edge.to);
    });

    return !allEdges.some(edge => 
      !usedNodes.has(edge.from) && !usedNodes.has(edge.to)
    );
  };

  const checkWinCondition = (matching: Matching) => {
    let isWin = false;
    let message = '';
    let bonus = 0;

    switch (gameState.targetType) {
      case 'maximum':
        isWin = matching.edges.length === gameState.optimalMatching.length;
        message = 'Maximum matching found!';
        bonus = 1000;
        break;
      case 'perfect':
        isWin = matching.isPerfect;
        message = 'Perfect matching achieved!';
        bonus = 1500;
        break;
      case 'weighted':
        isWin = matching.weight === gameState.optimalWeight;
        message = 'Maximum weight matching found!';
        bonus = 2000;
        break;
    }

    if (isWin) {
      const levelBonus = gameState.level * 200;
      const newScore = gameState.score + bonus + levelBonus;

      setGameState(prev => ({
        ...prev,
        gameWon: true,
        score: newScore,
        level: prev.level + 1
      }));

      toast.success(`🎉 ${message} +${bonus + levelBonus} points`);
    }
  };

  const showOptimalSolution = () => {
    const newEdges = gameState.edges.map(edge => ({
      ...edge,
      selected: gameState.optimalMatching.some(optEdge =>
        optEdge.from === edge.from && optEdge.to === edge.to
      )
    }));

    const newNodes = gameState.nodes.map(node => ({
      ...node,
      matched: gameState.optimalMatching.some(e => e.from === node.id || e.to === node.id)
    }));

    setGameState(prev => ({
      ...prev,
      edges: newEdges,
      nodes: newNodes,
      selectedEdges: gameState.optimalMatching
    }));

    toast.success('Optimal matching shown!');
  };

  const clearMatching = () => {
    const newEdges = gameState.edges.map(edge => ({ ...edge, selected: false }));
    const newNodes = gameState.nodes.map(node => ({ ...node, matched: false }));

    setGameState(prev => ({
      ...prev,
      edges: newEdges,
      nodes: newNodes,
      selectedEdges: [],
      currentMatching: {
        edges: [],
        isMaximal: false,
        isPerfect: false,
        weight: 0
      }
    }));
  };

  const resetGame = () => {
    initializeGame();
  };

  const getTargetDescription = () => {
    switch (gameState.targetType) {
      case 'maximum':
        return 'Find a maximum matching (largest number of edges)';
      case 'perfect':
        return 'Find a perfect matching (every node is matched)';
      case 'weighted':
        return 'Find a maximum weight matching (highest total weight)';
      default:
        return '';
    }
  };

  return (
    <GameLayout
      title="Graph Matching"
      description="Find maximum matchings in bipartite graphs"
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
            <div>
              <h2 className="text-xl font-bold text-white mb-2">
                {gameState.targetType.charAt(0).toUpperCase() + gameState.targetType.slice(1)} Matching
              </h2>
              <p className="text-gray-300 text-sm">{getTargetDescription()}</p>
            </div>
            
            <div className="flex items-center gap-6">
              <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-blue-400 flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  Matched
                </div>
                <div className="text-sm text-blue-200">
                  {gameState.selectedEdges.length} edges
                </div>
              </motion.div>
              
              {gameState.targetType === 'weighted' && (
                <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                  <div className="text-2xl font-bold text-green-400 flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Weight
                  </div>
                  <div className="text-sm text-green-200">
                    {gameState.currentMatching.weight}
                  </div>
                </motion.div>
              )}
              
              <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-purple-400 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Status
                </div>
                <div className="text-sm text-purple-200">
                  {gameState.currentMatching.isPerfect ? 'Perfect' : 
                   gameState.currentMatching.isMaximal ? 'Maximal' : 'Partial'}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-4 justify-center mb-8"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={showOptimalSolution}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200"
          >
            <Target className="w-4 h-4 inline mr-2" />
            Show Optimal
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={clearMatching}
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg font-medium hover:from-yellow-600 hover:to-orange-700 transition-all duration-200"
          >
            Clear Matching
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetGame}
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-pink-700 transition-all duration-200"
          >
            <RotateCcw className="w-4 h-4 inline mr-2" />
            Reset
          </motion.button>
        </motion.div>

        {/* Graph Visualization */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-white/10 shadow-2xl">
            <svg width="600" height="400" className="w-full h-full">
              {/* Edges */}
              {gameState.edges.map((edge, index) => {
                const fromNode = gameState.nodes.find(n => n.id === edge.from);
                const toNode = gameState.nodes.find(n => n.id === edge.to);
                
                if (!fromNode || !toNode) return null;
                
                return (
                  <g key={index}>
                    <motion.line
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      stroke={edge.selected ? "#10b981" : "#6b7280"}
                      strokeWidth={edge.selected ? 4 : 2}
                      className="cursor-pointer hover:stroke-blue-400"
                      onClick={() => toggleEdge(index)}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                    
                    {gameState.targetType === 'weighted' && edge.weight && (
                      <text
                        x={(fromNode.x + toNode.x) / 2}
                        y={(fromNode.y + toNode.y) / 2 - 10}
                        textAnchor="middle"
                        fill="white"
                        fontSize="12"
                        fontWeight="bold"
                        className="pointer-events-none"
                      >
                        {edge.weight}
                      </text>
                    )}
                  </g>
                );
              })}

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
                    fill={node.matched ? "#10b981" : node.color}
                    stroke="white"
                    strokeWidth={node.matched ? 3 : 2}
                    whileHover={{ scale: 1.1 }}
                  />
                  <text
                    x={node.x}
                    y={node.y + 5}
                    textAnchor="middle"
                    fill="white"
                    fontSize="14"
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    {node.label}
                  </text>
                </motion.g>
              ))}

              {/* Group labels */}
              <text x={150} y={50} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
                Left Set
              </text>
              <text x={450} y={50} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
                Right Set
              </text>
            </svg>
          </div>
        </motion.div>

        {/* Matching Info */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-8"
        >
          <h3 className="text-lg font-bold text-white mb-4">Current Matching Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{gameState.selectedEdges.length}</div>
              <div className="text-sm text-blue-200">Edges Selected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {gameState.nodes.filter(n => n.matched).length}
              </div>
              <div className="text-sm text-green-200">Nodes Matched</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {gameState.currentMatching.weight}
              </div>
              <div className="text-sm text-purple-200">Total Weight</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                gameState.currentMatching.isPerfect ? 'text-green-400' : 
                gameState.currentMatching.isMaximal ? 'text-yellow-400' : 'text-gray-400'
              }`}>
                {gameState.currentMatching.isPerfect ? '✓' : 
                 gameState.currentMatching.isMaximal ? '~' : '✗'}
              </div>
              <div className="text-sm text-gray-200">
                {gameState.currentMatching.isPerfect ? 'Perfect' : 
                 gameState.currentMatching.isMaximal ? 'Maximal' : 'Partial'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Game Info */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">How to Play</h3>
            <div className="space-y-2 text-blue-200">
              <div>• Click edges to select/deselect them for matching</div>
              <div>• Each node can be matched to at most one other node</div>
              <div>• Red nodes (left) can only match to blue nodes (right)</div>
              <div>• Find the optimal matching based on the current objective</div>
              <div>• Green edges show your current matching</div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Matching Theory</h3>
            <div className="space-y-2 text-purple-200">
              <div>• <strong>Bipartite Graph:</strong> Two disjoint vertex sets</div>
              <div>• <strong>Matching:</strong> Set of edges with no shared vertices</div>
              <div>• <strong>Maximum:</strong> Largest possible matching</div>
              <div>• <strong>Perfect:</strong> Every vertex is matched</div>
              <div>• <strong>Weight:</strong> Sum of edge weights in matching</div>
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
                className="bg-gradient-to-br from-purple-900/90 to-blue-900/90 backdrop-blur-sm rounded-2xl p-8 border border-white/20 max-w-md w-full mx-4"
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
                  
                  <h2 className="text-2xl font-bold text-white mb-2">Optimal Matching Found!</h2>
                  <p className="text-blue-200 mb-6">
                    Perfect! You found the {gameState.targetType} matching.
                  </p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between">
                      <span className="text-blue-200">Score:</span>
                      <span className="text-white font-bold">{gameState.score.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-200">Edges Matched:</span>
                      <span className="text-white font-bold">{gameState.selectedEdges.length}</span>
                    </div>
                    {gameState.targetType === 'weighted' && (
                      <div className="flex justify-between">
                        <span className="text-blue-200">Total Weight:</span>
                        <span className="text-white font-bold">{gameState.currentMatching.weight}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setGameState(prev => ({ ...prev, gameWon: false }));
                        initializeGame();
                      }}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200"
                    >
                      Next Level
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={resetGame}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-200"
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
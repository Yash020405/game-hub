'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Network, Trophy, Zap, CheckCircle, TreePine, Target } from 'lucide-react';
import GameLayout from '@/components/GameLayout';
import toast from 'react-hot-toast';
import Confetti from 'react-confetti';

interface Node {
  id: number;
  x: number;
  y: number;
  label: string;
}

interface Edge {
  from: number;
  to: number;
  weight: number;
  selected: boolean;
  highlighted: boolean;
}

interface GameState {
  nodes: Node[];
  edges: Edge[];
  selectedEdges: Edge[];
  totalWeight: number;
  optimalWeight: number;
  score: number;
  level: number;
  gameStarted: boolean;
  gameWon: boolean;
  showOptimal: boolean;
  optimalMST: Edge[];
}

const generateGraph = (level: number): { nodes: Node[], edges: Edge[] } => {
  const nodeCount = Math.min(5 + level, 10);
  const nodes: Node[] = [];
  
  for (let i = 0; i < nodeCount; i++) {
    const angle = (i / nodeCount) * 2 * Math.PI;
    const radius = 120 + level * 15;
    const x = Math.cos(angle) * radius + 300;
    const y = Math.sin(angle) * radius + 200;
    
    nodes.push({
      id: i,
      x,
      y,
      label: String.fromCharCode(65 + i)
    });
  }
  
  const edges: Edge[] = [];
  
  // Create a connected graph with random weights
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (Math.random() < 0.6) { // 60% chance of edge
        const weight = Math.floor(Math.random() * 20) + 1;
        edges.push({
          from: i,
          to: j,
          weight,
          selected: false,
          highlighted: false
        });
      }
    }
  }
  
  // Ensure connectivity by adding edges if needed
  const components = findComponents(nodes, edges);
  if (components.length > 1) {
    for (let i = 1; i < components.length; i++) {
      const node1 = components[0][0];
      const node2 = components[i][0];
      const weight = Math.floor(Math.random() * 20) + 1;
      edges.push({
        from: node1,
        to: node2,
        weight,
        selected: false,
        highlighted: false
      });
    }
  }
  
  return { nodes, edges };
};

const findComponents = (nodes: Node[], edges: Edge[]): number[][] => {
  const visited = new Set<number>();
  const components: number[][] = [];
  
  const dfs = (nodeId: number, component: number[]) => {
    visited.add(nodeId);
    component.push(nodeId);
    
    edges.forEach(edge => {
      const neighbor = edge.from === nodeId ? edge.to : edge.to === nodeId ? edge.from : null;
      if (neighbor !== null && !visited.has(neighbor)) {
        dfs(neighbor, component);
      }
    });
  };
  
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      const component: number[] = [];
      dfs(node.id, component);
      components.push(component);
    }
  });
  
  return components;
};

const kruskalMST = (nodes: Node[], edges: Edge[]): Edge[] => {
  const sortedEdges = [...edges].sort((a, b) => a.weight - b.weight);
  const mst: Edge[] = [];
  const parent: number[] = nodes.map((_, i) => i);
  
  const find = (x: number): number => {
    if (parent[x] !== x) {
      parent[x] = find(parent[x]);
    }
    return parent[x];
  };
  
  const union = (x: number, y: number): boolean => {
    const rootX = find(x);
    const rootY = find(y);
    
    if (rootX !== rootY) {
      parent[rootX] = rootY;
      return true;
    }
    return false;
  };
  
  for (const edge of sortedEdges) {
    if (union(edge.from, edge.to)) {
      mst.push(edge);
      if (mst.length === nodes.length - 1) break;
    }
  }
  
  return mst;
};

export default function MinimumSpanningTreeGame() {
  const [gameState, setGameState] = useState<GameState>({
    nodes: [],
    edges: [],
    selectedEdges: [],
    totalWeight: 0,
    optimalWeight: 0,
    score: 0,
    level: 1,
    gameStarted: false,
    gameWon: false,
    showOptimal: false,
    optimalMST: []
  });

  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  const initializeGame = useCallback(() => {
    const { nodes, edges } = generateGraph(gameState.level);
    const optimalMST = kruskalMST(nodes, edges);
    const optimalWeight = optimalMST.reduce((sum, edge) => sum + edge.weight, 0);
    
    setGameState(prev => ({
      ...prev,
      nodes,
      edges,
      selectedEdges: [],
      totalWeight: 0,
      optimalWeight,
      gameStarted: true,
      gameWon: false,
      showOptimal: false,
      optimalMST
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
        (e.from === edge.from && e.to === edge.to) || (e.from === edge.to && e.to === edge.from)
      );
      if (selectedIndex !== -1) {
        newSelectedEdges.splice(selectedIndex, 1);
      }
    } else {
      // Check if selecting this edge would create a cycle
      const tempSelected = [...newSelectedEdges, edge];
      if (tempSelected.length < gameState.nodes.length && !createsCycle(tempSelected, gameState.nodes)) {
        newEdges[edgeIndex].selected = true;
        newSelectedEdges.push(edge);
      } else {
        toast.error('This edge would create a cycle or exceed MST size!');
        return;
      }
    }

    const totalWeight = newSelectedEdges.reduce((sum, e) => sum + e.weight, 0);
    
    setGameState(prev => ({
      ...prev,
      edges: newEdges,
      selectedEdges: newSelectedEdges,
      totalWeight
    }));

    // Check if MST is complete
    if (newSelectedEdges.length === gameState.nodes.length - 1) {
      const isOptimal = totalWeight === gameState.optimalWeight;
      const bonus = isOptimal ? 2000 : 1000;
      const newScore = gameState.score + bonus;
      
      setGameState(prev => ({
        ...prev,
        gameWon: true,
        score: newScore,
        level: prev.level + 1
      }));
      
      const message = isOptimal 
        ? '🎉 Perfect! Optimal MST found!' 
        : `MST Complete! Weight: ${totalWeight} (Optimal: ${gameState.optimalWeight})`;
      
      toast.success(`${message} +${bonus} points`);
    }
  };

  const createsCycle = (edges: Edge[], nodes: Node[]): boolean => {
    const parent: number[] = nodes.map((_, i) => i);
    
    const find = (x: number): number => {
      if (parent[x] !== x) {
        parent[x] = find(parent[x]);
      }
      return parent[x];
    };
    
    for (const edge of edges) {
      const rootFrom = find(edge.from);
      const rootTo = find(edge.to);
      
      if (rootFrom === rootTo) {
        return true;
      }
      
      parent[rootFrom] = rootTo;
    }
    
    return false;
  };

  const showOptimalSolution = () => {
    const newEdges = gameState.edges.map(edge => ({
      ...edge,
      selected: gameState.optimalMST.some(mstEdge =>
        (mstEdge.from === edge.from && mstEdge.to === edge.to) ||
        (mstEdge.from === edge.to && mstEdge.to === edge.from)
      ),
      highlighted: true
    }));

    setGameState(prev => ({
      ...prev,
      edges: newEdges,
      selectedEdges: gameState.optimalMST,
      totalWeight: prev.optimalWeight,
      showOptimal: true
    }));

    toast.success('Optimal MST shown!');
  };

  const clearSelection = () => {
    const newEdges = gameState.edges.map(edge => ({
      ...edge,
      selected: false,
      highlighted: false
    }));

    setGameState(prev => ({
      ...prev,
      edges: newEdges,
      selectedEdges: [],
      totalWeight: 0,
      showOptimal: false
    }));
  };

  const resetGame = () => {
    initializeGame();
  };

  return (
    <GameLayout
      title="Minimum Spanning Tree"
      description="Connect all vertices with minimum total weight!"
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
                <div className="text-2xl font-bold text-green-400 flex items-center gap-2">
                  <TreePine className="w-5 h-5" />
                  Your Weight
                </div>
                <div className="text-sm text-green-200">{gameState.totalWeight}</div>
              </motion.div>
              <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-blue-400 flex items-center gap-2">
                  <Network className="w-5 h-5" />
                  Edges
                </div>
                <div className="text-sm text-blue-200">{gameState.selectedEdges.length}/{gameState.nodes.length - 1}</div>
              </motion.div>
              <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-purple-400 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Optimal
                </div>
                <div className="text-sm text-purple-200">
                  {gameState.showOptimal ? gameState.optimalWeight : '???'}
                </div>
              </motion.div>
            </div>
            
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={showOptimalSolution}
                disabled={gameState.showOptimal}
                className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg font-medium hover:from-yellow-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Show Optimal
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearSelection}
                className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-200"
              >
                Clear
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

        {/* Graph Visualization */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-8"
        >
          <div className="relative bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-white/10 shadow-2xl">
            <svg width="600" height="400" className="w-full h-full">
              {/* Edges */}
              {gameState.edges.map((edge, index) => {
                const fromNode = gameState.nodes[edge.from];
                const toNode = gameState.nodes[edge.to];
                
                return (
                  <g key={`${edge.from}-${edge.to}`}>
                    <motion.line
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      stroke={edge.selected ? "#10b981" : edge.highlighted ? "#f59e0b" : "#6b7280"}
                      strokeWidth={edge.selected ? 4 : 2}
                      className="cursor-pointer hover:stroke-blue-400"
                      onClick={() => toggleEdge(index)}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                    <motion.text
                      x={(fromNode.x + toNode.x) / 2}
                      y={(fromNode.y + toNode.y) / 2 - 10}
                      textAnchor="middle"
                      fill="white"
                      fontSize="12"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      {edge.weight}
                    </motion.text>
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
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={20}
                    fill="#374151"
                    stroke="white"
                    strokeWidth={2}
                  />
                  <text
                    x={node.x}
                    y={node.y + 5}
                    textAnchor="middle"
                    fill="white"
                    fontSize="14"
                    fontWeight="bold"
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
            <h3 className="text-xl font-bold text-white mb-4">How to Play</h3>
            <div className="space-y-2 text-blue-200">
              <div>• Click on edges to select/deselect them</div>
              <div>• Build a spanning tree (connects all nodes)</div>
              <div>• Minimize the total weight of selected edges</div>
              <div>• Cannot create cycles</div>
              <div>• Need exactly {gameState.nodes.length - 1} edges</div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">MST Algorithms</h3>
            <div className="space-y-2 text-purple-200">
              <div>• <strong>Kruskal:</strong> Sort edges, add if no cycle</div>
              <div>• <strong>Prim:</strong> Grow tree from starting vertex</div>
              <div>• Used in network design and clustering</div>
              <div>• Greedy algorithms guarantee optimal solution</div>
              <div>• Essential for infrastructure planning</div>
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
                  
                  <h2 className="text-2xl font-bold text-white mb-2">MST Complete!</h2>
                  <p className="text-blue-200 mb-6">
                    {gameState.totalWeight === gameState.optimalWeight 
                      ? 'Perfect! You found the optimal MST!' 
                      : 'Good job! Try to find lighter spanning trees next time.'}
                  </p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between">
                      <span className="text-blue-200">Your Weight:</span>
                      <span className="text-white font-bold">{gameState.totalWeight}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-200">Optimal Weight:</span>
                      <span className="text-white font-bold">{gameState.optimalWeight}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-200">Score:</span>
                      <span className="text-white font-bold">{gameState.score.toLocaleString()}</span>
                    </div>
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
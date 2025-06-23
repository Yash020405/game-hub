'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Eye, Plus, Minus, Shuffle, Download, Upload, Trash2 } from 'lucide-react';
import GameLayout from '@/components/GameLayout';
import toast from 'react-hot-toast';

interface Node {
  id: number;
  x: number;
  y: number;
  label: string;
  color: string;
  size: number;
  selected: boolean;
}

interface Edge {
  from: number;
  to: number;
  weight?: number;
  color: string;
  selected: boolean;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  objective: string;
  targetNodes: number;
  targetEdges: number;
  specificConstraints?: string[];
  hint: string;
  completed: boolean;
  checkFunction: (nodes: Node[], edges: Edge[]) => boolean;
}

interface GameState {
  nodes: Node[];
  edges: Edge[];
  selectedTool: 'select' | 'node' | 'edge' | 'delete';
  selectedNode: number | null;
  score: number;
  level: number;
  isDirected: boolean;
  showWeights: boolean;
  showLabels: boolean;
  nextNodeId: number;
  currentChallenge: Challenge | null;
  challengeIndex: number;
  showAnalysis: boolean;
}

const challenges: Challenge[] = [
  {
    id: 'triangle',
    title: 'Create a Triangle',
    description: 'Build a simple triangle graph with 3 vertices.',
    objective: 'Create exactly 3 nodes and connect them in a triangle (cycle)',
    targetNodes: 3,
    targetEdges: 3,
    hint: 'Each vertex should connect to exactly 2 others to form a cycle.',
    completed: false,
    checkFunction: (nodes, edges) => {
      if (nodes.length !== 3 || edges.length !== 3) return false;
      // Check if each node has degree 2
      const degrees = nodes.map(node => 
        edges.filter(edge => edge.from === node.id || edge.to === node.id).length
      );
      return degrees.every(degree => degree === 2);
    }
  },
  {
    id: 'star',
    title: 'Star Graph',
    description: 'Create a star graph with a central hub.',
    objective: 'Build a graph with 1 center node connected to 4 outer nodes',
    targetNodes: 5,
    targetEdges: 4,
    hint: 'One node should have degree 4, and four nodes should have degree 1.',
    completed: false,
    checkFunction: (nodes, edges) => {
      if (nodes.length !== 5 || edges.length !== 4) return false;
      const degrees = nodes.map(node => 
        edges.filter(edge => edge.from === node.id || edge.to === node.id).length
      );
      const centerNodes = degrees.filter(degree => degree === 4);
      const leafNodes = degrees.filter(degree => degree === 1);
      return centerNodes.length === 1 && leafNodes.length === 4;
    }
  },
  {
    id: 'complete4',
    title: 'Complete Graph K4',
    description: 'Every vertex connects to every other vertex.',
    objective: 'Create a complete graph with 4 vertices (6 edges total)',
    targetNodes: 4,
    targetEdges: 6,
    hint: 'Each vertex should connect to all 3 other vertices.',
    completed: false,
    checkFunction: (nodes, edges) => {
      if (nodes.length !== 4 || edges.length !== 6) return false;
      const degrees = nodes.map(node => 
        edges.filter(edge => edge.from === node.id || edge.to === node.id).length
      );
      return degrees.every(degree => degree === 3);
    }
  },
  {
    id: 'bipartite',
    title: 'Bipartite Graph',
    description: 'Create a graph with two distinct groups.',
    objective: 'Build a bipartite graph with 6 nodes (3 in each group)',
    targetNodes: 6,
    targetEdges: 4,
    specificConstraints: ['No edges within groups', 'Only edges between groups'],
    hint: 'Arrange nodes in two groups. Only connect nodes from different groups.',
    completed: false,
    checkFunction: (nodes, edges) => {
      if (nodes.length !== 6) return false;
      
      // Try to 2-color the graph (bipartite test)
      const colors: { [key: number]: number } = {};
      const queue: number[] = [nodes[0].id];
      colors[nodes[0].id] = 0;
      
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const currentColor = colors[currentId];
        
        const neighbors = edges
          .filter(edge => edge.from === currentId || edge.to === currentId)
          .map(edge => edge.from === currentId ? edge.to : edge.from);
        
        for (const neighborId of neighbors) {
          if (colors[neighborId] === undefined) {
            colors[neighborId] = 1 - currentColor;
            queue.push(neighborId);
          } else if (colors[neighborId] === currentColor) {
            return false; // Not bipartite
          }
        }
      }
      
      return Object.keys(colors).length === nodes.length;
    }
  },
  {
    id: 'tree',
    title: 'Tree Structure',
    description: 'Create a connected acyclic graph.',
    objective: 'Build a tree with 7 nodes (exactly 6 edges)',
    targetNodes: 7,
    targetEdges: 6,
    hint: 'A tree with n nodes has exactly n-1 edges and no cycles.',
    completed: false,
    checkFunction: (nodes, edges) => {
      if (nodes.length !== 7 || edges.length !== 6) return false;
      
      // Check connectivity using DFS
      const visited = new Set<number>();
      const stack = [nodes[0].id];
      
      while (stack.length > 0) {
        const currentId = stack.pop()!;
        if (visited.has(currentId)) continue;
        visited.add(currentId);
        
        const neighbors = edges
          .filter(edge => edge.from === currentId || edge.to === currentId)
          .map(edge => edge.from === currentId ? edge.to : edge.from);
        
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            stack.push(neighborId);
          }
        }
      }
      
      return visited.size === nodes.length;
    }
  }
];

const NODE_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

export default function GraphBuilderGame() {
  const [gameState, setGameState] = useState<GameState>({
    nodes: [],
    edges: [],
    selectedTool: 'node',
    selectedNode: null,
    score: 0,
    level: 1,
    isDirected: false,
    showWeights: false,
    showLabels: true,
    nextNodeId: 0,
    currentChallenge: challenges[0],
    challengeIndex: 0,
    showAnalysis: false
  });

  const [draggedNode, setDraggedNode] = useState<number | null>(null);
  const [isDrawingEdge, setIsDrawingEdge] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const addNode = (x: number, y: number) => {
    const newNode: Node = {
      id: gameState.nextNodeId,
      x,
      y,
      label: String.fromCharCode(65 + gameState.nodes.length),
      color: NODE_COLORS[gameState.nodes.length % NODE_COLORS.length],
      size: 25,
      selected: false
    };

    const newNodes = [...gameState.nodes, newNode];
    setGameState(prev => ({
      ...prev,
      nodes: newNodes,
      score: prev.score + 10,
      nextNodeId: prev.nextNodeId + 1
    }));

    toast.success('Node added!');
    checkChallenge(newNodes, gameState.edges);
  };

  const addEdge = (fromId: number, toId: number) => {
    if (fromId === toId) return;

    // Check if edge already exists
    const edgeExists = gameState.edges.some(edge => 
      (edge.from === fromId && edge.to === toId) ||
      (!gameState.isDirected && edge.from === toId && edge.to === fromId)
    );

    if (edgeExists) {
      toast.error('Edge already exists!');
      return;
    }

    const newEdge: Edge = {
      from: fromId,
      to: toId,
      weight: gameState.showWeights ? Math.floor(Math.random() * 10) + 1 : undefined,
      color: '#6b7280',
      selected: false
    };

    const newEdges = [...gameState.edges, newEdge];
    setGameState(prev => ({
      ...prev,
      edges: newEdges,
      score: prev.score + 5
    }));

    toast.success('Edge added!');
    checkChallenge(gameState.nodes, newEdges);
  };

  const deleteNode = (nodeId: number) => {
    setGameState(prev => ({
      ...prev,
      nodes: prev.nodes.filter(node => node.id !== nodeId),
      edges: prev.edges.filter(edge => edge.from !== nodeId && edge.to !== nodeId)
    }));

    toast.success('Node deleted!');
  };

  const deleteEdge = (edgeIndex: number) => {
    setGameState(prev => ({
      ...prev,
      edges: prev.edges.filter((_, index) => index !== edgeIndex)
    }));

    toast.success('Edge deleted!');
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (gameState.selectedTool === 'node') {
      addNode(x, y);
    } else if (gameState.selectedTool === 'select') {
      // Deselect all
      setGameState(prev => ({
        ...prev,
        selectedNode: null,
        nodes: prev.nodes.map(n => ({ ...n, selected: false }))
      }));
    }
  };

  const handleNodeClick = (nodeId: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (gameState.selectedTool === 'select') {
      setGameState(prev => ({
        ...prev,
        selectedNode: prev.selectedNode === nodeId ? null : nodeId,
        nodes: prev.nodes.map(n => ({ ...n, selected: n.id === nodeId ? !n.selected : false }))
      }));
    } else if (gameState.selectedTool === 'edge') {
      if (gameState.selectedNode === null) {
        setGameState(prev => ({ ...prev, selectedNode: nodeId }));
        setIsDrawingEdge(true);
        toast('Select target node for edge');
      } else if (gameState.selectedNode !== nodeId) {
        addEdge(gameState.selectedNode, nodeId);
        setGameState(prev => ({ ...prev, selectedNode: null }));
        setIsDrawingEdge(false);
      }
    } else if (gameState.selectedTool === 'delete') {
      deleteNode(nodeId);
    }
  };

  const handleNodeDrag = (nodeId: number, e: React.MouseEvent) => {
    if (gameState.selectedTool !== 'select') return;
    
    setDraggedNode(nodeId);
    
    const handleMouseMove = (e: MouseEvent) => {
      const canvas = document.querySelector('svg');
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setGameState(prev => ({
        ...prev,
        nodes: prev.nodes.map(node => 
          node.id === nodeId ? { ...node, x, y } : node
        )
      }));
    };
    
    const handleMouseUp = () => {
      setDraggedNode(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    if (isDrawingEdge) {
      const rect = e.currentTarget.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const generateRandomGraph = () => {
    const nodeCount = 5 + Math.floor(Math.random() * 5);
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Generate nodes
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * 2 * Math.PI;
      const radius = 150;
      const x = Math.cos(angle) * radius + 300;
      const y = Math.sin(angle) * radius + 200;

      nodes.push({
        id: i,
        x,
        y,
        label: String.fromCharCode(65 + i),
        color: NODE_COLORS[i % NODE_COLORS.length],
        size: 25,
        selected: false
      });
    }

    // Generate edges
    for (let i = 0; i < nodes.length; i++) {
      const connectionCount = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < connectionCount; j++) {
        const targetId = Math.floor(Math.random() * nodes.length);
        if (targetId !== i && !edges.some(e => 
          (e.from === i && e.to === targetId) || 
          (!gameState.isDirected && e.from === targetId && e.to === i)
        )) {
          edges.push({
            from: i,
            to: targetId,
            weight: gameState.showWeights ? Math.floor(Math.random() * 10) + 1 : undefined,
            color: '#6b7280',
            selected: false
          });
        }
      }
    }

    setGameState(prev => ({
      ...prev,
      nodes,
      edges,
      selectedNode: null,
      nextNodeId: nodeCount,
      score: prev.score + 50
    }));

    toast.success('Random graph generated!');
  };

  const clearGraph = () => {
    setGameState(prev => ({
      ...prev,
      nodes: [],
      edges: [],
      selectedNode: null,
      nextNodeId: 0
    }));

    toast.success('Graph cleared!');
  };

  const checkChallenge = (nodes: Node[], edges: Edge[]) => {
    if (!gameState.currentChallenge) return;
    
    if (gameState.currentChallenge.checkFunction(nodes, edges)) {
      const bonusPoints = 500 * (gameState.challengeIndex + 1);
      setGameState(prev => ({
        ...prev,
        score: prev.score + bonusPoints,
        challengeIndex: (prev.challengeIndex + 1) % challenges.length,
        currentChallenge: challenges[(prev.challengeIndex + 1) % challenges.length]
      }));
      
      toast.success(`🎉 Challenge completed! +${bonusPoints} points`);
    }
  };

  const nextChallenge = () => {
    setGameState(prev => ({
      ...prev,
      challengeIndex: (prev.challengeIndex + 1) % challenges.length,
      currentChallenge: challenges[(prev.challengeIndex + 1) % challenges.length]
    }));
    clearGraph();
  };

  const getHint = () => {
    if (gameState.currentChallenge) {
      toast(gameState.currentChallenge.hint);
    }
  };

  const analyzeGraph = () => {
    setGameState(prev => ({ ...prev, showAnalysis: !prev.showAnalysis }));
  };

  return (
    <GameLayout
      title="Graph Builder"
      description="Create and explore graph structures interactively"
      score={gameState.score}
      level={gameState.level}
    >
      <div className="max-w-6xl mx-auto p-6">
        {/* Tools Panel */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-white font-medium">Tools:</div>
              <div className="flex gap-2">
                {[
                  { id: 'select', label: 'Select', icon: '👆' },
                  { id: 'node', label: 'Add Node', icon: '⭕' },
                  { id: 'edge', label: 'Add Edge', icon: '↔️' },
                  { id: 'delete', label: 'Delete', icon: '🗑️' }
                ].map((tool) => (
                  <motion.button
                    key={tool.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setGameState(prev => ({ 
                      ...prev, 
                      selectedTool: tool.id as any,
                      selectedNode: null 
                    }))}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      gameState.selectedTool === tool.id
                        ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <span className="mr-2">{tool.icon}</span>
                    {tool.label}
                  </motion.button>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={generateRandomGraph}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200"
              >
                <Shuffle className="w-4 h-4 inline mr-2" />
                Random
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={analyzeGraph}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-700 transition-all duration-200"
              >
                <Eye className="w-4 h-4 inline mr-2" />
                Analyze
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearGraph}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-pink-700 transition-all duration-200"
              >
                <Trash2 className="w-4 h-4 inline mr-2" />
                Clear
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Options Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-8"
        >
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={gameState.isDirected}
                onChange={(e) => setGameState(prev => ({ ...prev, isDirected: e.target.checked }))}
                className="rounded"
              />
              Directed Graph
            </label>
            
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={gameState.showWeights}
                onChange={(e) => setGameState(prev => ({ ...prev, showWeights: e.target.checked }))}
                className="rounded"
              />
              Show Weights
            </label>
            
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={gameState.showLabels}
                onChange={(e) => setGameState(prev => ({ ...prev, showLabels: e.target.checked }))}
                className="rounded"
              />
              Show Labels
            </label>
          </div>
        </motion.div>

        {/* Graph Canvas */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-2xl">
            <svg 
              width="600" 
              height="400" 
              className="w-full h-full cursor-crosshair"
              onClick={handleCanvasClick}
              onMouseMove={handleMouseMove}
            >
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
                      stroke={edge.color}
                      strokeWidth={edge.selected ? 4 : 2}
                      className="cursor-pointer hover:stroke-red-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (gameState.selectedTool === 'delete') {
                          deleteEdge(index);
                        }
                      }}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5 }}
                      markerEnd={gameState.isDirected ? "url(#arrowhead)" : undefined}
                    />
                    
                    {/* Edge weight */}
                    {gameState.showWeights && edge.weight && (
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

              {/* Temporary edge while creating */}
              {isDrawingEdge && gameState.selectedNode !== null && (
                <line
                  x1={gameState.nodes.find(n => n.id === gameState.selectedNode)?.x || 0}
                  y1={gameState.nodes.find(n => n.id === gameState.selectedNode)?.y || 0}
                  x2={mousePos.x}
                  y2={mousePos.y}
                  stroke="#fbbf24"
                  strokeWidth={2}
                  strokeDasharray="5,5"
                  className="pointer-events-none"
                />
              )}

              {/* Arrow marker for directed graphs */}
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
                  transition={{ delay: 0.1 }}
                >
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r={node.size}
                    fill={node.color}
                    stroke={gameState.selectedNode === node.id ? "#fbbf24" : "white"}
                    strokeWidth={gameState.selectedNode === node.id ? 4 : 2}
                    className="cursor-pointer"
                    onClick={(e) => handleNodeClick(node.id, e)}
                    onMouseDown={(e) => handleNodeDrag(node.id, e)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  />
                  
                  {gameState.showLabels && (
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
                  )}
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
            <h3 className="text-xl font-bold text-white mb-4">How to Use</h3>
            <div className="space-y-2 text-blue-200">
              <div>• <strong>Add Node:</strong> Click anywhere on canvas</div>
              <div>• <strong>Add Edge:</strong> Click two nodes in sequence</div>
              <div>• <strong>Select:</strong> Click nodes to select/move them</div>
              <div>• <strong>Delete:</strong> Click nodes or edges to remove</div>
              <div>• Use options to customize graph properties</div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Graph Properties</h3>
            <div className="space-y-2 text-purple-200">
              <div>• <strong>Nodes:</strong> {gameState.nodes.length}</div>
              <div>• <strong>Edges:</strong> {gameState.edges.length}</div>
              <div>• <strong>Type:</strong> {gameState.isDirected ? 'Directed' : 'Undirected'}</div>
              <div>• <strong>Density:</strong> {gameState.nodes.length > 1 ? 
                ((gameState.edges.length / (gameState.nodes.length * (gameState.nodes.length - 1) / (gameState.isDirected ? 1 : 2))) * 100).toFixed(1) + '%' : '0%'}</div>
            </div>
          </div>
        </motion.div>
      </div>
    </GameLayout>
  );
}
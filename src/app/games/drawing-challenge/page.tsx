'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Pen, Trophy, Zap, CheckCircle, Lightbulb, Palette } from 'lucide-react';
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
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  targetGraph: {
    nodes: Node[];
    edges: Edge[];
  };
  constraints: string[];
  hint: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface GameState {
  currentChallenge: Challenge | null;
  challengeIndex: number;
  userGraph: {
    nodes: Node[];
    edges: Edge[];
  };
  score: number;
  level: number;
  gameStarted: boolean;
  gameWon: boolean;
  hintsUsed: number;
  maxHints: number;
  selectedTool: 'node' | 'edge' | 'delete';
  selectedNode: number | null;
  nextNodeId: number;
}

const challenges: Challenge[] = [
  {
    id: 'triangle',
    title: 'Draw a Triangle',
    description: 'Create a triangle graph with 3 vertices and 3 edges',
    targetGraph: {
      nodes: [
        { id: 0, x: 300, y: 150, label: 'A' },
        { id: 1, x: 200, y: 300, label: 'B' },
        { id: 2, x: 400, y: 300, label: 'C' }
      ],
      edges: [
        { from: 0, to: 1 },
        { from: 1, to: 2 },
        { from: 2, to: 0 }
      ]
    },
    constraints: ['Exactly 3 vertices', 'Exactly 3 edges', 'Each vertex has degree 2'],
    hint: 'A triangle is a cycle with 3 vertices. Each vertex should connect to exactly 2 others.',
    difficulty: 'Easy'
  },
  {
    id: 'star',
    title: 'Draw a Star Graph',
    description: 'Create a star graph with 1 center and 4 outer vertices',
    targetGraph: {
      nodes: [
        { id: 0, x: 300, y: 250, label: 'Center' },
        { id: 1, x: 300, y: 150, label: 'A' },
        { id: 2, x: 400, y: 250, label: 'B' },
        { id: 3, x: 300, y: 350, label: 'C' },
        { id: 4, x: 200, y: 250, label: 'D' }
      ],
      edges: [
        { from: 0, to: 1 },
        { from: 0, to: 2 },
        { from: 0, to: 3 },
        { from: 0, to: 4 }
      ]
    },
    constraints: ['5 vertices total', '4 edges total', 'One vertex has degree 4', 'Four vertices have degree 1'],
    hint: 'One central vertex connects to all others. The outer vertices only connect to the center.',
    difficulty: 'Easy'
  },
  {
    id: 'complete4',
    title: 'Complete Graph K4',
    description: 'Draw a complete graph with 4 vertices (every vertex connects to every other)',
    targetGraph: {
      nodes: [
        { id: 0, x: 250, y: 200, label: 'A' },
        { id: 1, x: 350, y: 200, label: 'B' },
        { id: 2, x: 350, y: 300, label: 'C' },
        { id: 3, x: 250, y: 300, label: 'D' }
      ],
      edges: [
        { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 0, to: 3 },
        { from: 1, to: 2 }, { from: 1, to: 3 }, { from: 2, to: 3 }
      ]
    },
    constraints: ['4 vertices', '6 edges', 'Each vertex has degree 3', 'Every pair of vertices is connected'],
    hint: 'In a complete graph, every vertex connects to every other vertex. With 4 vertices, you need 6 edges.',
    difficulty: 'Medium'
  },
  {
    id: 'bipartite',
    title: 'Bipartite Graph',
    description: 'Create a bipartite graph with two groups of vertices',
    targetGraph: {
      nodes: [
        { id: 0, x: 200, y: 200, label: 'A1' },
        { id: 1, x: 200, y: 300, label: 'A2' },
        { id: 2, x: 400, y: 200, label: 'B1' },
        { id: 3, x: 400, y: 300, label: 'B2' },
        { id: 4, x: 400, y: 350, label: 'B3' }
      ],
      edges: [
        { from: 0, to: 2 }, { from: 0, to: 3 },
        { from: 1, to: 2 }, { from: 1, to: 4 }
      ]
    },
    constraints: ['5 vertices in two groups', 'No edges within groups', 'Only edges between groups'],
    hint: 'Divide vertices into two sets. Edges can only connect vertices from different sets.',
    difficulty: 'Medium'
  },
  {
    id: 'petersen',
    title: 'Petersen Graph',
    description: 'Draw the famous Petersen graph (10 vertices, 15 edges)',
    targetGraph: {
      nodes: [
        // Outer pentagon
        { id: 0, x: 300, y: 100, label: '0' },
        { id: 1, x: 450, y: 200, label: '1' },
        { id: 2, x: 400, y: 350, label: '2' },
        { id: 3, x: 200, y: 350, label: '3' },
        { id: 4, x: 150, y: 200, label: '4' },
        // Inner pentagram
        { id: 5, x: 300, y: 180, label: '5' },
        { id: 6, x: 380, y: 220, label: '6' },
        { id: 7, x: 350, y: 300, label: '7' },
        { id: 8, x: 250, y: 300, label: '8' },
        { id: 9, x: 220, y: 220, label: '9' }
      ],
      edges: [
        // Outer pentagon
        { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 0 },
        // Inner pentagram
        { from: 5, to: 7 }, { from: 7, to: 9 }, { from: 9, to: 6 }, { from: 6, to: 8 }, { from: 8, to: 5 },
        // Connections
        { from: 0, to: 5 }, { from: 1, to: 6 }, { from: 2, to: 7 }, { from: 3, to: 8 }, { from: 4, to: 9 }
      ]
    },
    constraints: ['10 vertices', '15 edges', 'Each vertex has degree 3', 'No triangles', 'Highly symmetric'],
    hint: 'The Petersen graph has an outer pentagon, inner pentagram, and spokes connecting them.',
    difficulty: 'Hard'
  }
];

export default function DrawingChallengeGame() {
  const [gameState, setGameState] = useState<GameState>({
    currentChallenge: null,
    challengeIndex: 0,
    userGraph: { nodes: [], edges: [] },
    score: 0,
    level: 1,
    gameStarted: false,
    gameWon: false,
    hintsUsed: 0,
    maxHints: 3,
    selectedTool: 'node',
    selectedNode: null,
    nextNodeId: 0
  });

  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  const initializeGame = useCallback(() => {
    const challenge = challenges[0]; // Start with first challenge
    
    setGameState(prev => ({
      ...prev,
      currentChallenge: challenge,
      userGraph: { nodes: [], edges: [] },
      gameStarted: true,
      gameWon: false,
      hintsUsed: 0,
      selectedNode: null,
      nextNodeId: 0,
      challengeIndex: 0
    }));
  }, []); // Remove dependency to prevent loops

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const handleCanvasClick = (e: React.MouseEvent<SVGElement>) => {
    if (!gameState.gameStarted || gameState.gameWon) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (gameState.selectedTool === 'node') {
      addNode(x, y);
    }
  };

  const addNode = (x: number, y: number) => {
    const newNode: Node = {
      id: gameState.nextNodeId,
      x,
      y,
      label: String.fromCharCode(65 + gameState.userGraph.nodes.length)
    };

    setGameState(prev => ({
      ...prev,
      userGraph: {
        ...prev.userGraph,
        nodes: [...prev.userGraph.nodes, newNode]
      },
      nextNodeId: prev.nextNodeId + 1,
      score: prev.score + 10
    }));

    toast.success('Node added!');
  };

  const handleNodeClick = (nodeId: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (gameState.selectedTool === 'edge') {
      if (gameState.selectedNode === null) {
        setGameState(prev => ({ ...prev, selectedNode: nodeId }));
        toast('Select target node for edge');
      } else if (gameState.selectedNode !== nodeId) {
        addEdge(gameState.selectedNode, nodeId);
        setGameState(prev => ({ ...prev, selectedNode: null }));
      }
    } else if (gameState.selectedTool === 'delete') {
      deleteNode(nodeId);
    }
  };

  const addEdge = (fromId: number, toId: number) => {
    // Check if edge already exists
    const edgeExists = gameState.userGraph.edges.some(edge =>
      (edge.from === fromId && edge.to === toId) ||
      (edge.from === toId && edge.to === fromId)
    );

    if (edgeExists) {
      toast.error('Edge already exists!');
      return;
    }

    const newEdge: Edge = { from: fromId, to: toId };

    setGameState(prev => ({
      ...prev,
      userGraph: {
        ...prev.userGraph,
        edges: [...prev.userGraph.edges, newEdge]
      },
      score: prev.score + 5
    }));

    toast.success('Edge added!');
    checkSolution();
  };

  const deleteNode = (nodeId: number) => {
    setGameState(prev => ({
      ...prev,
      userGraph: {
        nodes: prev.userGraph.nodes.filter(node => node.id !== nodeId),
        edges: prev.userGraph.edges.filter(edge => edge.from !== nodeId && edge.to !== nodeId)
      }
    }));

    toast.success('Node deleted!');
  };

  const checkSolution = () => {
    if (!gameState.currentChallenge) return;

    const target = gameState.currentChallenge.targetGraph;
    const user = gameState.userGraph;

    // Check if graphs are isomorphic (simplified check)
    const isCorrect = 
      user.nodes.length === target.nodes.length &&
      user.edges.length === target.edges.length &&
      checkGraphProperties();

    if (isCorrect) {
      const timeBonus = 500;
      const hintBonus = Math.max(0, (gameState.maxHints - gameState.hintsUsed) * 200);
      const newScore = gameState.score + 25 + timeBonus + hintBonus;

      setGameState(prev => ({
        ...prev,
        gameWon: true,
        score: newScore,
        level: prev.level + 1
      }));

      toast.success(`🎉 Challenge complete! +${1000 + timeBonus + hintBonus} points`);
    }
  };

  const checkGraphProperties = (): boolean => {
    if (!gameState.currentChallenge) return false;

    const target = gameState.currentChallenge.targetGraph;
    const user = gameState.userGraph;

    // Check degree sequence
    const targetDegrees = target.nodes.map(node => 
      target.edges.filter(edge => edge.from === node.id || edge.to === node.id).length
    ).sort();

    const userDegrees = user.nodes.map(node =>
      user.edges.filter(edge => edge.from === node.id || edge.to === node.id).length
    ).sort();

    return JSON.stringify(targetDegrees) === JSON.stringify(userDegrees);
  };

  const useHint = () => {
    if (gameState.hintsUsed >= gameState.maxHints || !gameState.currentChallenge) {
      toast.error('No hints remaining!');
      return;
    }

    setGameState(prev => ({
      ...prev,
      hintsUsed: prev.hintsUsed + 1
    }));

    toast(gameState.currentChallenge.hint);
  };

  const clearGraph = () => {
    setGameState(prev => ({
      ...prev,
      userGraph: { nodes: [], edges: [] },
      selectedNode: null,
      nextNodeId: 0
    }));

    toast('Graph cleared');
  };

  const nextChallenge = () => {
    const nextIndex = gameState.challengeIndex + 1;
    const nextChallengeObj = challenges[nextIndex % challenges.length];
    
    setGameState(prev => ({
      ...prev,
      challengeIndex: nextIndex,
      currentChallenge: nextChallengeObj,
      userGraph: { nodes: [], edges: [] },
      gameWon: false,
      hintsUsed: 0,
      selectedNode: null,
      nextNodeId: 0,
      level: prev.level + 1
    }));
    
    toast.success(`Challenge ${nextIndex + 1}: ${nextChallengeObj.title}`);
  };

  const resetGame = () => {
    initializeGame();
  };

  if (!gameState.currentChallenge) return null;

  const challenge = gameState.currentChallenge;

  return (
    <GameLayout
      title="Drawing Challenge"
      description="Draw graph structures based on algorithmic challenges"
      score={gameState.score}
      level={gameState.level}
    >
      {gameState.gameWon && <Confetti width={windowSize.width} height={windowSize.height} />}
      
      <div className="max-w-6xl mx-auto p-6">
        {/* Challenge Info */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{challenge.title}</h2>
              <p className="text-gray-300 mb-3">{challenge.description}</p>
              <div className="space-y-1">
                <div className="text-sm text-blue-200"><strong>Constraints:</strong></div>
                <ul className="text-sm text-blue-200 list-disc list-inside">
                  {challenge.constraints.map((constraint, index) => (
                    <li key={index}>{constraint}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                challenge.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                challenge.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {challenge.difficulty}
              </div>
              
              <div className="text-center">
                <div className="text-lg font-bold text-purple-400">Hints</div>
                <div className="text-sm text-purple-200">{gameState.hintsUsed}/{gameState.maxHints}</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tools */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-white font-medium">Tools:</div>
              <div className="flex gap-2">
                {[
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
                onClick={useHint}
                disabled={gameState.hintsUsed >= gameState.maxHints}
                className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg font-medium hover:from-yellow-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <Lightbulb className="w-4 h-4 inline mr-2" />
                Hint
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearGraph}
                className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-200"
              >
                <Palette className="w-4 h-4 inline mr-2" />
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

        {/* Drawing Canvas */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-white/10 shadow-2xl">
            <svg 
              width="600" 
              height="400" 
              className="w-full h-full cursor-crosshair"
              onClick={handleCanvasClick}
            >
              {/* Edges */}
              {gameState.userGraph.edges.map((edge, index) => {
                const fromNode = gameState.userGraph.nodes.find(n => n.id === edge.from);
                const toNode = gameState.userGraph.nodes.find(n => n.id === edge.to);
                
                if (!fromNode || !toNode) return null;
                
                return (
                  <motion.line
                    key={index}
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke="#6b7280"
                    strokeWidth={2}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5 }}
                  />
                );
              })}

              {/* Temporary edge while creating */}
              {gameState.selectedTool === 'edge' && gameState.selectedNode !== null && (
                <line
                  x1={gameState.userGraph.nodes.find(n => n.id === gameState.selectedNode)?.x || 0}
                  y1={gameState.userGraph.nodes.find(n => n.id === gameState.selectedNode)?.y || 0}
                  x2={0}
                  y2={0}
                  stroke="#fbbf24"
                  strokeWidth={2}
                  strokeDasharray="5,5"
                  className="pointer-events-none"
                />
              )}

              {/* Nodes */}
              {gameState.userGraph.nodes.map((node) => (
                <motion.g
                  key={node.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r={20}
                    fill={gameState.selectedNode === node.id ? "#fbbf24" : "#3b82f6"}
                    stroke="white"
                    strokeWidth={2}
                    className="cursor-pointer"
                    onClick={(e) => handleNodeClick(node.id, e)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
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
            </svg>
          </div>
        </motion.div>

        {/* Progress */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-8"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-blue-400">Nodes</div>
              <div className="text-sm text-blue-200">
                {gameState.userGraph.nodes.length}/{challenge.targetGraph.nodes.length}
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-400">Edges</div>
              <div className="text-sm text-green-200">
                {gameState.userGraph.edges.length}/{challenge.targetGraph.edges.length}
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-400">Tool</div>
              <div className="text-sm text-purple-200 capitalize">{gameState.selectedTool}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-orange-400">Score</div>
              <div className="text-sm text-orange-200">{gameState.score}</div>
            </div>
          </div>
        </motion.div>

        {/* Instructions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Instructions</h3>
            <div className="space-y-2 text-blue-200">
              <div>• Select "Add Node" and click on canvas to place nodes</div>
              <div>• Select "Add Edge" and click two nodes to connect them</div>
              <div>• Select "Delete" and click nodes to remove them</div>
              <div>• Follow the constraints to create the target graph</div>
              <div>• Use hints if you get stuck</div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Graph Theory</h3>
            <div className="space-y-2 text-purple-200">
              <div>• <strong>Degree:</strong> Number of edges connected to a vertex</div>
              <div>• <strong>Complete Graph:</strong> Every vertex connects to every other</div>
              <div>• <strong>Bipartite:</strong> Vertices in two groups, edges only between groups</div>
              <div>• <strong>Star Graph:</strong> One central vertex connected to all others</div>
              <div>• <strong>Cycle:</strong> Vertices connected in a closed loop</div>
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
                  
                  <h2 className="text-2xl font-bold text-white mb-2">Challenge Complete!</h2>
                  <p className="text-blue-200 mb-6">Perfect! You drew the {challenge.title}.</p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between">
                      <span className="text-blue-200">Score:</span>
                      <span className="text-white font-bold">{gameState.score.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-200">Hints Used:</span>
                      <span className="text-white font-bold">{gameState.hintsUsed}/{gameState.maxHints}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={nextChallenge}
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
                      Replay
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
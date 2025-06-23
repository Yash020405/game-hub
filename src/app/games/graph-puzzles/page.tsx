'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Puzzle, Trophy, Zap, CheckCircle, Lightbulb, Star } from 'lucide-react';
import GameLayout from '@/components/GameLayout';
import toast from 'react-hot-toast';
import Confetti from 'react-confetti';

interface Node {
  id: number;
  x: number;
  y: number;
  label: string;
  color: string;
  value?: number;
  fixed: boolean;
}

interface Edge {
  from: number;
  to: number;
  weight?: number;
}

interface Puzzle {
  id: string;
  title: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
  objective: string;
  hint: string;
  solution: any;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
}

interface GameState {
  currentPuzzle: Puzzle | null;
  puzzleIndex: number;
  score: number;
  level: number;
  gameStarted: boolean;
  gameWon: boolean;
  hintsUsed: number;
  maxHints: number;
  selectedNode: number | null;
}

const puzzles: Puzzle[] = [
  {
    id: 'bridges',
    title: 'Seven Bridges of Königsberg',
    description: 'Can you traverse all bridges exactly once?',
    nodes: [
      { id: 0, x: 150, y: 100, label: 'A', color: '#3b82f6', fixed: true },
      { id: 1, x: 450, y: 100, label: 'B', color: '#3b82f6', fixed: true },
      { id: 2, x: 150, y: 300, label: 'C', color: '#3b82f6', fixed: true },
      { id: 3, x: 450, y: 300, label: 'D', color: '#3b82f6', fixed: true }
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 0, to: 1 },
      { from: 0, to: 2 },
      { from: 1, to: 3 },
      { from: 2, to: 3 },
      { from: 2, to: 3 },
      { from: 0, to: 3 }
    ],
    objective: 'Find an Eulerian path (traverse all edges exactly once)',
    hint: 'Check the degree of each vertex. An Eulerian path exists if exactly 0 or 2 vertices have odd degree.',
    solution: { possible: false, reason: 'All vertices have odd degree' },
    difficulty: 'Medium'
  },
  {
    id: 'coloring',
    title: 'Four Color Problem',
    description: 'Color the map with minimum colors so no adjacent regions share the same color',
    nodes: [
      { id: 0, x: 200, y: 150, label: '1', color: '#6b7280', fixed: false },
      { id: 1, x: 350, y: 100, label: '2', color: '#6b7280', fixed: false },
      { id: 2, x: 400, y: 250, label: '3', color: '#6b7280', fixed: false },
      { id: 3, x: 250, y: 300, label: '4', color: '#6b7280', fixed: false },
      { id: 4, x: 100, y: 250, label: '5', color: '#6b7280', fixed: false }
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
      { from: 4, to: 0 },
      { from: 0, to: 2 },
      { from: 1, to: 3 }
    ],
    objective: 'Color all regions with minimum colors (no adjacent regions same color)',
    hint: 'This graph needs exactly 3 colors. Start with the vertex that has the most connections.',
    solution: { minColors: 3, validColoring: true },
    difficulty: 'Easy'
  },
  {
    id: 'hamiltonian',
    title: 'Traveling Salesman',
    description: 'Visit all cities exactly once and return to start',
    nodes: [
      { id: 0, x: 300, y: 100, label: 'Start', color: '#10b981', fixed: true },
      { id: 1, x: 150, y: 200, label: 'A', color: '#3b82f6', fixed: true },
      { id: 2, x: 450, y: 200, label: 'B', color: '#3b82f6', fixed: true },
      { id: 3, x: 200, y: 350, label: 'C', color: '#3b82f6', fixed: true },
      { id: 4, x: 400, y: 350, label: 'D', color: '#3b82f6', fixed: true }
    ],
    edges: [
      { from: 0, to: 1, weight: 5 },
      { from: 0, to: 2, weight: 3 },
      { from: 1, to: 2, weight: 8 },
      { from: 1, to: 3, weight: 4 },
      { from: 2, to: 4, weight: 6 },
      { from: 3, to: 4, weight: 2 },
      { from: 0, to: 3, weight: 7 },
      { from: 0, to: 4, weight: 9 }
    ],
    objective: 'Find the shortest Hamiltonian cycle (visit all vertices once and return)',
    hint: 'Try different routes and calculate total distances. The optimal route has distance 20.',
    solution: { shortestDistance: 20, optimalPath: [0, 2, 4, 3, 1, 0] },
    difficulty: 'Hard'
  },
  {
    id: 'matching',
    title: 'Perfect Matching',
    description: 'Match each person to exactly one job',
    nodes: [
      { id: 0, x: 100, y: 100, label: 'Alice', color: '#ef4444', fixed: true },
      { id: 1, x: 100, y: 200, label: 'Bob', color: '#ef4444', fixed: true },
      { id: 2, x: 100, y: 300, label: 'Carol', color: '#ef4444', fixed: true },
      { id: 3, x: 500, y: 100, label: 'Job1', color: '#3b82f6', fixed: true },
      { id: 4, x: 500, y: 200, label: 'Job2', color: '#3b82f6', fixed: true },
      { id: 5, x: 500, y: 300, label: 'Job3', color: '#3b82f6', fixed: true }
    ],
    edges: [
      { from: 0, to: 3 },
      { from: 0, to: 4 },
      { from: 1, to: 3 },
      { from: 1, to: 5 },
      { from: 2, to: 4 },
      { from: 2, to: 5 }
    ],
    objective: 'Create a perfect matching (each person gets exactly one job)',
    hint: 'This is a bipartite graph. Find a matching that covers all vertices.',
    solution: { perfectMatching: [[0, 4], [1, 3], [2, 5]] },
    difficulty: 'Medium'
  }
];

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

export default function GraphPuzzlesGame() {
  const [gameState, setGameState] = useState<GameState>({
    currentPuzzle: null,
    puzzleIndex: 0,
    score: 0,
    level: 1,
    gameStarted: false,
    gameWon: false,
    hintsUsed: 0,
    maxHints: 3,
    selectedNode: null
  });

  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [selectedPath, setSelectedPath] = useState<number[]>([]);

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  const initializeGame = useCallback(() => {
    const puzzle = puzzles[gameState.puzzleIndex % puzzles.length];
    
    setGameState(prev => ({
      ...prev,
      currentPuzzle: { ...puzzle, nodes: puzzle.nodes.map(n => ({ ...n })) },
      gameStarted: true,
      gameWon: false,
      hintsUsed: 0,
      selectedNode: null
    }));
  }, [gameState.puzzleIndex]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const handleNodeClick = (nodeId: number) => {
    if (!gameState.currentPuzzle) return;

    const puzzle = gameState.currentPuzzle;

    if (puzzle.id === 'coloring') {
      // Color cycling for coloring puzzle
      const newNodes = puzzle.nodes.map(node => {
        if (node.id === nodeId && !node.fixed) {
          const currentColorIndex = COLORS.indexOf(node.color);
          const nextColorIndex = (currentColorIndex + 1) % COLORS.length;
          return { ...node, color: COLORS[nextColorIndex] };
        }
        return node;
      });

      setGameState(prev => ({
        ...prev,
        currentPuzzle: { ...puzzle, nodes: newNodes }
      }));

      checkColoringSolution(newNodes, puzzle.edges);
    } else if (puzzle.id === 'hamiltonian') {
      // Path building for TSP
      if (selectedPath.length === 0 || selectedPath[selectedPath.length - 1] !== nodeId) {
        const newPath = [...selectedPath, nodeId];
        setSelectedPath(newPath);

        if (newPath.length === puzzle.nodes.length && newPath[0] === 0) {
          // Check if we can return to start
          const lastNode = newPath[newPath.length - 1];
          const canReturnToStart = puzzle.edges.some(e => 
            (e.from === lastNode && e.to === 0) || (e.to === lastNode && e.from === 0)
          );

          if (canReturnToStart) {
            const finalPath = [...newPath, 0];
            const distance = calculatePathDistance(finalPath, puzzle.edges);
            
            if (distance === puzzle.solution.shortestDistance) {
              completePuzzle();
            } else {
              toast.error(`Path distance: ${distance}. Try to find a shorter route!`);
            }
          }
        }
      }
    }
  };

  const checkColoringSolution = (nodes: Node[], edges: Edge[]) => {
    // Check if coloring is valid
    const isValid = edges.every(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      return fromNode && toNode && fromNode.color !== toNode.color;
    });

    if (isValid && nodes.every(n => n.color !== '#6b7280')) {
      const usedColors = new Set(nodes.map(n => n.color));
      if (usedColors.size <= 3) {
        completePuzzle();
      }
    }
  };

  const calculatePathDistance = (path: number[], edges: Edge[]): number => {
    let totalDistance = 0;
    
    for (let i = 0; i < path.length - 1; i++) {
      const edge = edges.find(e => 
        (e.from === path[i] && e.to === path[i + 1]) ||
        (e.to === path[i] && e.from === path[i + 1])
      );
      
      if (edge && edge.weight) {
        totalDistance += edge.weight;
      }
    }
    
    return totalDistance;
  };

  const completePuzzle = () => {
    const timeBonus = Math.max(0, 600 * 5);
    const hintBonus = Math.max(0, (gameState.maxHints - gameState.hintsUsed) * 200);
    const newScore = gameState.score + 25 + timeBonus + hintBonus;

    setGameState(prev => ({
      ...prev,
      gameWon: true,
      score: newScore,
      level: prev.level + 1
    }));

    toast.success(`🎉 Puzzle solved! +${1000 + timeBonus + hintBonus} points`);
  };

  const useHint = () => {
    if (gameState.hintsUsed >= gameState.maxHints || !gameState.currentPuzzle) {
      toast.error('No hints remaining!');
      return;
    }

    setGameState(prev => ({
      ...prev,
      hintsUsed: prev.hintsUsed + 1
    }));

    toast(gameState.currentPuzzle.hint);
  };

  const nextPuzzle = () => {
    setGameState(prev => ({
      ...prev,
      puzzleIndex: prev.puzzleIndex + 1,
      gameWon: false
    }));
    setSelectedPath([]);
  };

  const resetPuzzle = () => {
    initializeGame();
    setSelectedPath([]);
  };

  const clearPath = () => {
    setSelectedPath([]);
  };

  if (!gameState.currentPuzzle) return null;

  const puzzle = gameState.currentPuzzle;

  return (
    <GameLayout
      title="Graph Puzzles"
      description="Solve challenging graph-based logic puzzles"
      score={gameState.score}
      level={gameState.level}
    >
      {gameState.gameWon && <Confetti width={windowSize.width} height={windowSize.height} />}
      
      <div className="max-w-6xl mx-auto p-6">
        {/* Puzzle Info */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{puzzle.title}</h2>
              <p className="text-gray-300 mb-2">{puzzle.description}</p>
              <p className="text-blue-200 text-sm"><strong>Objective:</strong> {puzzle.objective}</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                puzzle.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                puzzle.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                puzzle.difficulty === 'Hard' ? 'bg-orange-500/20 text-orange-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {puzzle.difficulty}
              </div>
              
              <div className="text-center">
                <div className="text-lg font-bold text-purple-400">Hints</div>
                <div className="text-sm text-purple-200">{gameState.hintsUsed}/{gameState.maxHints}</div>
              </div>
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
            onClick={useHint}
            disabled={gameState.hintsUsed >= gameState.maxHints}
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg font-medium hover:from-yellow-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Lightbulb className="w-4 h-4 inline mr-2" />
            Use Hint
          </motion.button>
          
          {puzzle.id === 'hamiltonian' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={clearPath}
              className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-200"
            >
              Clear Path
            </motion.button>
          )}
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetPuzzle}
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-pink-700 transition-all duration-200"
          >
            <RotateCcw className="w-4 h-4 inline mr-2" />
            Reset
          </motion.button>
        </motion.div>

        {/* Puzzle Visualization */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-white/10 shadow-2xl">
            <svg width="600" height="400" className="w-full h-full">
              {/* Edges */}
              {puzzle.edges.map((edge, index) => {
                const fromNode = puzzle.nodes.find(n => n.id === edge.from);
                const toNode = puzzle.nodes.find(n => n.id === edge.to);
                
                if (!fromNode || !toNode) return null;
                
                const isInPath = puzzle.id === 'hamiltonian' && 
                  selectedPath.length > 1 &&
                  selectedPath.some((nodeId, i) => 
                    i < selectedPath.length - 1 &&
                    ((selectedPath[i] === edge.from && selectedPath[i + 1] === edge.to) ||
                     (selectedPath[i] === edge.to && selectedPath[i + 1] === edge.from))
                  );
                
                return (
                  <g key={`${edge.from}-${edge.to}-${index}`}>
                    <line
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      stroke={isInPath ? "#10b981" : "#6b7280"}
                      strokeWidth={isInPath ? 4 : 2}
                    />
                    
                    {edge.weight && (
                      <text
                        x={(fromNode.x + toNode.x) / 2}
                        y={(fromNode.y + toNode.y) / 2 - 10}
                        textAnchor="middle"
                        fill="white"
                        fontSize="12"
                        fontWeight="bold"
                      >
                        {edge.weight}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {puzzle.nodes.map((node, index) => (
                <motion.g
                  key={node.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r={25}
                    fill={node.color}
                    stroke={selectedPath.includes(node.id) ? "#fbbf24" : "white"}
                    strokeWidth={selectedPath.includes(node.id) ? 4 : 2}
                    className="cursor-pointer"
                    onClick={() => handleNodeClick(node.id)}
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

        {/* Path Display for TSP */}
        {puzzle.id === 'hamiltonian' && selectedPath.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-8"
          >
            <h3 className="text-lg font-bold text-white mb-2">Current Path:</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedPath.map((nodeId, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="px-3 py-1 bg-blue-600 text-white rounded-lg font-bold">
                    {puzzle.nodes.find(n => n.id === nodeId)?.label}
                  </div>
                  {index < selectedPath.length - 1 && (
                    <span className="text-gray-400">→</span>
                  )}
                </div>
              ))}
            </div>
            {selectedPath.length > 1 && (
              <div className="mt-2 text-sm text-gray-300">
                Distance: {calculatePathDistance(selectedPath, puzzle.edges)}
              </div>
            )}
          </motion.div>
        )}

        {/* Instructions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Instructions</h3>
            <div className="space-y-2 text-blue-200">
              {puzzle.id === 'coloring' && (
                <>
                  <div>• Click nodes to cycle through colors</div>
                  <div>• Adjacent nodes cannot have the same color</div>
                  <div>• Use minimum number of colors</div>
                </>
              )}
              {puzzle.id === 'hamiltonian' && (
                <>
                  <div>• Click nodes to build a path</div>
                  <div>• Visit each city exactly once</div>
                  <div>• Return to the starting city</div>
                  <div>• Find the shortest total distance</div>
                </>
              )}
              {puzzle.id === 'bridges' && (
                <>
                  <div>• Analyze the graph structure</div>
                  <div>• Count the degree of each vertex</div>
                  <div>• Determine if Eulerian path exists</div>
                </>
              )}
              {puzzle.id === 'matching' && (
                <>
                  <div>• Match people to jobs</div>
                  <div>• Each person gets exactly one job</div>
                  <div>• Each job goes to exactly one person</div>
                </>
              )}
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Graph Theory Concepts</h3>
            <div className="space-y-2 text-purple-200">
              {puzzle.id === 'coloring' && (
                <>
                  <div>• <strong>Graph Coloring:</strong> Assign colors to vertices</div>
                  <div>• <strong>Chromatic Number:</strong> Minimum colors needed</div>
                  <div>• <strong>Four Color Theorem:</strong> Planar graphs need ≤4 colors</div>
                </>
              )}
              {puzzle.id === 'hamiltonian' && (
                <>
                  <div>• <strong>Hamiltonian Path:</strong> Visit each vertex once</div>
                  <div>• <strong>TSP:</strong> Shortest Hamiltonian cycle</div>
                  <div>• <strong>NP-Hard:</strong> No known efficient algorithm</div>
                </>
              )}
              {puzzle.id === 'bridges' && (
                <>
                  <div>• <strong>Eulerian Path:</strong> Traverse each edge once</div>
                  <div>• <strong>Vertex Degree:</strong> Number of incident edges</div>
                  <div>• <strong>Euler's Theorem:</strong> Conditions for Eulerian paths</div>
                </>
              )}
              {puzzle.id === 'matching' && (
                <>
                  <div>• <strong>Bipartite Graph:</strong> Two disjoint vertex sets</div>
                  <div>• <strong>Perfect Matching:</strong> Every vertex is matched</div>
                  <div>• <strong>Hall's Theorem:</strong> Conditions for perfect matching</div>
                </>
              )}
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
                  
                  <h2 className="text-2xl font-bold text-white mb-2">Puzzle Solved!</h2>
                  <p className="text-blue-200 mb-6">Excellent work on {puzzle.title}!</p>
                  
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
                  
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={nextPuzzle}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200"
                    >
                      Next Puzzle
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={resetPuzzle}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-200"
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
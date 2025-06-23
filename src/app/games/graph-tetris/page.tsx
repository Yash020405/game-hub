'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Gamepad2, Trophy, Zap, CheckCircle, ArrowDown, RotateCw } from 'lucide-react';
import GameLayout from '@/components/GameLayout';
import toast from 'react-hot-toast';
import Confetti from 'react-confetti';

interface Block {
  x: number;
  y: number;
  color: string;
  connections: number[];
}

interface Piece {
  blocks: Block[];
  centerX: number;
  centerY: number;
  type: string;
}

interface GameState {
  grid: (Block | null)[][];
  currentPiece: Piece | null;
  nextPiece: Piece | null;
  score: number;
  level: number;
  lines: number;
  gameStarted: boolean;
  gameOver: boolean;
  dropTime: number;
  lastDrop: number;
  connections: number;
  chainMultiplier: number;
  showTutorial: boolean;
  completedGraphs: number;
}

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316'];

const PIECE_TEMPLATES = [
  // I-piece (line graph)
  {
    type: 'I',
    blocks: [
      { x: 0, y: 0, connections: [1] },
      { x: 1, y: 0, connections: [0, 2] },
      { x: 2, y: 0, connections: [1, 3] },
      { x: 3, y: 0, connections: [2] }
    ]
  },
  // L-piece (path graph)
  {
    type: 'L',
    blocks: [
      { x: 0, y: 0, connections: [1] },
      { x: 1, y: 0, connections: [0, 2] },
      { x: 2, y: 0, connections: [1, 3] },
      { x: 2, y: 1, connections: [2] }
    ]
  },
  // T-piece (star graph)
  {
    type: 'T',
    blocks: [
      { x: 1, y: 0, connections: [1, 2, 3] },
      { x: 0, y: 1, connections: [0] },
      { x: 1, y: 1, connections: [0] },
      { x: 2, y: 1, connections: [0] }
    ]
  },
  // O-piece (cycle graph)
  {
    type: 'O',
    blocks: [
      { x: 0, y: 0, connections: [1, 3] },
      { x: 1, y: 0, connections: [0, 2] },
      { x: 1, y: 1, connections: [1, 3] },
      { x: 0, y: 1, connections: [2, 0] }
    ]
  },
  // S-piece (path graph)
  {
    type: 'S',
    blocks: [
      { x: 1, y: 0, connections: [1] },
      { x: 2, y: 0, connections: [0, 2] },
      { x: 0, y: 1, connections: [3] },
      { x: 1, y: 1, connections: [2, 1] }
    ]
  }
];

const GRID_WIDTH = 10;
const GRID_HEIGHT = 20;

const TUTORIAL_STEPS = [
  {
    title: "Welcome to Graph Tetris!",
    description: "This is Tetris with a graph theory twist. Each piece represents a different type of graph structure.",
    image: "🎮"
  },
  {
    title: "Graph Pieces",
    description: "I-piece = Path Graph, T-piece = Star Graph, O-piece = Cycle Graph, etc. Each has unique connection properties.",
    image: "📊"
  },
  {
    title: "Scoring System",
    description: "Score points by: 1) Forming complete graph structures 2) Creating connections between pieces 3) Clearing lines",
    image: "🏆"
  },
  {
    title: "Graph Connections",
    description: "When pieces connect, you form larger graph structures. More connections = higher multipliers!",
    image: "🔗"
  }
];

export default function GraphTetrisGame() {
  const [gameState, setGameState] = useState<GameState>({
    grid: Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null)),
    currentPiece: null,
    nextPiece: null,
    score: 0,
    level: 1,
    lines: 0,
    gameStarted: false,
    gameOver: false,
    dropTime: 1000,
    lastDrop: 0,
    connections: 0,
    chainMultiplier: 1,
    showTutorial: true,
    completedGraphs: 0
  });

  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [currentTutorialStep, setCurrentTutorialStep] = useState(0);

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  const createPiece = useCallback((template?: any): Piece => {
    const pieceTemplate = template || PIECE_TEMPLATES[Math.floor(Math.random() * PIECE_TEMPLATES.length)];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    
    return {
      blocks: pieceTemplate.blocks.map((block: any) => ({
        x: block.x,
        y: block.y,
        color,
        connections: block.connections
      })),
      centerX: Math.floor(GRID_WIDTH / 2) - 1,
      centerY: 0,
      type: pieceTemplate.type
    };
  }, []);

  const initializeGame = useCallback(() => {
    const newGrid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null));
    const currentPiece = createPiece();
    const nextPiece = createPiece();
    
    setGameState(prev => ({
      ...prev,
      grid: newGrid,
      currentPiece,
      nextPiece,
      score: 0,
      lines: 0,
      gameStarted: true,
      gameOver: false,
      dropTime: Math.max(200, 1000 - (prev.level - 1) * 50),
      lastDrop: Date.now(),
      connections: 0,
      chainMultiplier: 1,
      showTutorial: true,
      completedGraphs: 0
    }));
  }, [createPiece]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const isValidPosition = (piece: Piece, offsetX: number = 0, offsetY: number = 0): boolean => {
    return piece.blocks.every(block => {
      const newX = piece.centerX + block.x + offsetX;
      const newY = piece.centerY + block.y + offsetY;
      
      return (
        newX >= 0 &&
        newX < GRID_WIDTH &&
        newY >= 0 &&
        newY < GRID_HEIGHT &&
        !gameState.grid[newY][newX]
      );
    });
  };

  const placePiece = () => {
    if (!gameState.currentPiece) return;

    const newGrid = gameState.grid.map(row => [...row]);
    let newConnections = gameState.connections;

    // Place blocks
    gameState.currentPiece.blocks.forEach(block => {
      const x = gameState.currentPiece!.centerX + block.x;
      const y = gameState.currentPiece!.centerY + block.y;
      newGrid[y][x] = { ...block, x, y };
    });

    // Count new connections formed
    gameState.currentPiece.blocks.forEach(block => {
      const x = gameState.currentPiece!.centerX + block.x;
      const y = gameState.currentPiece!.centerY + block.y;
      
      // Check adjacent cells for connections
      const directions = [
        { dx: 0, dy: -1 }, // Up
        { dx: 1, dy: 0 },  // Right
        { dx: 0, dy: 1 },  // Down
        { dx: -1, dy: 0 }  // Left
      ];

      directions.forEach(dir => {
        const adjX = x + dir.dx;
        const adjY = y + dir.dy;
        
        if (adjX >= 0 && adjX < GRID_WIDTH && adjY >= 0 && adjY < GRID_HEIGHT) {
          const adjBlock = newGrid[adjY][adjX];
          if (adjBlock && adjBlock.color === block.color) {
            newConnections++;
          }
        }
      });
    });

    // Check for completed lines
    const completedLines: number[] = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      if (newGrid[y].every(cell => cell !== null)) {
        completedLines.push(y);
      }
    }

    // Remove completed lines
    completedLines.forEach(lineY => {
      newGrid.splice(lineY, 1);
      newGrid.unshift(Array(GRID_WIDTH).fill(null));
    });

    const linesCleared = completedLines.length;
    const lineScore = linesCleared * 100 * gameState.level;
    const connectionScore = newConnections * 10 * gameState.chainMultiplier;
    
    // Check for game over
    const gameOver = !isValidPosition(gameState.nextPiece || createPiece());

    setGameState(prev => ({
      ...prev,
      grid: newGrid,
      currentPiece: prev.nextPiece,
      nextPiece: createPiece(),
      score: prev.score + lineScore + connectionScore,
      lines: prev.lines + linesCleared,
      level: Math.floor(prev.lines / 10) + 1,
      gameOver,
      connections: newConnections,
      chainMultiplier: Math.max(1, prev.chainMultiplier - 0.1),
      showTutorial: false,
      completedGraphs: prev.completedGraphs + detectCompletedGraphs(newGrid)
    }));

    if (linesCleared > 0) {
      toast.success(`${linesCleared} line${linesCleared > 1 ? 's' : ''} cleared! +${lineScore} points`);
    }

    if (newConnections > gameState.connections) {
      toast.success(`+${newConnections - gameState.connections} connections! +${connectionScore} points`);
    }

    if (gameOver) {
      toast.error('Game Over!');
    }
  };

  const movePiece = (dx: number, dy: number) => {
    if (!gameState.currentPiece || gameState.gameOver) return;

    if (isValidPosition(gameState.currentPiece, dx, dy)) {
      setGameState(prev => ({
        ...prev,
        currentPiece: prev.currentPiece ? {
          ...prev.currentPiece,
          centerX: prev.currentPiece.centerX + dx,
          centerY: prev.currentPiece.centerY + dy
        } : null,
        lastDrop: dy > 0 ? Date.now() : prev.lastDrop
      }));
    } else if (dy > 0) {
      // Can't move down, place the piece
      placePiece();
    }
  };

  const rotatePiece = () => {
    if (!gameState.currentPiece || gameState.gameOver) return;

    const rotatedBlocks = gameState.currentPiece.blocks.map(block => ({
      ...block,
      x: -block.y,
      y: block.x
    }));

    const rotatedPiece = {
      ...gameState.currentPiece,
      blocks: rotatedBlocks
    };

    if (isValidPosition(rotatedPiece)) {
      setGameState(prev => ({
        ...prev,
        currentPiece: rotatedPiece
      }));
    }
  };

  const dropPiece = () => {
    if (!gameState.currentPiece || gameState.gameOver) return;

    let dropDistance = 0;
    while (isValidPosition(gameState.currentPiece, 0, dropDistance + 1)) {
      dropDistance++;
    }

    setGameState(prev => ({
      ...prev,
      currentPiece: prev.currentPiece ? {
        ...prev.currentPiece,
        centerY: prev.currentPiece.centerY + dropDistance
      } : null
    }));

    setTimeout(placePiece, 100);
  };

  // Game loop
  useEffect(() => {
    if (!gameState.gameStarted || gameState.gameOver || !gameState.currentPiece) return;

    const gameLoop = () => {
      const now = Date.now();
      if (now - gameState.lastDrop > gameState.dropTime && gameState.currentPiece) {
        // Check if piece can move down
        if (isValidPosition(gameState.currentPiece, 0, 1)) {
          movePiece(0, 1);
        } else {
          // Piece can't move down, place it
          placePiece();
        }
      }
    };

    const interval = setInterval(gameLoop, 50);
    return () => clearInterval(interval);
  }, [gameState.gameStarted, gameState.gameOver, gameState.currentPiece, gameState.lastDrop, gameState.dropTime]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameState.gameStarted || gameState.gameOver) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          movePiece(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          movePiece(1, 0);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          movePiece(0, 1);
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
        case ' ':
          rotatePiece();
          break;
        case 'Enter':
          dropPiece();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState.gameStarted, gameState.gameOver]);

  const resetGame = () => {
    setGameState(prev => ({ ...prev, level: 1 }));
    initializeGame();
  };

  const renderGrid = () => {
    const displayGrid = gameState.grid.map(row => [...row]);

    // Add current piece to display grid
    if (gameState.currentPiece) {
      gameState.currentPiece.blocks.forEach(block => {
        const x = gameState.currentPiece!.centerX + block.x;
        const y = gameState.currentPiece!.centerY + block.y;
        if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
          displayGrid[y][x] = block;
        }
      });
    }

    return displayGrid;
  };

  const calculateConnectionScore = (newGrid: (Block | null)[][]): number => {
    let connectionScore = 0;
    let totalConnections = 0;
    
    // Calculate connections between adjacent blocks
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const block = newGrid[y][x];
        if (!block) continue;
        
        const directions = [
          { dx: 0, dy: -1 }, // Up
          { dx: 1, dy: 0 },  // Right
          { dx: 0, dy: 1 },  // Down
          { dx: -1, dy: 0 }  // Left
        ];
        
        directions.forEach(dir => {
          const adjX = x + dir.dx;
          const adjY = y + dir.dy;
          
          if (adjX >= 0 && adjX < GRID_WIDTH && adjY >= 0 && adjY < GRID_HEIGHT) {
            const adjBlock = newGrid[adjY][adjX];
            if (adjBlock && adjBlock.color === block.color) {
              totalConnections++;
              connectionScore += 10 * gameState.chainMultiplier;
            }
          }
        });
      }
    }
    
    return connectionScore;
  };

  const detectCompletedGraphs = (newGrid: (Block | null)[][]): number => {
    // Detect specific graph patterns and award bonus points
    let completedGraphs = 0;
    
    // Simple pattern detection for cycles, stars, etc.
    // This is a simplified version - can be expanded
    for (let y = 0; y < GRID_HEIGHT - 2; y++) {
      for (let x = 0; x < GRID_WIDTH - 2; x++) {
        // Check for triangle (3-cycle)
        if (detectTriangle(newGrid, x, y)) {
          completedGraphs++;
        }
        // Check for star pattern
        if (detectStar(newGrid, x, y)) {
          completedGraphs++;
        }
      }
    }
    
    return completedGraphs;
  };

  const detectTriangle = (grid: (Block | null)[][], startX: number, startY: number): boolean => {
    const positions = [
      { x: startX, y: startY },
      { x: startX + 1, y: startY },
      { x: startX, y: startY + 1 }
    ];
    
    return positions.every(pos => {
      const block = grid[pos.y]?.[pos.x];
      return block && block.color;
    });
  };

  const detectStar = (grid: (Block | null)[][], startX: number, startY: number): boolean => {
    const center = grid[startY + 1]?.[startX + 1];
    if (!center) return false;
    
    const spokes = [
      grid[startY]?.[startX + 1],     // Top
      grid[startY + 1]?.[startX + 2], // Right
      grid[startY + 2]?.[startX + 1], // Bottom
      grid[startY + 1]?.[startX]      // Left
    ];
    
    return spokes.every(spoke => spoke && spoke.color === center.color);
  };

  const closeTutorial = () => {
    setGameState(prev => ({ ...prev, showTutorial: false }));
  };

  const nextTutorialStep = () => {
    if (currentTutorialStep < TUTORIAL_STEPS.length - 1) {
      setCurrentTutorialStep(prev => prev + 1);
    } else {
      closeTutorial();
    }
  };

  const prevTutorialStep = () => {
    if (currentTutorialStep > 0) {
      setCurrentTutorialStep(prev => prev - 1);
    }
  };

  return (
    <GameLayout
      title="Graph Tetris"
      description="Tetris with graph connection mechanics"
      score={gameState.score}
      level={gameState.level}
    >
      {gameState.lines >= 10 && <Confetti width={windowSize.width} height={windowSize.height} />}
      
      {/* Tutorial Modal */}
      <AnimatePresence>
        {gameState.showTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 max-w-md mx-4 border border-white/10"
            >
              <div className="text-center">
                <div className="text-6xl mb-4">{TUTORIAL_STEPS[currentTutorialStep].image}</div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  {TUTORIAL_STEPS[currentTutorialStep].title}
                </h3>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  {TUTORIAL_STEPS[currentTutorialStep].description}
                </p>
                
                <div className="flex justify-between items-center">
                  <button
                    onClick={prevTutorialStep}
                    disabled={currentTutorialStep === 0}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <div className="flex space-x-2">
                    {TUTORIAL_STEPS.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full ${
                          index === currentTutorialStep ? 'bg-blue-500' : 'bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  
                  <button
                    onClick={nextTutorialStep}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {currentTutorialStep === TUTORIAL_STEPS.length - 1 ? 'Start Playing' : 'Next'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
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
                  <CheckCircle className="w-5 h-5" />
                  Lines
                </div>
                <div className="text-sm text-blue-200">{gameState.lines}</div>
              </motion.div>
              <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-green-400 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Connections
                </div>
                <div className="text-sm text-green-200">{gameState.connections}</div>
              </motion.div>
              <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-purple-400 flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5" />
                  Speed
                </div>
                <div className="text-sm text-purple-200">Level {gameState.level}</div>
              </motion.div>
            </div>
            
            <div className="flex gap-2">
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

        <div className="flex justify-center gap-8">
          {/* Game Grid */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-2xl"
          >
            <div 
              className="grid gap-1 border-2 border-gray-400"
              style={{ 
                gridTemplateColumns: `repeat(${GRID_WIDTH}, 1fr)`,
                width: `${GRID_WIDTH * 25}px`,
                height: `${GRID_HEIGHT * 25}px`
              }}
            >
              {renderGrid().map((row, y) =>
                row.map((cell, x) => (
                  <motion.div
                    key={`${x}-${y}`}
                    className="w-6 h-6 border border-gray-600"
                    style={{ 
                      backgroundColor: cell ? cell.color : '#374151'
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: (y * GRID_WIDTH + x) * 0.001 }}
                  />
                ))
              )}
            </div>
          </motion.div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Next Piece */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
            >
              <h3 className="text-lg font-bold text-white mb-3">Next Piece</h3>
              <div className="w-24 h-24 bg-gray-800 rounded-lg flex items-center justify-center">
                {gameState.nextPiece && (
                  <div className="relative">
                    {gameState.nextPiece.blocks.map((block, index) => (
                      <div
                        key={index}
                        className="absolute w-4 h-4 border border-gray-600"
                        style={{
                          backgroundColor: block.color,
                          left: `${block.x * 16}px`,
                          top: `${block.y * 16}px`
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Controls */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
            >
              <h3 className="text-lg font-bold text-white mb-3">Controls</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => movePiece(-1, 0)}
                    className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center"
                  >
                    ←
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => movePiece(1, 0)}
                    className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center"
                  >
                    →
                  </motion.button>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => movePiece(0, 1)}
                  className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center"
                >
                  <ArrowDown className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={rotatePiece}
                  className="w-8 h-8 bg-green-600 rounded flex items-center justify-center"
                >
                  <RotateCw className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={dropPiece}
                  className="w-16 h-8 bg-red-600 rounded flex items-center justify-center text-xs"
                >
                  Drop
                </motion.button>
              </div>
            </motion.div>

            {/* Statistics */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
            >
              <h3 className="text-lg font-bold text-white mb-3">Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Score:</span>
                  <span className="text-white font-bold">{gameState.score.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Lines:</span>
                  <span className="text-white font-bold">{gameState.lines}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Level:</span>
                  <span className="text-white font-bold">{gameState.level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Connections:</span>
                  <span className="text-white font-bold">{gameState.connections}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Game Info */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">How to Play</h3>
            <div className="space-y-2 text-blue-200">
              <div>• Use arrow keys or buttons to move pieces</div>
              <div>• Rotate pieces to fit them together</div>
              <div>• Clear horizontal lines to score points</div>
              <div>• Connect same-colored blocks for bonus points</div>
              <div>• Game speeds up as you progress</div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Graph Mechanics</h3>
            <div className="space-y-2 text-purple-200">
              <div>• <strong>Pieces:</strong> Different graph structures</div>
              <div>• <strong>Connections:</strong> Adjacent same-colored blocks</div>
              <div>• <strong>Networks:</strong> Build connected components</div>
              <div>• <strong>Optimization:</strong> Maximize connections</div>
              <div>• <strong>Strategy:</strong> Plan for graph formation</div>
            </div>
          </div>
        </motion.div>

        {/* Game Over Modal */}
        <AnimatePresence>
          {gameState.gameOver && (
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
                className="bg-gradient-to-br from-red-900/90 to-orange-900/90 backdrop-blur-sm rounded-2xl p-8 border border-white/20 max-w-md w-full mx-4"
              >
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="w-16 h-16 bg-gradient-to-r from-red-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <Gamepad2 className="w-8 h-8 text-white" />
                  </motion.div>
                  
                  <h2 className="text-2xl font-bold text-white mb-2">Game Over!</h2>
                  <p className="text-orange-200 mb-6">The blocks have reached the top!</p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between">
                      <span className="text-orange-200">Final Score:</span>
                      <span className="text-white font-bold">{gameState.score.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-200">Lines Cleared:</span>
                      <span className="text-white font-bold">{gameState.lines}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-200">Level Reached:</span>
                      <span className="text-white font-bold">{gameState.level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-200">Connections:</span>
                      <span className="text-white font-bold">{gameState.connections}</span>
                    </div>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={resetGame}
                    className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200"
                  >
                    Play Again
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GameLayout>
  );
}
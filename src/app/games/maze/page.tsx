'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Navigation, Trophy, Zap, Target, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import GameLayout from '@/components/GameLayout';
import { useGameProgress } from '@/lib/useGameProgress';
import toast from 'react-hot-toast';
import Confetti from 'react-confetti';

interface Cell {
  x: number;
  y: number;
  isWall: boolean;
  isPath: boolean;
  isVisited: boolean;
  isStart: boolean;
  isEnd: boolean;
  isPlayer: boolean;
  distance: number;
}

interface GameState {
  maze: Cell[][];
  playerPos: { x: number; y: number };
  endPos: { x: number; y: number };
  score: number;
  level: number;
  gameStarted: boolean;
  gameWon: boolean;
  moves: number;
  algorithm: 'player' | 'bfs' | 'dfs' | 'astar';
  isRunning: boolean;
  pathFound: boolean;
}

const MAZE_SIZE = 15;

const generateMaze = (level: number): Cell[][] => {
  const size = Math.min(MAZE_SIZE + level, 25);
  const maze: Cell[][] = [];
  
  // Initialize maze with walls
  for (let y = 0; y < size; y++) {
    maze[y] = [];
    for (let x = 0; x < size; x++) {
      maze[y][x] = {
        x,
        y,
        isWall: true,
        isPath: false,
        isVisited: false,
        isStart: false,
        isEnd: false,
        isPlayer: false,
        distance: Infinity
      };
    }
  }
  
  // Generate maze using recursive backtracking
  const stack: { x: number; y: number }[] = [];
  const startX = 1;
  const startY = 1;
  
  maze[startY][startX].isWall = false;
  stack.push({ x: startX, y: startY });
  
  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = [];
    
    // Check all four directions
    const directions = [
      { x: 0, y: -2 }, // Up
      { x: 2, y: 0 },  // Right
      { x: 0, y: 2 },  // Down
      { x: -2, y: 0 }  // Left
    ];
    
    for (const dir of directions) {
      const newX = current.x + dir.x;
      const newY = current.y + dir.y;
      
      if (newX > 0 && newX < size - 1 && newY > 0 && newY < size - 1 && maze[newY][newX].isWall) {
        neighbors.push({ x: newX, y: newY });
      }
    }
    
    if (neighbors.length > 0) {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      
      // Remove wall between current and next
      const wallX = current.x + (next.x - current.x) / 2;
      const wallY = current.y + (next.y - current.y) / 2;
      
      maze[next.y][next.x].isWall = false;
      maze[wallY][wallX].isWall = false;
      
      stack.push(next);
    } else {
      stack.pop();
    }
  }
  
  // Ensure end position is accessible
  const endX = size - 2;
  const endY = size - 2;
  maze[endY][endX].isWall = false;
  
  // Create path to end if not already accessible
  if (!isPathAccessible(maze, { x: 1, y: 1 }, { x: endX, y: endY })) {
    // Force a path to the end by removing walls
    let currentX = endX;
    let currentY = endY;
    
    // Move towards start, clearing walls if needed
    while (currentX > 1 || currentY > 1) {
      maze[currentY][currentX].isWall = false;
      
      if (currentX > 1) {
        currentX--;
        maze[currentY][currentX].isWall = false;
      } else if (currentY > 1) {
        currentY--;
        maze[currentY][currentX].isWall = false;
      }
    }
  }
  
  // Set start and end positions
  maze[1][1].isStart = true;
  maze[1][1].isPlayer = true;
  maze[endY][endX].isEnd = true;
  
  return maze;
};

// Helper function to check if path exists
const isPathAccessible = (maze: Cell[][], start: { x: number; y: number }, end: { x: number; y: number }): boolean => {
  const visited = new Set<string>();
  const queue: { x: number; y: number }[] = [start];
  visited.add(`${start.x},${start.y}`);
  
  const directions = [
    { x: 0, y: -1 }, // Up
    { x: 1, y: 0 },  // Right
    { x: 0, y: 1 },  // Down
    { x: -1, y: 0 }  // Left
  ];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.x === end.x && current.y === end.y) {
      return true;
    }
    
    for (const dir of directions) {
      const newX = current.x + dir.x;
      const newY = current.y + dir.y;
      const key = `${newX},${newY}`;
      
      if (
        newX >= 0 && newX < maze[0].length &&
        newY >= 0 && newY < maze.length &&
        !maze[newY][newX].isWall &&
        !visited.has(key)
      ) {
        visited.add(key);
        queue.push({ x: newX, y: newY });
      }
    }
  }
  
  return false;
};

const solveMazeBFS = (maze: Cell[][], start: { x: number; y: number }, end: { x: number; y: number }): Cell[][] => {
  const result = maze.map(row => row.map(cell => ({ ...cell, isVisited: false, isPath: false })));
  const queue: { x: number; y: number; path: { x: number; y: number }[] }[] = [];
  const visited = new Set<string>();
  
  queue.push({ x: start.x, y: start.y, path: [start] });
  visited.add(`${start.x},${start.y}`);
  
  const directions = [
    { x: 0, y: -1 }, // Up
    { x: 1, y: 0 },  // Right
    { x: 0, y: 1 },  // Down
    { x: -1, y: 0 }  // Left
  ];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    result[current.y][current.x].isVisited = true;
    
    if (current.x === end.x && current.y === end.y) {
      // Mark path
      current.path.forEach(pos => {
        result[pos.y][pos.x].isPath = true;
      });
      break;
    }
    
    for (const dir of directions) {
      const newX = current.x + dir.x;
      const newY = current.y + dir.y;
      const key = `${newX},${newY}`;
      
      if (
        newX >= 0 && newX < maze[0].length &&
        newY >= 0 && newY < maze.length &&
        !maze[newY][newX].isWall &&
        !visited.has(key)
      ) {
        visited.add(key);
        queue.push({
          x: newX,
          y: newY,
          path: [...current.path, { x: newX, y: newY }]
        });
      }
    }
  }
  
  return result;
};

export default function MazeGame() {
  const { saveProgress, initializeGame: initProgress, getBestScore, getCurrentLevel } = useGameProgress('maze');

  const [gameState, setGameState] = useState<GameState>({
    maze: [],
    playerPos: { x: 1, y: 1 },
    endPos: { x: 13, y: 13 },
    score: 0,
    level: 1,
    gameStarted: false,
    gameWon: false,
    moves: 0,
    algorithm: 'player',
    isRunning: false,
    pathFound: false
  });

  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  const initializeGameLevel = useCallback(() => {
    const savedGame = initProgress();
    const newMaze = generateMaze(savedGame.level);
    const size = newMaze.length;
    
    setGameState(prev => ({
      ...prev,
      maze: newMaze,
      playerPos: { x: 1, y: 1 },
      endPos: { x: size - 2, y: size - 2 },
      score: savedGame.score,
      level: savedGame.level,
      gameStarted: true,
      gameWon: false,
      moves: 0,
      isRunning: false,
      pathFound: false
    }));
  }, []); // Remove initProgress dependency to prevent loops

  useEffect(() => {
    initializeGameLevel();
  }, [initializeGameLevel]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameState.gameStarted || gameState.gameWon || gameState.isRunning) return;
      
      let newX = gameState.playerPos.x;
      let newY = gameState.playerPos.y;
      
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          newY--;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          newY++;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          newX--;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          newX++;
          break;
        default:
          return;
      }
      
      movePlayer(newX, newY);
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState.playerPos, gameState.gameStarted, gameState.gameWon, gameState.isRunning]);

  const movePlayer = (newX: number, newY: number) => {
    if (
      newX < 0 || newX >= gameState.maze[0].length ||
      newY < 0 || newY >= gameState.maze.length ||
      gameState.maze[newY][newX].isWall
    ) {
      return;
    }
    
    // Update maze
    const newMaze = gameState.maze.map(row => row.map(cell => ({ ...cell })));
    newMaze[gameState.playerPos.y][gameState.playerPos.x].isPlayer = false;
    newMaze[newY][newX].isPlayer = true;
    
    setGameState(prev => ({
      ...prev,
      maze: newMaze,
      playerPos: { x: newX, y: newY },
      moves: prev.moves + 1
    }));
    
    // Check if player reached the end
    if (newX === gameState.endPos.x && newY === gameState.endPos.y) {
      const moveBonus = Math.max(0, (100 - gameState.moves) * 2); // Reduced bonus
      const levelScore = 25 + moveBonus;
      const newTotalScore = gameState.score + levelScore;
      const nextLevel = gameState.level + 1;
      
      // Save progress
      saveProgress({
        level: nextLevel,
        score: levelScore,
        completed: true,
        accuracy: Math.max(0, 100 - gameState.moves)
      });
      
      setGameState(prev => ({
        ...prev,
        gameWon: true,
        score: newTotalScore,
        level: nextLevel
      }));
      
      toast.success(`🎉 Maze solved! Moves: ${gameState.moves + 1}, +${levelScore} points`);
    }
  };

  const solveMaze = () => {
    if (gameState.isRunning) return;
    
    setGameState(prev => ({ ...prev, isRunning: true }));
    
    const solvedMaze = solveMazeBFS(gameState.maze, gameState.playerPos, gameState.endPos);
    
    setGameState(prev => ({
      ...prev,
      maze: solvedMaze,
      isRunning: false,
      pathFound: true
    }));
    
    toast.success('Path found using BFS algorithm!');
  };

  const resetGame = () => {
    initializeGameLevel();
  };

  const getCellColor = (cell: Cell) => {
    if (cell.isPlayer) return "#3b82f6"; // Blue for player
    if (cell.isStart) return "#10b981"; // Green for start
    if (cell.isEnd) return "#ef4444"; // Red for end
    if (cell.isPath) return "#f59e0b"; // Yellow for solution path
    if (cell.isVisited) return "#8b5cf6"; // Purple for visited
    if (cell.isWall) return "#1f2937"; // Dark gray for walls
    return "#f3f4f6"; // Light gray for open paths
  };

  return (
    <GameLayout
      title="Escape the Maze"
      description="Navigate through mazes using different algorithms!"
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
                  <Navigation className="w-5 h-5" />
                  Moves
                </div>
                <div className="text-sm text-blue-200">{gameState.moves}</div>
              </motion.div>
              <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-green-400 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Size
                </div>
                <div className="text-sm text-green-200">{gameState.maze.length}×{gameState.maze.length}</div>
              </motion.div>
            </div>
            
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={solveMaze}
                disabled={gameState.isRunning || gameState.pathFound}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Show Solution
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resetGame}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-pink-700 transition-all duration-200"
              >
                <RotateCcw className="w-4 h-4 inline mr-2" />
                New Maze
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-8"
        >
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-4">Controls</h3>
            <div className="flex justify-center gap-4">
              <div className="grid grid-cols-3 gap-2">
                <div></div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => movePlayer(gameState.playerPos.x, gameState.playerPos.y - 1)}
                  className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white"
                >
                  <ArrowUp className="w-4 h-4" />
                </motion.button>
                <div></div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => movePlayer(gameState.playerPos.x - 1, gameState.playerPos.y)}
                  className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white"
                >
                  <ArrowLeft className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => movePlayer(gameState.playerPos.x, gameState.playerPos.y + 1)}
                  className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white"
                >
                  <ArrowDown className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => movePlayer(gameState.playerPos.x + 1, gameState.playerPos.y)}
                  className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white"
                >
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
              <div className="text-left text-sm text-gray-300">
                <div>Use arrow keys or WASD</div>
                <div>Or click the buttons</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Maze Visualization */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-white/10 shadow-2xl">
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${gameState.maze.length}, 1fr)` }}>
              {gameState.maze.flat().map((cell, index) => (
                <motion.div
                  key={index}
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: getCellColor(cell) }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.001 }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Legend and Info */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Legend</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-blue-200">Player</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-green-200">Start</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-red-200">End</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-yellow-200">Solution Path</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-gray-800 rounded"></div>
                <span className="text-gray-200">Wall</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Maze Algorithms</h3>
            <div className="space-y-2 text-purple-200">
              <div>• <strong>Generation:</strong> Recursive backtracking</div>
              <div>• <strong>Solving:</strong> Breadth-First Search (BFS)</div>
              <div>• BFS guarantees shortest path</div>
              <div>• Used in robotics and pathfinding</div>
              <div>• Essential for navigation systems</div>
            </div>
          </div>
        </motion.div>
      </div>
    </GameLayout>
  );
}
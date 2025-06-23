'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Bomb, Trophy, Zap, Flag, Timer } from 'lucide-react';
import GameLayout from '@/components/GameLayout';
import toast from 'react-hot-toast';
import Confetti from 'react-confetti';

interface Cell {
  x: number;
  y: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
}

interface GameState {
  grid: Cell[][];
  gameStarted: boolean;
  gameWon: boolean;
  gameOver: boolean;
  score: number;
  level: number;
  mineCount: number;
  flagCount: number;
  revealedCount: number;
  gridSize: number;
}

const generateMineField = (size: number, mineCount: number, firstClickX: number, firstClickY: number): Cell[][] => {
  const grid: Cell[][] = Array(size).fill(null).map((_, y) =>
    Array(size).fill(null).map((_, x) => ({
      x,
      y,
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      neighborMines: 0
    }))
  );
  
  // Place mines randomly, avoiding first click area
  let minesPlaced = 0;
  while (minesPlaced < mineCount) {
    const x = Math.floor(Math.random() * size);
    const y = Math.floor(Math.random() * size);
    
    // Don't place mine on first click or its neighbors
    const isFirstClickArea = Math.abs(x - firstClickX) <= 1 && Math.abs(y - firstClickY) <= 1;
    
    if (!grid[y][x].isMine && !isFirstClickArea) {
      grid[y][x].isMine = true;
      minesPlaced++;
    }
  }
  
  // Calculate neighbor mine counts
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!grid[y][x].isMine) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < size && ny >= 0 && ny < size && grid[ny][nx].isMine) {
              count++;
            }
          }
        }
        grid[y][x].neighborMines = count;
      }
    }
  }
  
  return grid;
};

export default function MinesweeperGame() {
  const [gameState, setGameState] = useState<GameState>({
    grid: [],
    gameStarted: false,
    gameWon: false,
    gameOver: false,
    score: 0,
    level: 1,
    mineCount: 10,
    flagCount: 0,
    revealedCount: 0,
    gridSize: 9
  });

  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [firstClick, setFirstClick] = useState(true);

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  const initializeGame = useCallback(() => {
    const size = Math.min(9 + gameState.level, 16);
    const mineCount = Math.min(10 + gameState.level * 3, Math.floor(size * size * 0.2));
    
    // Create empty grid initially
    const emptyGrid: Cell[][] = Array(size).fill(null).map((_, y) =>
      Array(size).fill(null).map((_, x) => ({
        x,
        y,
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        neighborMines: 0
      }))
    );
    
    setGameState(prev => ({
      ...prev,
      grid: emptyGrid,
      gameStarted: true,
      gameWon: false,
      gameOver: false,
      mineCount,
      flagCount: 0,
      revealedCount: 0,
      gridSize: size
    }));
    
    setFirstClick(true);
  }, [gameState.level]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const revealCell = (x: number, y: number) => {
    if (
      !gameState.gameStarted ||
      gameState.gameOver ||
      gameState.gameWon ||
      gameState.grid[y][x].isRevealed ||
      gameState.grid[y][x].isFlagged
    ) {
      return;
    }
    
    let newGrid = [...gameState.grid.map(row => [...row])];
    
    // Generate mines on first click
    if (firstClick) {
      newGrid = generateMineField(gameState.gridSize, gameState.mineCount, x, y);
      setFirstClick(false);
    }
    
    // Check if clicked on mine
    if (newGrid[y][x].isMine) {
      // Game over
      newGrid.forEach(row => {
        row.forEach(cell => {
          if (cell.isMine) {
            cell.isRevealed = true;
          }
        });
      });
      
      setGameState(prev => ({
        ...prev,
        grid: newGrid,
        gameOver: true
      }));
      
      toast.error('💥 Boom! You hit a mine!');
      return;
    }
    
    // Reveal cell and flood fill if empty
    const toReveal: { x: number; y: number }[] = [{ x, y }];
    let revealedCount = gameState.revealedCount;
    
    while (toReveal.length > 0) {
      const current = toReveal.pop()!;
      const cell = newGrid[current.y][current.x];
      
      if (cell.isRevealed || cell.isFlagged || cell.isMine) continue;
      
      cell.isRevealed = true;
      revealedCount++;
      
      // If cell has no neighboring mines, reveal all neighbors
      if (cell.neighborMines === 0) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = current.x + dx;
            const ny = current.y + dy;
            
            if (
              nx >= 0 && nx < gameState.gridSize &&
              ny >= 0 && ny < gameState.gridSize &&
              !newGrid[ny][nx].isRevealed
            ) {
              toReveal.push({ x: nx, y: ny });
            }
          }
        }
      }
    }
    
    setGameState(prev => ({
      ...prev,
      grid: newGrid,
      revealedCount
    }));
    
    // Check win condition
    const totalCells = gameState.gridSize * gameState.gridSize;
    if (revealedCount === totalCells - gameState.mineCount) {
      const timeBonus = 0; // Removed timer, so no time bonus
      const levelBonus = gameState.level * 10;
      const newScore = gameState.score + 25 + timeBonus + levelBonus;
      
      setGameState(prev => ({
        ...prev,
        gameWon: true,
        score: newScore,
        level: prev.level + 1
      }));
      
      toast.success(`🎉 Minefield cleared! +${1000 + timeBonus + levelBonus} points`);
    }
  };

  const toggleFlag = (x: number, y: number, e: React.MouseEvent) => {
    e.preventDefault();
    
    if (
      !gameState.gameStarted ||
      gameState.gameOver ||
      gameState.gameWon ||
      gameState.grid[y][x].isRevealed
    ) {
      return;
    }
    
    const newGrid = [...gameState.grid.map(row => [...row])];
    const cell = newGrid[y][x];
    
    cell.isFlagged = !cell.isFlagged;
    
    setGameState(prev => ({
      ...prev,
      grid: newGrid,
      flagCount: prev.flagCount + (cell.isFlagged ? 1 : -1)
    }));
  };

  const resetGame = () => {
    initializeGame();
  };

  const getCellContent = (cell: Cell) => {
    if (cell.isFlagged) return <Flag className="w-4 h-4 text-red-400" />;
    if (!cell.isRevealed) return '';
    if (cell.isMine) return <Bomb className="w-4 h-4 text-red-500" />;
    if (cell.neighborMines === 0) return '';
    return cell.neighborMines;
  };

  const getCellColor = (cell: Cell) => {
    if (cell.isFlagged) return 'bg-yellow-600';
    if (!cell.isRevealed) return 'bg-gray-600 hover:bg-gray-500';
    if (cell.isMine) return 'bg-red-600';
    if (cell.neighborMines === 0) return 'bg-gray-300';
    
    // Color based on number of neighboring mines
    const colors = [
      'bg-gray-300', // 0
      'bg-blue-400', // 1
      'bg-green-400', // 2
      'bg-yellow-400', // 3
      'bg-orange-400', // 4
      'bg-red-400', // 5
      'bg-purple-400', // 6
      'bg-pink-400', // 7
      'bg-gray-800' // 8
    ];
    
    return colors[cell.neighborMines] || 'bg-gray-300';
  };

  const getTextColor = (cell: Cell) => {
    if (!cell.isRevealed || cell.neighborMines === 0) return 'text-white';
    
    const colors = [
      'text-white', // 0
      'text-blue-800', // 1
      'text-green-800', // 2
      'text-yellow-800', // 3
      'text-orange-800', // 4
      'text-red-800', // 5
      'text-purple-800', // 6
      'text-pink-800', // 7
      'text-white' // 8
    ];
    
    return colors[cell.neighborMines] || 'text-white';
  };

  return (
    <GameLayout
      title="Classic Minesweeper"
      description="Traditional minesweeper with graph theory insights!"
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
                <div className="text-2xl font-bold text-red-400 flex items-center gap-2">
                  <Bomb className="w-5 h-5" />
                  Mines
                </div>
                <div className="text-sm text-red-200">{gameState.mineCount}</div>
              </motion.div>
              <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
                  <Flag className="w-5 h-5" />
                  Flags
                </div>
                <div className="text-sm text-yellow-200">{gameState.flagCount}</div>
              </motion.div>
              <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-green-400 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Revealed
                </div>
                <div className="text-sm text-green-200">
                  {gameState.revealedCount}/{gameState.gridSize * gameState.gridSize - gameState.mineCount}
                </div>
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

        {/* Minesweeper Grid */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-2xl">
            <div 
              className="grid gap-1 border-2 border-gray-400"
              style={{ 
                gridTemplateColumns: `repeat(${gameState.gridSize}, 1fr)`,
                width: `${gameState.gridSize * 32}px`,
                height: `${gameState.gridSize * 32}px`
              }}
            >
              {gameState.grid.map((row, y) =>
                row.map((cell, x) => (
                  <motion.button
                    key={`${x}-${y}`}
                    className={`
                      w-8 h-8 border border-gray-500 flex items-center justify-center text-sm font-bold
                      ${getCellColor(cell)} ${getTextColor(cell)}
                      transition-all duration-200
                    `}
                    onClick={() => revealCell(x, y)}
                    onContextMenu={(e) => toggleFlag(x, y, e)}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: (y * gameState.gridSize + x) * 0.01 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {getCellContent(cell)}
                  </motion.button>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* Controls Info */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-8"
        >
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-2">Controls</h3>
            <div className="flex justify-center gap-8 text-sm text-gray-300">
              <div>Left Click: Reveal cell</div>
              <div>Right Click: Flag/Unflag mine</div>
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
              <div>• Left click to reveal cells</div>
              <div>• Right click to flag suspected mines</div>
              <div>• Numbers show adjacent mine count</div>
              <div>• Reveal all safe cells to win</div>
              <div>• Don't click on mines!</div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Graph Theory</h3>
            <div className="space-y-2 text-purple-200">
              <div>• Grid represents an adjacency graph</div>
              <div>• Each cell is connected to 8 neighbors</div>
              <div>• Numbers indicate local graph density</div>
              <div>• Constraint satisfaction problem</div>
              <div>• Logical deduction and probability</div>
            </div>
          </div>
        </motion.div>
      </div>
    </GameLayout>
  );
}
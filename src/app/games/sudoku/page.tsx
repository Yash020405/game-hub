'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Grid3X3, Trophy, Zap, CheckCircle, Lightbulb, Eraser } from 'lucide-react';
import GameLayout from '@/components/GameLayout';
import toast from 'react-hot-toast';
import Confetti from 'react-confetti';

interface Cell {
  value: number;
  isFixed: boolean;
  isValid: boolean;
  row: number;
  col: number;
}

interface GameState {
  grid: Cell[][];
  selectedCell: { row: number; col: number } | null;
  score: number;
  level: number;
  gameStarted: boolean;
  gameWon: boolean;
  mistakes: number;
  maxMistakes: number;
  hintsUsed: number;
  maxHints: number;
}

const generateSudoku = (level: number): Cell[][] => {
  // Create empty 9x9 grid
  const grid: Cell[][] = Array(9).fill(null).map((_, row) => 
    Array(9).fill(null).map((_, col) => ({
      value: 0,
      isFixed: false,
      isValid: true,
      row,
      col
    }))
  );
  
  // Fill grid with valid solution
  fillGrid(grid);
  
  // Remove cells based on difficulty
  const cellsToRemove = Math.min(40 + level * 5, 65);
  removeCells(grid, cellsToRemove);
  
  return grid;
};

const fillGrid = (grid: Cell[][]): boolean => {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col].value === 0) {
        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
        
        for (const num of numbers) {
          if (isValidMove(grid, row, col, num)) {
            grid[row][col].value = num;
            
            if (fillGrid(grid)) {
              return true;
            }
            
            grid[row][col].value = 0;
          }
        }
        
        return false;
      }
    }
  }
  
  return true;
};

const removeCells = (grid: Cell[][], count: number) => {
  const cells = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      cells.push({ row, col });
    }
  }
  
  // Shuffle cells
  cells.sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < count && i < cells.length; i++) {
    const { row, col } = cells[i];
    grid[row][col].value = 0;
    grid[row][col].isFixed = false;
  }
  
  // Mark remaining cells as fixed
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col].value !== 0) {
        grid[row][col].isFixed = true;
      }
    }
  }
};

const isValidMove = (grid: Cell[][], row: number, col: number, num: number): boolean => {
  // Check row
  for (let c = 0; c < 9; c++) {
    if (c !== col && grid[row][c].value === num) {
      return false;
    }
  }
  
  // Check column
  for (let r = 0; r < 9; r++) {
    if (r !== row && grid[r][col].value === num) {
      return false;
    }
  }
  
  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if ((r !== row || c !== col) && grid[r][c].value === num) {
        return false;
      }
    }
  }
  
  return true;
};

const validateGrid = (grid: Cell[][]): boolean => {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = grid[row][col];
      if (cell.value === 0) return false;
      
      cell.isValid = isValidMove(grid, row, col, cell.value);
      if (!cell.isValid) return false;
    }
  }
  
  return true;
};

export default function SudokuGame() {
  const [gameState, setGameState] = useState<GameState>({
    grid: [],
    selectedCell: null,
    score: 0,
    level: 1,
    gameStarted: false,
    gameWon: false,
    mistakes: 0,
    maxMistakes: 3,
    hintsUsed: 0,
    maxHints: 3
  });

  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  const initializeGame = useCallback(() => {
    const newGrid = generateSudoku(gameState.level);
    
    setGameState(prev => ({
      ...prev,
      grid: newGrid,
      selectedCell: null,
      gameStarted: true,
      gameWon: false,
      mistakes: 0,
      hintsUsed: 0
    }));
  }, [gameState.level]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const selectCell = (row: number, col: number) => {
    if (gameState.grid[row][col].isFixed) return;
    
    setGameState(prev => ({
      ...prev,
      selectedCell: { row, col }
    }));
  };

  const inputNumber = (num: number) => {
    if (!gameState.selectedCell || gameState.gameWon) return;
    
    const { row, col } = gameState.selectedCell;
    const cell = gameState.grid[row][col];
    
    if (cell.isFixed) return;
    
    const newGrid = gameState.grid.map(r => r.map(c => ({ ...c })));
    newGrid[row][col].value = num;
    
    // Check if move is valid
    const isValid = isValidMove(newGrid, row, col, num);
    newGrid[row][col].isValid = isValid;
    
    let newMistakes = gameState.mistakes;
    if (!isValid) {
      newMistakes++;
      toast.error('Invalid move!');
      
      if (newMistakes >= gameState.maxMistakes) {
        toast.error('Too many mistakes! Game Over');
        setGameState(prev => ({ ...prev, gameStarted: false }));
        return;
      }
    }
    
    setGameState(prev => ({
      ...prev,
      grid: newGrid,
      mistakes: newMistakes
    }));
    
    // Check if puzzle is solved
    if (validateGrid(newGrid)) {
      const timeBonus = Math.max(0, 1800 * 2);
      const mistakeBonus = Math.max(0, (gameState.maxMistakes - gameState.mistakes) * 10);
      const hintBonus = Math.max(0, (gameState.maxHints - gameState.hintsUsed) * 300);
      const newScore = gameState.score + 50 + timeBonus + mistakeBonus + hintBonus;
      
      setGameState(prev => ({
        ...prev,
        gameWon: true,
        score: newScore,
        level: prev.level + 1
      }));
      
      toast.success(`🎉 Sudoku solved! +${2000 + timeBonus + mistakeBonus + hintBonus} points`);
    }
  };

  const clearCell = () => {
    if (!gameState.selectedCell || gameState.gameWon) return;
    
    const { row, col } = gameState.selectedCell;
    const cell = gameState.grid[row][col];
    
    if (cell.isFixed) return;
    
    const newGrid = gameState.grid.map(r => r.map(c => ({ ...c })));
    newGrid[row][col].value = 0;
    newGrid[row][col].isValid = true;
    
    setGameState(prev => ({
      ...prev,
      grid: newGrid
    }));
  };

  const useHint = () => {
    if (gameState.hintsUsed >= gameState.maxHints || !gameState.selectedCell) {
      toast.error('No hints remaining or no cell selected!');
      return;
    }
    
    const { row, col } = gameState.selectedCell;
    const cell = gameState.grid[row][col];
    
    if (cell.isFixed || cell.value !== 0) {
      toast.error('Select an empty cell for hint!');
      return;
    }
    
    // Find correct number for this cell
    for (let num = 1; num <= 9; num++) {
      if (isValidMove(gameState.grid, row, col, num)) {
        const newGrid = gameState.grid.map(r => r.map(c => ({ ...c })));
        newGrid[row][col].value = num;
        newGrid[row][col].isValid = true;
        
        setGameState(prev => ({
          ...prev,
          grid: newGrid,
          hintsUsed: prev.hintsUsed + 1
        }));
        
        toast.success(`Hint used! Number ${num} placed.`);
        break;
      }
    }
  };

  const resetGame = () => {
    initializeGame();
  };

  const getCellColor = (cell: Cell) => {
    if (cell.isFixed) return 'bg-gray-600 text-white';
    if (!cell.isValid) return 'bg-red-500 text-white';
    if (cell.value === 0) return 'bg-gray-800 text-white';
    return 'bg-blue-600 text-white';
  };

  const isSelected = (row: number, col: number) => {
    return gameState.selectedCell?.row === row && gameState.selectedCell?.col === col;
  };

  const isHighlighted = (row: number, col: number) => {
    if (!gameState.selectedCell) return false;
    
    const { row: selRow, col: selCol } = gameState.selectedCell;
    
    // Highlight same row, column, or 3x3 box
    return (
      row === selRow ||
      col === selCol ||
      (Math.floor(row / 3) === Math.floor(selRow / 3) && Math.floor(col / 3) === Math.floor(selCol / 3))
    );
  };

  return (
    <GameLayout
      title="Graph Sudoku"
      description="Sudoku with graph coloring mechanics!"
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
                  <Zap className="w-5 h-5" />
                  Mistakes
                </div>
                <div className="text-sm text-red-200">{gameState.mistakes}/{gameState.maxMistakes}</div>
              </motion.div>
              <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Hints
                </div>
                <div className="text-sm text-yellow-200">{gameState.hintsUsed}/{gameState.maxHints}</div>
              </motion.div>
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
                onClick={clearCell}
                className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-200"
              >
                <Eraser className="w-4 h-4 inline mr-2" />
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

        {/* Sudoku Grid */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-2xl">
            <div className="grid grid-cols-9 gap-1 w-[450px] h-[450px] border-2 border-white">
              {gameState.grid.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <motion.button
                    key={`${rowIndex}-${colIndex}`}
                    className={`
                      w-12 h-12 border border-gray-400 flex items-center justify-center font-bold text-lg
                      ${getCellColor(cell)}
                      ${isSelected(rowIndex, colIndex) ? 'ring-2 ring-yellow-400' : ''}
                      ${isHighlighted(rowIndex, colIndex) ? 'bg-opacity-70' : ''}
                      ${colIndex % 3 === 2 && colIndex !== 8 ? 'border-r-2 border-r-white' : ''}
                      ${rowIndex % 3 === 2 && rowIndex !== 8 ? 'border-b-2 border-b-white' : ''}
                      hover:bg-opacity-80 transition-all duration-200
                    `}
                    onClick={() => selectCell(rowIndex, colIndex)}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: (rowIndex * 9 + colIndex) * 0.01 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {cell.value !== 0 ? cell.value : ''}
                  </motion.button>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* Number Input */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-8"
        >
          <div className="flex gap-2 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <motion.button
                key={num}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => inputNumber(num)}
                className="w-12 h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all duration-200"
              >
                {num}
              </motion.button>
            ))}
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
              <div>• Click on empty cells to select them</div>
              <div>• Use number buttons or keyboard to input</div>
              <div>• Each row, column, and 3×3 box must contain 1-9</div>
              <div>• No repeated numbers in same constraint</div>
              <div>• Use hints wisely - limited supply!</div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Graph Theory Connection</h3>
            <div className="space-y-2 text-purple-200">
              <div>• Sudoku is a graph coloring problem</div>
              <div>• Each cell is a vertex</div>
              <div>• Constraints create edges between cells</div>
              <div>• 9 colors (numbers) must be assigned</div>
              <div>• No adjacent vertices can share colors</div>
            </div>
          </div>
        </motion.div>
      </div>
    </GameLayout>
  );
}
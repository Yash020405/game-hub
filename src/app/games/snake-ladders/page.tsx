'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Crown, Trophy, Zap, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from 'lucide-react';
import GameLayout from '@/components/GameLayout';
import toast from 'react-hot-toast';
import Confetti from 'react-confetti';

interface Player {
  id: number;
  position: number;
  color: string;
  name: string;
}

interface Snake {
  head: number;
  tail: number;
}

interface Ladder {
  bottom: number;
  top: number;
}

interface GameState {
  players: Player[];
  currentPlayer: number;
  diceValue: number;
  isRolling: boolean;
  gameStarted: boolean;
  gameWon: boolean;
  winner: Player | null;
  score: number;
  level: number;
  snakes: Snake[];
  ladders: Ladder[];
  boardSize: number;
  canRoll: boolean;
  showGraphView: boolean;
  moveHistory: number[];
  probabilityAnalysis: boolean;
  expectedMoves: number;
  gameMode: 'classic' | 'analysis' | 'probability';
}

const DICE_ICONS = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

const generateSnakesAndLadders = (boardSize: number, level: number): { snakes: Snake[], ladders: Ladder[] } => {
  const snakes: Snake[] = [];
  const ladders: Ladder[] = [];
  const numSnakes = Math.min(3 + level, 8);
  const numLadders = Math.min(3 + level, 8);
  
  // Generate snakes
  for (let i = 0; i < numSnakes; i++) {
    const head = Math.floor(Math.random() * (boardSize - 20)) + 20;
    const tail = Math.floor(Math.random() * (head - 10)) + 1;
    snakes.push({ head, tail });
  }
  
  // Generate ladders
  for (let i = 0; i < numLadders; i++) {
    const bottom = Math.floor(Math.random() * (boardSize - 20)) + 1;
    const top = Math.min(bottom + Math.floor(Math.random() * 20) + 10, boardSize - 1);
    ladders.push({ bottom, top });
  }
  
  return { snakes, ladders };
};

const BOARD_GRAPH_ANALYSIS = {
  calculateExpectedMoves: (snakes: Snake[], ladders: Ladder[], boardSize: number): number => {
    // Simplified calculation of expected moves to win
    // Based on Markov chain analysis
    const transitionMatrix = buildTransitionMatrix(snakes, ladders, boardSize);
    return calculateExpectedTime(transitionMatrix, boardSize);
  },
  
  findCriticalPositions: (snakes: Snake[], ladders: Ladder[]): number[] => {
    // Find positions that significantly affect game length
    const critical: number[] = [];
    snakes.forEach(snake => critical.push(snake.head));
    ladders.forEach(ladder => critical.push(ladder.bottom));
    return critical;
  },
  
  analyzeProbabilityDistribution: (position: number, snakes: Snake[], ladders: Ladder[]): any => {
    // Calculate probability of landing on each position from current position
    const probabilities: { [key: number]: number } = {};
    
    for (let dice = 1; dice <= 6; dice++) {
      let nextPos = position + dice;
      
      // Check for snakes and ladders
      const snake = snakes.find(s => s.head === nextPos);
      const ladder = ladders.find(l => l.bottom === nextPos);
      
      if (snake) nextPos = snake.tail;
      if (ladder) nextPos = ladder.top;
      
      probabilities[nextPos] = (probabilities[nextPos] || 0) + 1/6;
    }
    
    return probabilities;
  }
};

const buildTransitionMatrix = (snakes: Snake[], ladders: Ladder[], boardSize: number): number[][] => {
  const matrix: number[][] = Array(boardSize + 1).fill(null).map(() => Array(boardSize + 1).fill(0));
  
  for (let i = 0; i < boardSize; i++) {
    for (let dice = 1; dice <= 6; dice++) {
      let nextPos = i + dice;
      
      if (nextPos >= boardSize) {
        matrix[i][boardSize] += 1/6; // Win state
        continue;
      }
      
      // Check for snakes and ladders
      const snake = snakes.find(s => s.head === nextPos);
      const ladder = ladders.find(l => l.bottom === nextPos);
      
      if (snake) nextPos = snake.tail;
      if (ladder) nextPos = ladder.top;
      
      matrix[i][nextPos] += 1/6;
    }
  }
  
  return matrix;
};

const calculateExpectedTime = (transitionMatrix: number[][], boardSize: number): number => {
  // Simplified expected time calculation
  // This is a basic approximation - full calculation would require matrix operations
  return Math.floor(boardSize / 3.5); // Average dice roll approximation
};

export default function SnakeLaddersGame() {
  const [gameState, setGameState] = useState<GameState>({
    players: [
      { id: 1, position: 0, color: '#3b82f6', name: 'Player 1' },
      { id: 2, position: 0, color: '#ef4444', name: 'Player 2' }
    ],
    currentPlayer: 0,
    diceValue: 1,
    isRolling: false,
    gameStarted: false,
    gameWon: false,
    winner: null,
    score: 0,
    level: 1,
    snakes: [],
    ladders: [],
    boardSize: 100,
    canRoll: true,
    showGraphView: false,
    moveHistory: [],
    probabilityAnalysis: false,
    expectedMoves: 0,
    gameMode: 'classic'
  });

  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  const initializeGame = useCallback(() => {
    const boardSize = 100;
    const { snakes, ladders } = generateSnakesAndLadders(boardSize, gameState.level);
    const expectedMoves = BOARD_GRAPH_ANALYSIS.calculateExpectedMoves(snakes, ladders, boardSize);
    
    setGameState(prev => ({
      ...prev,
      players: prev.players.map(player => ({ ...player, position: 0 })),
      currentPlayer: 0,
      diceValue: 1,
      isRolling: false,
      gameStarted: true,
      gameWon: false,
      winner: null,
      snakes,
      ladders,
      boardSize,
      canRoll: true,
      moveHistory: [],
      expectedMoves
    }));
  }, [gameState.level]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const rollDice = () => {
    if (gameState.isRolling || gameState.gameWon || !gameState.canRoll) return;
    
    setGameState(prev => ({ ...prev, isRolling: true, canRoll: false }));
    
    // Animate dice roll
    let rollCount = 0;
    const rollInterval = setInterval(() => {
      setGameState(prev => ({ ...prev, diceValue: Math.floor(Math.random() * 6) + 1 }));
      rollCount++;
      
      if (rollCount >= 10) {
        clearInterval(rollInterval);
        const finalValue = Math.floor(Math.random() * 6) + 1;
        
        setGameState(prev => ({
          ...prev,
          diceValue: finalValue,
          isRolling: false
        }));
        
        // Move player after dice animation
        setTimeout(() => movePlayer(finalValue), 500);
      }
    }, 100);
  };

  const movePlayer = (steps: number) => {
    const currentPlayerData = gameState.players[gameState.currentPlayer];
    let newPosition = currentPlayerData.position + steps;
    
    // Check if player reaches or exceeds the end
    if (newPosition >= gameState.boardSize) {
      newPosition = gameState.boardSize;
      
      // Player wins
      setGameState(prev => ({
        ...prev,
        players: prev.players.map(player => 
          player.id === currentPlayerData.id 
            ? { ...player, position: newPosition }
            : player
        ),
        gameWon: true,
        winner: currentPlayerData,
        score: prev.score + 25 + (prev.level * 10)
      }));
      
      toast.success(`🎉 ${currentPlayerData.name} wins! +${1000 + (gameState.level * 10)} points`);
      return;
    }
    
    // Check for snakes and ladders
    const snake = gameState.snakes.find(s => s.head === newPosition);
    const ladder = gameState.ladders.find(l => l.bottom === newPosition);
    
    if (snake) {
      newPosition = snake.tail;
      toast.error(`🐍 Snake bite! Slide down to ${snake.tail}`);
    } else if (ladder) {
      newPosition = ladder.top;
      toast.success(`🪜 Ladder climb! Move up to ${ladder.top}`);
    }
    
    // Update player position and switch turns
    setGameState(prev => ({
      ...prev,
      players: prev.players.map(player => 
        player.id === currentPlayerData.id 
          ? { ...player, position: newPosition }
          : player
      ),
      currentPlayer: (prev.currentPlayer + 1) % prev.players.length,
      canRoll: true
    }));
  };

  const resetGame = () => {
    initializeGame();
  };

  const getPositionCoordinates = (position: number) => {
    if (position === 0) return { x: 0, y: 9 }; // Start position
    
    const row = Math.floor((position - 1) / 10);
    const col = (position - 1) % 10;
    
    // Snake pattern - alternate row directions
    const x = row % 2 === 0 ? col : 9 - col;
    const y = 9 - row;
    
    return { x, y };
  };

  const DiceIcon = DICE_ICONS[gameState.diceValue - 1];

  return (
    <GameLayout
      title="Snake & Ladders"
      description="Classic board game with graph-based movement!"
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
                  <Crown className="w-5 h-5" />
                  Current Player
                </div>
                <div className="text-sm" style={{ color: gameState.players[gameState.currentPlayer].color }}>
                  {gameState.players[gameState.currentPlayer].name}
                </div>
              </motion.div>
              
              <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-green-400 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Snakes
                </div>
                <div className="text-sm text-green-200">{gameState.snakes.length}</div>
              </motion.div>
              
              <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-purple-400 flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Ladders
                </div>
                <div className="text-sm text-purple-200">{gameState.ladders.length}</div>
              </motion.div>
            </div>
            
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={rollDice}
                disabled={gameState.isRolling || gameState.gameWon || !gameState.canRoll}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <DiceIcon className="w-5 h-5 inline mr-2" />
                {gameState.isRolling ? 'Rolling...' : 'Roll Dice'}
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

        {/* Dice Display */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-8"
        >
          <motion.div 
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20"
            animate={{ 
              rotate: gameState.isRolling ? [0, 360] : 0,
              scale: gameState.isRolling ? [1, 1.2, 1] : 1
            }}
            transition={{ 
              rotate: { duration: 0.5, repeat: gameState.isRolling ? Infinity : 0 },
              scale: { duration: 0.3 }
            }}
          >
            <DiceIcon className="w-16 h-16 text-white" />
          </motion.div>
        </motion.div>

        {/* Game Board */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-lg rounded-3xl p-8 border-2 border-white/20 shadow-2xl">
            <div className="relative">
              {/* Enhanced board with better graphics */}
              <div className="grid grid-cols-10 gap-2 w-[600px] h-[600px] p-4 bg-gradient-to-br from-amber-50/10 to-orange-100/10 rounded-2xl border border-amber-200/20">
                {Array.from({ length: 100 }, (_, i) => {
                  const position = 100 - i;
                  const { x, y } = getPositionCoordinates(position);
                  const isSnakeHead = gameState.snakes.some(s => s.head === position);
                  const isSnakeTail = gameState.snakes.some(s => s.tail === position);
                  const isLadderBottom = gameState.ladders.some(l => l.bottom === position);
                  const isLadderTop = gameState.ladders.some(l => l.top === position);
                  const playersOnSquare = gameState.players.filter(p => p.position === position);
                  
                  let cellBg = 'from-slate-700/50 to-slate-600/50';
                  let borderColor = 'border-slate-500/30';
                  let textColor = 'text-white';
                  
                  if (isSnakeHead) {
                    cellBg = 'from-red-600/80 to-red-700/80';
                    borderColor = 'border-red-400/50';
                  } else if (isSnakeTail) {
                    cellBg = 'from-red-400/60 to-red-500/60';
                    borderColor = 'border-red-300/40';
                  } else if (isLadderBottom) {
                    cellBg = 'from-green-600/80 to-green-700/80';
                    borderColor = 'border-green-400/50';
                  } else if (isLadderTop) {
                    cellBg = 'from-green-400/60 to-green-500/60';
                    borderColor = 'border-green-300/40';
                  } else if (position === 100) {
                    cellBg = 'from-yellow-500/80 to-yellow-600/80';
                    borderColor = 'border-yellow-400/50';
                    textColor = 'text-black font-black';
                  } else if (position === 1) {
                    cellBg = 'from-blue-500/80 to-blue-600/80';
                    borderColor = 'border-blue-400/50';
                  }
                  
                  return (
                    <motion.div
                      key={position}
                      className={`
                        relative w-[52px] h-[52px] bg-gradient-to-br ${cellBg} border-2 ${borderColor}
                        flex items-center justify-center text-sm font-bold rounded-xl
                        shadow-lg backdrop-blur-sm transition-all duration-200
                        hover:scale-105 hover:shadow-xl
                      `}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.003, type: "spring", stiffness: 300 }}
                    >
                      <span className={textColor}>{position}</span>
                      
                      {/* Enhanced Players on this square */}
                      {playersOnSquare.map((player, index) => (
                        <motion.div
                          key={player.id}
                          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg"
                          style={{ 
                            backgroundColor: player.color,
                            top: `${4 + index * 10}px`,
                            right: `${4 + index * 10}px`,
                            boxShadow: `0 0 8px ${player.color}50`
                          }}
                          initial={{ scale: 0 }}
                          animate={{ 
                            scale: 1,
                            y: [0, -2, 0],
                          }}
                          transition={{ 
                            scale: { type: "spring", stiffness: 500 },
                            y: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                          }}
                        />
                      ))}
                      
                      {/* Enhanced Snake/Ladder indicators */}
                      {isSnakeHead && (
                        <motion.span 
                          className="absolute -top-1 -right-1 text-lg"
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          🐍
                        </motion.span>
                      )}
                      {isLadderBottom && (
                        <motion.span 
                          className="absolute -top-1 -right-1 text-lg"
                          animate={{ y: [0, -2, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          🪜
                        </motion.span>
                      )}
                      {position === 100 && (
                        <motion.span 
                          className="absolute -top-2 -right-2 text-xl"
                          animate={{ 
                            scale: [1, 1.2, 1],
                            rotate: [0, 15, -15, 0]
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          👑
                        </motion.span>
                      )}
                      {position === 1 && (
                        <motion.span 
                          className="absolute -bottom-1 -left-1 text-sm"
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          🎯
                        </motion.span>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Visual snake and ladder connections */}
              <svg 
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ zIndex: 1 }}
              >
                {/* Draw snakes */}
                {gameState.snakes.map((snake, index) => {
                  const headPos = getPositionCoordinates(snake.head);
                  const tailPos = getPositionCoordinates(snake.tail);
                  const startX = (headPos.x * 56) + 44; // Adjusted for new sizing
                  const startY = (headPos.y * 56) + 44;
                  const endX = (tailPos.x * 56) + 44;
                  const endY = (tailPos.y * 56) + 44;
                  
                  return (
                    <motion.path
                      key={`snake-${index}`}
                      d={`M ${startX} ${startY} Q ${(startX + endX) / 2} ${Math.min(startY, endY) - 30} ${endX} ${endY}`}
                      stroke="#dc2626"
                      strokeWidth="4"
                      fill="none"
                      strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 0 6px #dc262680)' }}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 1 + index * 0.2, duration: 0.8 }}
                    />
                  );
                })}
                
                {/* Draw ladders */}
                {gameState.ladders.map((ladder, index) => {
                  const bottomPos = getPositionCoordinates(ladder.bottom);
                  const topPos = getPositionCoordinates(ladder.top);
                  const startX = (bottomPos.x * 56) + 44;
                  const startY = (bottomPos.y * 56) + 44;
                  const endX = (topPos.x * 56) + 44;
                  const endY = (topPos.y * 56) + 44;
                  
                  return (
                    <motion.g key={`ladder-${index}`}>
                      <motion.line
                        x1={startX - 8}
                        y1={startY}
                        x2={endX - 8}
                        y2={endY}
                        stroke="#16a34a"
                        strokeWidth="6"
                        strokeLinecap="round"
                        style={{ filter: 'drop-shadow(0 0 6px #16a34a80)' }}
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 1.5 + index * 0.2, duration: 0.8 }}
                      />
                      <motion.line
                        x1={startX + 8}
                        y1={startY}
                        x2={endX + 8}
                        y2={endY}
                        stroke="#16a34a"
                        strokeWidth="6"
                        strokeLinecap="round"
                        style={{ filter: 'drop-shadow(0 0 6px #16a34a80)' }}
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 1.5 + index * 0.2, duration: 0.8 }}
                      />
                      {/* Ladder rungs */}
                      {Array.from({ length: 3 }, (_, rungIndex) => {
                        const rungY = startY - ((startY - endY) * (rungIndex + 1) / 4);
                        return (
                          <motion.line
                            key={rungIndex}
                            x1={startX - 8}
                            y1={rungY}
                            x2={startX + 8}
                            y2={rungY}
                            stroke="#16a34a"
                            strokeWidth="4"
                            strokeLinecap="round"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 2 + index * 0.2 + rungIndex * 0.1 }}
                          />
                        );
                      })}
                    </motion.g>
                  );
                })}
              </svg>
            </div>
          </div>
        </motion.div>

        {/* Player Status */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
        >
          {gameState.players.map((player) => (
            <div
              key={player.id}
              className={`bg-white/5 backdrop-blur-sm rounded-xl p-6 border ${
                gameState.currentPlayer === player.id - 1 ? 'border-yellow-400' : 'border-white/10'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-8 h-8 rounded-full border-2 border-white"
                  style={{ backgroundColor: player.color }}
                />
                <div>
                  <h3 className="text-lg font-bold text-white">{player.name}</h3>
                  <p className="text-gray-300">Position: {player.position}</p>
                </div>
              </div>
            </div>
          ))}
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
              <div>• Click "Roll Dice" to move your piece</div>
              <div>• Reach square 100 to win the game</div>
              <div>• 🐍 Snakes slide you down</div>
              <div>• 🪜 Ladders boost you up</div>
              <div>• Take turns with other players</div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Graph Theory</h3>
            <div className="space-y-2 text-purple-200">
              <div>• Board represents a directed graph</div>
              <div>• Each square is a vertex</div>
              <div>• Snakes and ladders are special edges</div>
              <div>• Path finding with random movement</div>
              <div>• Probability and game theory concepts</div>
            </div>
          </div>
        </motion.div>

        {/* Winner Modal */}
        <AnimatePresence>
          {gameState.gameWon && gameState.winner && (
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
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: gameState.winner.color }}
                  >
                    <Crown className="w-8 h-8 text-white" />
                  </motion.div>
                  
                  <h2 className="text-2xl font-bold text-white mb-2">Game Over!</h2>
                  <p className="text-blue-200 mb-6">{gameState.winner.name} wins!</p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between">
                      <span className="text-blue-200">Final Score:</span>
                      <span className="text-white font-bold">{gameState.score.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-200">Level:</span>
                      <span className="text-white font-bold">{gameState.level}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setGameState(prev => ({ 
                          ...prev, 
                          gameWon: false, 
                          level: prev.level + 1 
                        }));
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
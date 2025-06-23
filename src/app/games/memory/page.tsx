'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Brain, Trophy, Zap, CheckCircle, Timer } from 'lucide-react';
import GameLayout from '@/components/GameLayout';
import toast from 'react-hot-toast';
import Confetti from 'react-confetti';

interface Card {
  id: number;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
  color: string;
}

interface GameState {
  cards: Card[];
  flippedCards: number[];
  matchedPairs: number;
  totalPairs: number;
  score: number;
  level: number;
  gameStarted: boolean;
  gameWon: boolean;
  moves: number;
  streak: number;
}

const GRAPH_SYMBOLS = ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠', '⚫', '⚪', '🔺', '🔻', '🔶', '🔷'];
const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

const generateCards = (level: number): Card[] => {
  const pairCount = Math.min(6 + level * 2, 18);
  const symbols = GRAPH_SYMBOLS.slice(0, pairCount);
  const cards: Card[] = [];
  
  // Create pairs
  symbols.forEach((symbol, index) => {
    const color = COLORS[index % COLORS.length];
    
    // Add two cards for each symbol
    cards.push({
      id: index * 2,
      value: symbol,
      isFlipped: false,
      isMatched: false,
      color
    });
    
    cards.push({
      id: index * 2 + 1,
      value: symbol,
      isFlipped: false,
      isMatched: false,
      color
    });
  });
  
  // Shuffle cards
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  
  // Update IDs to match new positions
  cards.forEach((card, index) => {
    card.id = index;
  });
  
  return cards;
};

export default function MemoryGame() {
  const [gameState, setGameState] = useState<GameState>({
    cards: [],
    flippedCards: [],
    matchedPairs: 0,
    totalPairs: 0,
    score: 0,
    level: 1,
    gameStarted: false,
    gameWon: false,
    moves: 0,
    streak: 0
  });

  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  const initializeGame = useCallback(() => {
    const newCards = generateCards(gameState.level);
    const totalPairs = newCards.length / 2;
    
    setGameState(prev => ({
      ...prev,
      cards: newCards,
      flippedCards: [],
      matchedPairs: 0,
      totalPairs,
      gameStarted: true,
      gameWon: false,
      moves: 0,
      streak: 0
    }));
  }, [gameState.level]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const flipCard = (cardId: number) => {
    if (
      !gameState.gameStarted ||
      gameState.gameWon ||
      gameState.flippedCards.length >= 2 ||
      gameState.cards[cardId].isFlipped ||
      gameState.cards[cardId].isMatched
    ) {
      return;
    }
    
    const newCards = [...gameState.cards];
    const newFlippedCards = [...gameState.flippedCards, cardId];
    
    newCards[cardId].isFlipped = true;
    
    setGameState(prev => ({
      ...prev,
      cards: newCards,
      flippedCards: newFlippedCards
    }));
    
    // Check for match when two cards are flipped
    if (newFlippedCards.length === 2) {
      const [firstId, secondId] = newFlippedCards;
      const firstCard = newCards[firstId];
      const secondCard = newCards[secondId];
      
      setTimeout(() => {
        if (firstCard.value === secondCard.value) {
          // Match found
          const updatedCards = [...newCards];
          updatedCards[firstId].isMatched = true;
          updatedCards[secondId].isMatched = true;
          
          const newMatchedPairs = gameState.matchedPairs + 1;
          const newStreak = gameState.streak + 1;
          const streakBonus = newStreak * 50;
          
          setGameState(prev => ({
            ...prev,
            cards: updatedCards,
            flippedCards: [],
            matchedPairs: newMatchedPairs,
            moves: prev.moves + 1,
            streak: newStreak,
            score: prev.score + 100 + streakBonus
          }));
          
          toast.success(`Match! +${100 + streakBonus} points (Streak: ${newStreak})`);
          
          // Check if game is won
          if (newMatchedPairs === gameState.totalPairs) {
            const newScore = gameState.score + 100 + streakBonus;
            
            setGameState(prev => ({
              ...prev,
              gameWon: true,
              score: newScore,
              level: prev.level + 1
            }));
            
            toast.success(`🎉 All pairs found! +${streakBonus} bonus points`);
          }
        } else {
          // No match
          const updatedCards = [...newCards];
          updatedCards[firstId].isFlipped = false;
          updatedCards[secondId].isFlipped = false;
          
          setGameState(prev => ({
            ...prev,
            cards: updatedCards,
            flippedCards: [],
            moves: prev.moves + 1,
            streak: 0
          }));
          
          toast.error('No match! Streak reset.');
        }
      }, 1000);
    }
  };

  const resetGame = () => {
    initializeGame();
  };

  const getGridCols = () => {
    const cardCount = gameState.cards.length;
    if (cardCount <= 16) return 'grid-cols-4';
    if (cardCount <= 25) return 'grid-cols-5';
    return 'grid-cols-6';
  };

  return (
    <GameLayout
      title="Graph Memory"
      description="Memory card game with graph nodes and edges!"
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
                  <CheckCircle className="w-5 h-5" />
                  Pairs
                </div>
                <div className="text-sm text-green-200">{gameState.matchedPairs}/{gameState.totalPairs}</div>
              </motion.div>
              <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-blue-400 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Moves
                </div>
                <div className="text-sm text-blue-200">{gameState.moves}</div>
              </motion.div>
              <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-purple-400 flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Streak
                </div>
                <div className="text-sm text-purple-200">{gameState.streak}</div>
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

        {/* Memory Cards Grid */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-2xl">
            <div className={`grid ${getGridCols()} gap-3 max-w-2xl`}>
              {gameState.cards.map((card) => (
                <motion.div
                  key={card.id}
                  className="relative w-20 h-20 cursor-pointer"
                  onClick={() => flipCard(card.id)}
                  initial={{ scale: 0, rotateY: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: card.id * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="absolute inset-0 w-full h-full"
                    animate={{ rotateY: card.isFlipped || card.isMatched ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {/* Card Back */}
                    <div
                      className="absolute inset-0 w-full h-full rounded-xl border-2 border-gray-400 flex items-center justify-center text-2xl font-bold"
                      style={{
                        backfaceVisibility: 'hidden',
                        backgroundColor: '#374151'
                      }}
                    >
                      <Brain className="w-8 h-8 text-gray-300" />
                    </div>
                    
                    {/* Card Front */}
                    <div
                      className={`absolute inset-0 w-full h-full rounded-xl border-2 flex items-center justify-center text-3xl ${
                        card.isMatched ? 'border-green-400 bg-green-600' : 'border-gray-400'
                      }`}
                      style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        backgroundColor: card.isMatched ? '#10b981' : card.color
                      }}
                    >
                      {card.value}
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium">Progress</span>
            <span className="text-white font-bold">
              {gameState.matchedPairs}/{gameState.totalPairs} pairs
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <motion.div
              className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(gameState.matchedPairs / gameState.totalPairs) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
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
              <div>• Click cards to flip them over</div>
              <div>• Find matching pairs of symbols</div>
              <div>• Remember card positions</div>
              <div>• Build streaks for bonus points</div>
              <div>• Match all pairs to win!</div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Scoring System</h3>
            <div className="space-y-2 text-purple-200">
              <div>• <strong>Match:</strong> 100 points</div>
              <div>• <strong>Streak Bonus:</strong> 50 × streak length</div>
              <div>• Build memory and pattern recognition!</div>
            </div>
          </div>
        </motion.div>
      </div>
    </GameLayout>
  );
}
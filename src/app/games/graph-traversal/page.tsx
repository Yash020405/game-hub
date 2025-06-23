'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Target, Trophy, Zap, ArrowRight, CheckCircle, Lightbulb, Eye, SkipForward, Pause } from 'lucide-react';

// Reduced motion configuration to prevent shaking
const buttonHover = { scale: 1.02 };
const buttonTap = { scale: 0.98 };
import GameLayout from '@/components/GameLayout';
import { useGameProgress } from '@/lib/useGameProgress';
import { calculateLevelScore, updateProgressOnLevelComplete, createDefaultProgress } from '@/lib/gameUtils';
import toast from 'react-hot-toast';
import Confetti from 'react-confetti';

interface Node {
  id: number;
  x: number;
  y: number;
  connections: number[];
  visited: boolean;
  current: boolean;
  path: boolean;
  label: string;
}

interface GameState {
  nodes: Node[];
  userPath: number[];
  score: number;
  level: number;
  gameStarted: boolean;
  gameWon: boolean;
  startNode: number;
  endNode: number;
  isSelectingPath: boolean;
  showOptimal: boolean;
  showBFSDemo: boolean;
  showDFSDemo: boolean;
  algorithmSteps: Node[][];
  currentAlgorithmStep: number;
  isRunning: boolean;
  autoPlay: boolean;
  optimalPath: number[];
  gameMode: 'play' | 'bfs' | 'dfs';
}

const generateComplexGraph = (level: number): Node[] => {
  const nodeCount = Math.min(8 + level * 2, 15);
  const nodes: Node[] = [];
  
  // Create a grid-based layout to prevent overlapping
  const gridSize = Math.ceil(Math.sqrt(nodeCount));
  const spacing = 120;
  const offsetX = 50;
  const offsetY = 50;
  
  let nodeId = 0;
  for (let row = 0; row < gridSize && nodeId < nodeCount; row++) {
    for (let col = 0; col < gridSize && nodeId < nodeCount; col++) {
      // Add some randomness to make it look more natural
      const randomOffsetX = (Math.random() - 0.5) * 30;
      const randomOffsetY = (Math.random() - 0.5) * 30;
      
      const x = offsetX + col * spacing + randomOffsetX;
      const y = offsetY + row * spacing + randomOffsetY;
      
      nodes.push({
        id: nodeId,
        x,
        y,
        connections: [],
        visited: false,
        current: false,
        path: false,
        label: String.fromCharCode(65 + nodeId)
      });
      nodeId++;
    }
  }
  
  // Create strategic connections to make traversal challenging but not overwhelming
  for (let i = 0; i < nodes.length; i++) {
    const currentNode = nodes[i];
    const maxConnections = Math.min(4, Math.floor(Math.random() * 3) + 2);
    let connectionCount = 0;
    
    // Connect to nearby nodes
    for (let j = 0; j < nodes.length && connectionCount < maxConnections; j++) {
      if (i === j) continue;
      
      const targetNode = nodes[j];
      const distance = Math.sqrt(
        Math.pow(currentNode.x - targetNode.x, 2) + 
        Math.pow(currentNode.y - targetNode.y, 2)
      );
      
      // Connect to nodes within a reasonable distance
      if (distance < spacing * 1.8) {
        // Check if connection already exists
        const alreadyConnected = currentNode.connections.includes(j) ||
                                targetNode.connections.includes(i);
        
        if (!alreadyConnected && Math.random() < 0.7) {
          currentNode.connections.push(j);
          targetNode.connections.push(i);
          connectionCount++;
        }
      }
    }
  }
  
  // Ensure all nodes are connected (minimum spanning connectivity)
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].connections.length === 0) {
      // Find the nearest node and connect
      let nearestId = -1;
      let minDistance = Infinity;
      
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        
        const distance = Math.sqrt(
          Math.pow(nodes[i].x - nodes[j].x, 2) + 
          Math.pow(nodes[i].y - nodes[j].y, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestId = j;
        }
      }
      
      if (nearestId !== -1) {
        nodes[i].connections.push(nearestId);
        nodes[nearestId].connections.push(i);
      }
    }
  }
  
  return nodes;
};

const bfs = (nodes: Node[], startId: number, endId: number): { path: number[]; steps: Node[][] } => {
  const steps: Node[][] = [];
  const queue: number[] = [startId];
  const visited = new Set<number>();
  const parent = new Map<number, number>();
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    
    const currentNodes = nodes.map(node => ({
      ...node,
      visited: visited.has(node.id),
      current: node.id === currentId
    }));
    
    steps.push(currentNodes);
    
    if (currentId === endId) break;
    
    const neighbors = nodes[currentId].connections.sort();
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId) && !queue.includes(neighborId)) {
        queue.push(neighborId);
        parent.set(neighborId, currentId);
      }
    }
  }
  
  // Reconstruct path
  const path: number[] = [];
  let current = endId;
  while (current !== undefined) {
    path.unshift(current);
    current = parent.get(current)!;
    if (current === startId) {
      path.unshift(startId);
      break;
    }
  }
  
  return { path, steps };
};

const dfs = (nodes: Node[], startId: number, endId: number): { path: number[]; steps: Node[][] } => {
  const steps: Node[][] = [];
  const stack: number[] = [startId];
  const visited = new Set<number>();
  const parent = new Map<number, number>();
  
  while (stack.length > 0) {
    const currentId = stack.pop()!;
    
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    
    const currentNodes = nodes.map(node => ({
      ...node,
      visited: visited.has(node.id),
      current: node.id === currentId
    }));
    
    steps.push(currentNodes);
    
    if (currentId === endId) break;
    
    const neighbors = [...nodes[currentId].connections].sort((a, b) => b - a);
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        stack.push(neighborId);
        if (!parent.has(neighborId)) {
          parent.set(neighborId, currentId);
        }
      }
    }
  }
  
  // Reconstruct path
  const path: number[] = [];
  let current = endId;
  while (current !== undefined) {
    path.unshift(current);
    current = parent.get(current)!;
    if (current === startId) {
      path.unshift(startId);
      break;
    }
  }
  
  return { path, steps };
};

export default function GraphTraversalGame() {
  const { 
    saveProgress, 
    initializeGame, 
    getBestScore, 
    getCurrentLevel, 
    getCurrentScore,
    sessionInitialized,
    loading: progressLoading 
  } = useGameProgress('graph-traversal');
  
  const [gameState, setGameState] = useState<GameState>({
    nodes: [],
    userPath: [],
    score: 0,
    level: 1,
    gameStarted: false,
    gameWon: false,
    startNode: 0,
    endNode: 1,
    isSelectingPath: false,
    showOptimal: false,
    showBFSDemo: false,
    showDFSDemo: false,
    algorithmSteps: [],
    currentAlgorithmStep: 0,
    isRunning: false,
    autoPlay: false,
    optimalPath: [],
    gameMode: 'play'
  });

  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  const [gameInitialized, setGameInitialized] = useState(false);

  // Initialize game when session is ready
  useEffect(() => {
    if (sessionInitialized && !progressLoading && !gameInitialized) {
      const gameData = initializeGame();
      const currentLevel = getCurrentLevel();
      const currentScore = getCurrentScore();
      
      console.log('Initializing game with:', { gameData, currentLevel, currentScore });
      
      const newNodes = generateComplexGraph(currentLevel);
      const startNode = 0;
      const endNode = newNodes.length - 1;
      
      // Get BFS path as the "optimal" path for comparison
      const bfsResult = bfs(newNodes, startNode, endNode);
      
      setGameState(prev => ({
        ...prev,
        nodes: newNodes,
        userPath: [],
        score: currentScore, // Use current session score
        level: currentLevel,
        gameStarted: true,
        gameWon: false,
        startNode,
        endNode,
        isSelectingPath: false,
        showOptimal: false,
        showBFSDemo: false,
        showDFSDemo: false,
        algorithmSteps: [],
        currentAlgorithmStep: 0,
        isRunning: false,
        autoPlay: false,
        optimalPath: bfsResult.path,
        gameMode: 'play'
      }));
      
      setGameInitialized(true);
    }
  }, [sessionInitialized, progressLoading, gameInitialized, initializeGame, getCurrentLevel, getCurrentScore]);

  const initializeGameLevel = useCallback(() => {
    const currentLevel = getCurrentLevel();
    const newNodes = generateComplexGraph(currentLevel);
    const startNode = 0;
    const endNode = newNodes.length - 1;
    
    // Get BFS path as the "optimal" path for comparison
    const bfsResult = bfs(newNodes, startNode, endNode);
    
    setGameState(prev => ({
      ...prev,
      nodes: newNodes,
      userPath: [],
      score: 0, // Reset score for new level
      level: currentLevel,
      gameStarted: true,
      gameWon: false,
      startNode,
      endNode,
      isSelectingPath: false,
      showOptimal: false,
      showBFSDemo: false,
      showDFSDemo: false,
      algorithmSteps: [],
      currentAlgorithmStep: 0,
      isRunning: false,
      autoPlay: false,
      optimalPath: bfsResult.path,
      gameMode: 'play'
    }));
  }, [getCurrentLevel]);

  const handleNodeClick = (nodeId: number) => {
    // Only allow node selection in play mode
    if (gameState.gameMode !== 'play' || gameState.gameWon) return;

    const newUserPath = [...gameState.userPath];
    
    // First click must be start node
    if (newUserPath.length === 0) {
      if (nodeId !== gameState.startNode) {
        toast.error(`Start from node ${gameState.nodes[gameState.startNode].label}!`);
        return;
      }
      newUserPath.push(nodeId);
      setGameState(prev => ({
        ...prev,
        userPath: newUserPath,
        isSelectingPath: true,
        nodes: prev.nodes.map(node => ({
          ...node,
          visited: node.id === nodeId,
          current: node.id === nodeId
        }))
      }));
      
      if (nodeId === gameState.endNode) {
        completeLevel();
        return;
      }
      
      toast.success(`Started! Find path to ${gameState.nodes[gameState.endNode].label}!`);
      return;
    }

    // Check if the clicked node is connected to the current node
    const currentNodeId = newUserPath[newUserPath.length - 1];
    const currentNode = gameState.nodes[currentNodeId];
    
    if (!currentNode.connections.includes(nodeId)) {
      toast.error('Not connected! Choose an adjacent node.');
      return;
    }

    // Check if already in path
    if (newUserPath.includes(nodeId)) {
      toast.error('Already in path! Choose a different node.');
      return;
    }

    newUserPath.push(nodeId);
    
    setGameState(prev => ({
      ...prev,
      userPath: newUserPath,
      nodes: prev.nodes.map(node => ({
        ...node,
        visited: newUserPath.includes(node.id),
        current: node.id === nodeId
      }))
    }));

    // Check if reached target
    if (nodeId === gameState.endNode) {
      completeLevel();
    } else {
      toast.success(`Added ${gameState.nodes[nodeId].label}`);
    }
  };

  const completeLevel = async () => {
    const pathLength = gameState.userPath.length + 1;
    const efficiency = gameState.optimalPath.length > 0 ? (gameState.optimalPath.length / pathLength) * 100 : 100;
    const bonus = Math.floor(efficiency * 3);
    const baseScore = 25;
    const levelScore = baseScore + bonus;
    const newTotalScore = gameState.score + levelScore;
    
    console.log('Completing level:', {
      level: gameState.level,
      levelScore,
      newTotalScore,
      efficiency
    });
    
    // Save progress - this will unlock the next level
    const progressResult = await saveProgress({
      level: gameState.level,
      score: levelScore,
      completed: true,
      accuracy: efficiency
    });

    if (progressResult.success) {
      // Update UI immediately to show completion
      setGameState(prev => ({
        ...prev,
        gameWon: true,
        score: newTotalScore // Show updated score in UI
      }));
      
      const message = pathLength === gameState.optimalPath.length 
        ? '🎉 Perfect! Optimal path found!' 
        : `Path found! Efficiency: ${efficiency.toFixed(1)}%`;
      
      toast.success(`${message} +${levelScore} points!`);
    } else {
      console.error('Save progress failed:', progressResult);
      toast.error('Failed to save progress!');
    }
  };

  const showOptimalPath = () => {
    setGameState(prev => ({
      ...prev,
      showOptimal: true,
      nodes: prev.nodes.map(node => ({
        ...node,
        path: prev.optimalPath.includes(node.id)
      }))
    }));
    
    toast(`Optimal path shown! Length: ${gameState.optimalPath.length}`);
  };

  const startBFSDemo = () => {
    const bfsResult = bfs(gameState.nodes, gameState.startNode, gameState.endNode);
    setGameState(prev => ({
      ...prev,
      gameMode: 'bfs',
      showBFSDemo: true,
      showDFSDemo: false,
      algorithmSteps: bfsResult.steps,
      currentAlgorithmStep: 0,
      nodes: bfsResult.steps[0] || prev.nodes,
      isRunning: true,
      autoPlay: true
    }));
  };

  const startDFSDemo = () => {
    const dfsResult = dfs(gameState.nodes, gameState.startNode, gameState.endNode);
    setGameState(prev => ({
      ...prev,
      gameMode: 'dfs',
      showDFSDemo: true,
      showBFSDemo: false,
      algorithmSteps: dfsResult.steps,
      currentAlgorithmStep: 0,
      nodes: dfsResult.steps[0] || prev.nodes,
      isRunning: true,
      autoPlay: true
    }));
  };

  const switchToPlayMode = () => {
    setGameState(prev => ({
      ...prev,
      gameMode: 'play',
      showBFSDemo: false,
      showDFSDemo: false,
      isRunning: false,
      autoPlay: false,
      nodes: prev.nodes.map(node => ({
        ...node,
        visited: prev.userPath.includes(node.id),
        current: node.id === prev.userPath[prev.userPath.length - 1],
        path: false
      }))
    }));
  };

  const nextAlgorithmStep = () => {
    if (gameState.currentAlgorithmStep < gameState.algorithmSteps.length - 1) {
      const nextStep = gameState.currentAlgorithmStep + 1;
      setGameState(prev => ({
        ...prev,
        currentAlgorithmStep: nextStep,
        nodes: prev.algorithmSteps[nextStep]
      }));
    } else {
      setGameState(prev => ({ ...prev, isRunning: false }));
    }
  };

  const resetGame = useCallback(() => {
    const currentLevel = getCurrentLevel();
    const currentScore = getCurrentScore();
    const newNodes = generateComplexGraph(currentLevel);
    const startNode = 0;
    const endNode = newNodes.length - 1;
    
    console.log('Resetting game:', { currentLevel, currentScore });
    
    // Get BFS path as the "optimal" path for comparison
    const bfsResult = bfs(newNodes, startNode, endNode);
    
    setGameState(prev => ({
      ...prev,
      nodes: newNodes,
      userPath: [],
      score: currentScore, // Maintain session score
      level: currentLevel,
      gameStarted: true,
      gameWon: false,
      startNode,
      endNode,
      isSelectingPath: false,
      showOptimal: false,
      showBFSDemo: false,
      showDFSDemo: false,
      algorithmSteps: [],
      currentAlgorithmStep: 0,
      isRunning: false,
      autoPlay: false,
      optimalPath: bfsResult.path,
      gameMode: 'play'
    }));
  }, [getCurrentLevel, getCurrentScore]);

  const clearPath = () => {
    setGameState(prev => ({
      ...prev,
      userPath: [],
      isSelectingPath: false,
      showOptimal: false,
      nodes: prev.nodes.map(node => ({ 
        ...node, 
        path: false, 
        visited: false, 
        current: false 
      }))
    }));
  };

  // Auto-play effect for algorithm demos
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState.autoPlay && gameState.isRunning && (gameState.showBFSDemo || gameState.showDFSDemo)) {
      interval = setInterval(() => {
        setGameState(prev => {
          if (prev.currentAlgorithmStep < prev.algorithmSteps.length - 1) {
            const nextStep = prev.currentAlgorithmStep + 1;
            return {
              ...prev,
              currentAlgorithmStep: nextStep,
              nodes: prev.algorithmSteps[nextStep]
            };
          } else {
            return { ...prev, isRunning: false };
          }
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [gameState.autoPlay, gameState.isRunning, gameState.showBFSDemo, gameState.showDFSDemo]); // Remove currentAlgorithmStep dependency

  const getNodeColor = (node: Node) => {
    if (node.id === gameState.startNode) return "#10b981"; // Green for start
    if (node.id === gameState.endNode) return "#ef4444"; // Red for end
    if (node.path && gameState.showOptimal) return "#f59e0b"; // Yellow for optimal path
    if (node.current && (gameState.showBFSDemo || gameState.showDFSDemo)) return "#3b82f6"; // Blue for current in demo
    if (node.visited && (gameState.showBFSDemo || gameState.showDFSDemo)) return "#8b5cf6"; // Purple for visited in demo
    if (gameState.userPath.includes(node.id)) return "#06b6d4"; // Cyan for user path
    return "#6b7280"; // Gray for unvisited
  };

  const getEdgeColor = (fromId: number, toId: number) => {
    if (gameState.showOptimal && gameState.nodes[fromId].path && gameState.nodes[toId].path) {
      return "#f59e0b"; // Yellow for optimal path
    }
    
    const fromIndex = gameState.userPath.indexOf(fromId);
    const toIndex = gameState.userPath.indexOf(toId);
    
    if (fromIndex >= 0 && toIndex >= 0 && Math.abs(fromIndex - toIndex) === 1) {
      return "#06b6d4"; // Cyan for user path
    }
    
    return "#9ca3af"; // Light gray for unused edges
  };

  const getEdgeWidth = (fromId: number, toId: number) => {
    if (gameState.showOptimal && gameState.nodes[fromId].path && gameState.nodes[toId].path) {
      return 4;
    }
    
    const fromIndex = gameState.userPath.indexOf(fromId);
    const toIndex = gameState.userPath.indexOf(toId);
    
    if (fromIndex >= 0 && toIndex >= 0 && Math.abs(fromIndex - toIndex) === 1) {
      return 4;
    }
    
    return 2;
  };

  const isNodeClickable = (nodeId: number) => {
    if (gameState.gameMode !== 'play') return false;
    if (gameState.gameWon) return false;
    
    // First click must be start node
    if (gameState.userPath.length === 0) {
      return nodeId === gameState.startNode;
    }
    
    // Can only click adjacent nodes that aren't already in path
    const currentNodeId = gameState.userPath[gameState.userPath.length - 1];
    const currentNode = gameState.nodes[currentNodeId];
    
    return currentNode.connections.includes(nodeId) && !gameState.userPath.includes(nodeId);
  };

  // Show loading state while initializing
  if (!gameInitialized || progressLoading) {
    return (
      <GameLayout
        title="Graph Traversal Challenge"
        description="Navigate complex graphs using BFS and DFS algorithms!"
        score={0}
        level={1}
      >
        <div className="flex items-center justify-center min-h-96">
          <div className="text-white text-xl">Loading game...</div>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout
      title="Graph Traversal Challenge"
      description="Navigate complex graphs using BFS and DFS algorithms!"
      score={gameState.score}
      level={gameState.level}
    >
      {gameState.gameWon && <Confetti width={windowSize.width} height={windowSize.height} />}
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Enhanced Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-900/30 via-blue-900/30 to-cyan-900/30 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-8 shadow-2xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="text-white font-medium">Mode:</div>
              <div className="flex gap-2">
                <motion.button
                  whileHover={buttonHover}
                  whileTap={buttonTap}
                  onClick={switchToPlayMode}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                    gameState.gameMode === 'play'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  🎮 Play Mode
                </motion.button>
                <motion.button
                  whileHover={buttonHover}
                  whileTap={buttonTap}
                  onClick={startBFSDemo}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                    gameState.gameMode === 'bfs'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  📊 BFS Demo
                </motion.button>
                <motion.button
                  whileHover={buttonHover}
                  whileTap={buttonTap}
                  onClick={startDFSDemo}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                    gameState.gameMode === 'dfs'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  📊 DFS Demo
                </motion.button>
              </div>
            </div>
            
            <div className="flex gap-3">
              {gameState.gameMode === 'play' && (
                              <motion.button
                whileHover={buttonHover}
                whileTap={buttonTap}
                onClick={showOptimalPath}
                  disabled={gameState.showOptimal}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl font-medium hover:from-yellow-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
                >
                  <Eye className="w-5 h-5 inline mr-2" />
                  Show Path
                </motion.button>
              )}
              
              <motion.button
                whileHover={buttonHover}
                whileTap={buttonTap}
                onClick={clearPath}
                className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg"
              >
                Clear Path
              </motion.button>
              
              <motion.button
                whileHover={buttonHover}
                whileTap={buttonTap}
                onClick={resetGame}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-pink-700 transition-all duration-300 shadow-lg"
              >
                <RotateCcw className="w-5 h-5 inline mr-2" />
                New Challenge
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Game Status */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-6"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-green-400">Start</div>
              <div className="text-sm text-green-200">
                {gameState.nodes[gameState.startNode]?.label || '?'}
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-400">Target</div>
              <div className="text-sm text-red-200">
                {gameState.endNode >= 0 ? gameState.nodes[gameState.endNode]?.label : '?'}
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-400">Path Length</div>
              <div className="text-sm text-blue-200">{gameState.userPath.length}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-400">Mode</div>
              <div className="text-sm text-purple-200 capitalize">{gameState.gameMode}</div>
            </div>
          </div>
        </motion.div>

        {/* Algorithm Demo Controls */}
        {(gameState.showBFSDemo || gameState.showDFSDemo) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="text-white">
                <strong>{gameState.showBFSDemo ? 'BFS' : 'DFS'} Algorithm Demo</strong> - Step {gameState.currentAlgorithmStep + 1}/{gameState.algorithmSteps.length}
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={nextAlgorithmStep}
                  disabled={!gameState.isRunning}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <SkipForward className="w-4 h-4 inline mr-2" />
                  Next Step
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setGameState(prev => ({ ...prev, autoPlay: !prev.autoPlay }))}
                  disabled={!gameState.isRunning}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    gameState.autoPlay
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {gameState.autoPlay ? <Pause className="w-4 h-4 inline mr-2" /> : <Play className="w-4 h-4 inline mr-2" />}
                  {gameState.autoPlay ? 'Pause' : 'Auto Play'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Current Path Display */}
        {gameState.userPath.length > 0 && gameState.gameMode === 'play' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-6"
          >
            <h3 className="text-lg font-bold text-white mb-3">Your Path (Length: {gameState.userPath.length}):</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {gameState.userPath.map((nodeId, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="px-3 py-1 bg-cyan-600 text-white rounded-lg font-bold">
                    {gameState.nodes[nodeId]?.label}
                  </div>
                  {index < gameState.userPath.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Graph Visualization */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-8"
        >
          <div className="relative bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-white/10 shadow-2xl">
            <svg width="800" height="600" className="w-full h-full">
              {/* Connections */}
              {gameState.nodes.map((node) =>
                node.connections.map((targetId) => {
                  const target = gameState.nodes.find(n => n.id === targetId);
                  if (!target || targetId < node.id) return null;
                  
                  return (
                    <line
                      key={`${node.id}-${targetId}`}
                      x1={node.x}
                      y1={node.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={getEdgeColor(node.id, targetId)}
                      strokeWidth={getEdgeWidth(node.id, targetId)}
                      opacity={0.8}
                    />
                  );
                })
              )}

              {/* Nodes */}
              {gameState.nodes.map((node) => (
                <g key={node.id}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.id === gameState.startNode || node.id === gameState.endNode ? 30 : 25}
                    fill={getNodeColor(node)}
                    stroke="white"
                    strokeWidth={3}
                    className={isNodeClickable(node.id) ? "cursor-pointer hover:stroke-yellow-400" : "cursor-default"}
                    onClick={() => handleNodeClick(node.id)}
                    style={{
                      filter: isNodeClickable(node.id) ? 'drop-shadow(0 0 8px rgba(255, 255, 0, 0.6))' : 'none'
                    }}
                  />
                  <text
                    x={node.x}
                    y={node.y + 5}
                    textAnchor="middle"
                    fill="white"
                    fontSize="16"
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    {node.label}
                  </text>
                  
                  {/* Node indicators */}
                  {node.id === gameState.startNode && (
                    <text
                      x={node.x}
                      y={node.y - 50}
                      textAnchor="middle"
                      fill="#10b981"
                      fontSize="12"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      START
                    </text>
                  )}
                  {node.id === gameState.endNode && (
                    <text
                      x={node.x}
                      y={node.y - 50}
                      textAnchor="middle"
                      fill="#ef4444"
                      fontSize="12"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      TARGET
                    </text>
                  )}
                </g>
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
              <div>• <strong>Play Mode:</strong> Click nodes to build your path</div>
              <div>• Start from the GREEN node</div>
              <div>• Navigate to adjacent nodes only</div>
              <div>• Find the RED target node efficiently</div>
              <div>• Clickable nodes glow yellow</div>
              <div>• Use algorithm demos to learn BFS/DFS patterns</div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Node Colors</h3>
            <div className="space-y-2 text-purple-200">
              <div>• <strong>Green:</strong> Start node</div>
              <div>• <strong>Red:</strong> Target node</div>
              <div>• <strong>Cyan:</strong> Your selected path</div>
              <div>• <strong>Yellow:</strong> Optimal path (when shown)</div>
              <div>• <strong>Blue/Purple:</strong> Algorithm progress (current/visited)</div>
              <div>• <strong>Yellow Glow:</strong> Clickable nodes</div>
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
                  
                  <h2 className="text-2xl font-bold text-white mb-2">Target Found!</h2>
                  <p className="text-blue-200 mb-6">Excellent navigation through the complex graph!</p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between">
                      <span className="text-blue-200">Final Score:</span>
                      <span className="text-white font-bold">{gameState.score.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-200">Path Length:</span>
                      <span className="text-white font-bold">{gameState.userPath.length}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <motion.button
                      whileHover={buttonHover}
                      whileTap={buttonTap}
                      onClick={() => {
                        const nextLevel = getCurrentLevel(); // Get current unlocked level
                        const currentScore = getCurrentScore(); // Maintain session score
                        
                        console.log('Starting next challenge:', { nextLevel, currentScore });
                        
                        // Generate new graph for current unlocked level
                        const newNodes = generateComplexGraph(nextLevel);
                        const startNode = 0;
                        const endNode = newNodes.length - 1;
                        const bfsResult = bfs(newNodes, startNode, endNode);
                        
                        setGameState(prev => ({
                          ...prev,
                          gameWon: false,
                          level: nextLevel,
                          nodes: newNodes,
                          userPath: [],
                          isSelectingPath: false,
                          showOptimal: false,
                          showBFSDemo: false,
                          showDFSDemo: false,
                          algorithmSteps: [],
                          currentAlgorithmStep: 0,
                          isRunning: false,
                          autoPlay: false,
                          gameMode: 'play',
                          startNode,
                          endNode,
                          optimalPath: bfsResult.path,
                          score: currentScore // Keep current session score
                        }));
                        
                        toast.success(`Level ${nextLevel} - New Challenge!`);
                      }}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200 text-center min-h-[44px] flex items-center justify-center"
                    >
                      Next Challenge
                    </motion.button>
                    <motion.button
                      whileHover={buttonHover}
                      whileTap={buttonTap}
                      onClick={resetGame}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-200 text-center min-h-[44px] flex items-center justify-center"
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
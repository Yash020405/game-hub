'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Users, Trophy, Zap, CheckCircle, TrendingUp, Network, Target, Lightbulb } from 'lucide-react';
import GameLayout from '@/components/GameLayout';
import { toast } from 'react-hot-toast';
import Confetti from 'react-confetti';

interface Person {
  id: number;
  x: number;
  y: number;
  name: string;
  color: string;
  connections: number[];
  influence: number;
  community: number;
  selected: boolean;
  role: 'influencer' | 'connector' | 'follower';
}

interface Connection {
  from: number;
  to: number;
  strength: number;
  type: 'friend' | 'colleague' | 'family';
}

interface Community {
  id: number;
  members: number[];
  color: string;
  name: string;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  objective: string;
  target: any;
  completed: boolean;
}

const challenges: Challenge[] = [
  {
    id: 'most_connected',
    title: 'Find the Most Connected Person',
    description: 'Click on the person who has the most connections (friends)',
    objective: 'The person with the most lines connected to them',
    target: null,
    completed: false
  },
  {
    id: 'find_bridge',
    title: 'Find the Bridge Person',
    description: 'Click on the person who connects different groups',
    objective: 'The person who, if removed, would split the network',
    target: null,
    completed: false
  },
  {
    id: 'central_person',
    title: 'Find the Central Person',
    description: 'Click on the person in the center of the network',
    objective: 'The person closest to everyone else on average',
    target: null,
    completed: false
  }
];

const REAL_WORLD_SCENARIOS = [
  {
    id: 'workplace',
    title: 'Corporate Network',
    description: 'Analyze workplace relationships and identify key communicators',
    icon: '🏢'
  },
  {
    id: 'social_media',
    title: 'Social Media Influence',
    description: 'Track viral content spread and influencer networks',
    icon: '📱'
  },
  {
    id: 'academic',
    title: 'Research Collaboration',
    description: 'Map academic collaborations and citation networks',
    icon: '🎓'
  },
  {
    id: 'epidemic',
    title: 'Disease Spread',
    description: 'Model how diseases spread through social contacts',
    icon: '🦠'
  }
];

interface GameState {
  people: Person[];
  connections: Connection[];
  communities: Community[];
  selectedPerson: number | null;
  selectedPeople: Set<number>;
  score: number;
  level: number;
  gameStarted: boolean;
  gameWon: boolean;
  analysisMode: 'centrality' | 'communities' | 'influence' | 'paths' | 'clustering';
  currentChallenge: Challenge | null;
  challenges: Challenge[];
  challengeIndex: number;
  networkStats: {
    totalConnections: number;
    averageDegree: number;
    clustering: number;
    diameter: number;
  };
  currentScenario: string;
  showInfluenceSpread: boolean;
  influenceSource: number | null;
}

const PERSON_NAMES = [
  'Alice', 'Bob', 'Carol', 'David', 'Eve', 'Frank', 'Grace', 'Henry',
  'Ivy', 'Jack', 'Kate', 'Liam', 'Maya', 'Noah', 'Olivia', 'Paul'
];

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

const generateSocialNetwork = (level: number): { people: Person[], connections: Connection[], communities: Community[], challenges: Challenge[] } => {
  const personCount = Math.min(8 + level * 2, 16);
  const people: Person[] = [];
  const connections: Connection[] = [];
  const communities: Community[] = [];

  // Generate people with roles
  for (let i = 0; i < personCount; i++) {
    const angle = (i / personCount) * 2 * Math.PI;
    const radius = 120 + level * 15;
    const x = Math.cos(angle) * radius + 300;
    const y = Math.sin(angle) * radius + 200;

    const roles: ('influencer' | 'connector' | 'follower')[] = ['influencer', 'connector', 'follower'];
    const role = roles[Math.floor(Math.random() * roles.length)];

    people.push({
      id: i,
      x: x + (Math.random() - 0.5) * 50,
      y: y + (Math.random() - 0.5) * 50,
      name: PERSON_NAMES[i % PERSON_NAMES.length],
      color: COLORS[i % COLORS.length],
      connections: [],
      influence: Math.floor(Math.random() * 100),
      community: Math.floor(i / Math.ceil(personCount / 3)),
      selected: false,
      role
    });
  }

  // Generate connections
  for (let i = 0; i < people.length; i++) {
    const connectionCount = Math.floor(Math.random() * 4) + 2;
    
    for (let j = 0; j < connectionCount; j++) {
      const targetId = Math.floor(Math.random() * people.length);
      
      if (targetId !== i && !connections.some(c => 
        (c.from === i && c.to === targetId) || (c.from === targetId && c.to === i)
      )) {
        const connectionType: 'friend' | 'colleague' | 'family' = 
          Math.random() < 0.5 ? 'friend' : 
          Math.random() < 0.7 ? 'colleague' : 'family';
        
        connections.push({
          from: i,
          to: targetId,
          strength: Math.floor(Math.random() * 10) + 1,
          type: connectionType
        });

        people[i].connections.push(targetId);
        people[targetId].connections.push(i);
      }
    }
  }

  // Generate communities
  const communityCount = Math.ceil(personCount / 4);
  for (let i = 0; i < communityCount; i++) {
    const members = people.filter(p => p.community === i).map(p => p.id);
    
    communities.push({
      id: i,
      members,
      color: COLORS[i % COLORS.length],
      name: `Community ${String.fromCharCode(65 + i)}`
    });
  }

  // Create challenges
  const challenges: Challenge[] = [
    {
      id: 'influencer',
      title: 'Find the Influencer',
      description: 'Identify the person with the highest influence in the network',
      objective: 'Select the person with the highest influence score',
      target: null,
      completed: false
    },
    {
      id: 'community',
      title: 'Community Detection',
      description: 'Identify members of the largest community',
      objective: 'Select all members of the largest community',
      target: null,
      completed: false
    },
    {
      id: 'connector',
      title: 'Find the Connector',
      description: 'Identify the person who connects different communities',
      objective: 'Select the person with the most diverse connections',
      target: null,
      completed: false
    },
    {
      id: 'bridge',
      title: 'Bridge Finder',
      description: 'Find people who bridge different communities',
      objective: 'Identify structural bridges in the network',
      target: null,
      completed: false
    },
    {
      id: 'information_flow',
      title: 'Information Spread',
      description: 'Trace how information flows through the network',
      objective: 'Find the optimal path for information dissemination',
      target: null,
      completed: false
    },
    {
      id: 'clustering',
      title: 'Clustering Analysis',
      description: 'Analyze the clustering coefficient of the network',
      objective: 'Identify highly clustered regions',
      target: null,
      completed: false
    }
  ];

  return { people, connections, communities, challenges };
};

const calculateCentrality = (people: Person[], connections: Connection[]): Person[] => {
  return people.map(person => {
    // Degree centrality
    const degree = person.connections.length;
    
    // Betweenness centrality (simplified)
    let betweenness = 0;
    for (let i = 0; i < people.length; i++) {
      for (let j = i + 1; j < people.length; j++) {
        if (i !== person.id && j !== person.id) {
          // Check if person is on shortest path between i and j
          const pathThroughPerson = hasPathThrough(i, j, person.id, connections);
          if (pathThroughPerson) betweenness++;
        }
      }
    }
    
    return {
      ...person,
      influence: degree * 10 + betweenness * 5
    };
  });
};

const hasPathThrough = (start: number, end: number, through: number, connections: Connection[]): boolean => {
  // Simplified path checking
  const hasConnectionToStart = connections.some(c => 
    (c.from === through && c.to === start) || (c.from === start && c.to === through)
  );
  const hasConnectionToEnd = connections.some(c => 
    (c.from === through && c.to === end) || (c.from === end && c.to === through)
  );
  
  return hasConnectionToStart && hasConnectionToEnd;
};

export default function SocialNetworkGame() {
  const [gameState, setGameState] = useState<GameState>({
    people: [],
    connections: [],
    communities: [],
    selectedPerson: null,
    selectedPeople: new Set(),
    score: 0,
    level: 1,
    gameStarted: false,
    gameWon: false,
    analysisMode: 'centrality',
    currentChallenge: null,
    challenges: [],
    challengeIndex: 0,
    networkStats: {
      totalConnections: 0,
      averageDegree: 0,
      clustering: 0,
      diameter: 0
    },
    currentScenario: '',
    showInfluenceSpread: false,
    influenceSource: null
  });

  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  const initializeGame = useCallback(() => {
    const { people, connections, communities, challenges } = generateSocialNetwork(gameState.level);
    const updatedPeople = calculateCentrality(people, connections);
    
    const stats = {
      totalConnections: connections.length,
      averageDegree: connections.length * 2 / people.length,
      clustering: calculateClustering(people, connections),
      diameter: calculateDiameter(people, connections)
    };

    setGameState(prev => ({
      ...prev,
      people: updatedPeople,
      connections,
      communities,
      challenges,
      selectedPerson: null,
      selectedPeople: new Set(),
      gameStarted: true,
      gameWon: false,
      networkStats: stats,
      currentChallenge: challenges[0],
      challengeIndex: 0
    }));
  }, [gameState.level]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const calculateClustering = (people: Person[], connections: Connection[]): number => {
    let totalClustering = 0;
    
    people.forEach(person => {
      const neighbors = person.connections;
      if (neighbors.length < 2) return;
      
      let triangles = 0;
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          const hasConnection = connections.some(c =>
            (c.from === neighbors[i] && c.to === neighbors[j]) ||
            (c.from === neighbors[j] && c.to === neighbors[i])
          );
          if (hasConnection) triangles++;
        }
      }
      
      const possibleTriangles = (neighbors.length * (neighbors.length - 1)) / 2;
      totalClustering += triangles / possibleTriangles;
    });
    
    return totalClustering / people.length;
  };

  const calculateDiameter = (people: Person[], connections: Connection[]): number => {
    // Simplified diameter calculation using BFS
    let maxDistance = 0;
    
    people.forEach(start => {
      const distances = new Map<number, number>();
      const queue = [start.id];
      distances.set(start.id, 0);
      
      while (queue.length > 0) {
        const current = queue.shift()!;
        const currentDistance = distances.get(current)!;
        
        const neighbors = connections
          .filter(c => c.from === current || c.to === current)
          .map(c => c.from === current ? c.to : c.from);
        
        neighbors.forEach(neighbor => {
          if (!distances.has(neighbor)) {
            distances.set(neighbor, currentDistance + 1);
            queue.push(neighbor);
            maxDistance = Math.max(maxDistance, currentDistance + 1);
          }
        });
      }
    });
    
    return maxDistance;
  };

  const handlePersonClick = (personId: number) => {
    const person = gameState.people[personId];
    
    // Update selection state
    setGameState(prev => ({
      ...prev,
      selectedPerson: prev.selectedPerson === personId ? null : personId,
      people: prev.people.map(p => ({
        ...p,
        selected: p.id === personId ? !p.selected : p.selected
      }))
    }));

    toast.success(`Selected ${person.name} - Influence: ${person.influence}, Connections: ${person.connections.length}`);
    
    // Check if this selection completes the current challenge
    if (gameState.currentChallenge) {
      checkChallengeCompletion(personId);
    }
  };
  
  const checkChallengeCompletion = (personId: number) => {
    const challenge = gameState.currentChallenge;
    if (!challenge) return;
    
    let isCompleted = false;
    
    if (challenge.id === 'influencer') {
      isCompleted = challenge.target.id === personId;
    } else if (challenge.id === 'connector') {
      isCompleted = challenge.target.id === personId;
    } else if (challenge.id === 'community') {
      // For community challenge, we need to check if all selected people are in the target community
      const selectedPeople = gameState.people.filter(p => p.selected || p.id === personId);
      const targetCommunity = challenge.target.members;
      isCompleted = selectedPeople.every(p => targetCommunity.includes(p.id)) && 
                    selectedPeople.length === targetCommunity.length;
    }
    
    if (isCompleted) {
      const updatedChallenges = gameState.challenges.map(c => 
        c.id === challenge.id ? { ...c, completed: true } : c
      );
      
      const nextChallenge = updatedChallenges.find(c => !c.completed);
      const allCompleted = updatedChallenges.every(c => c.completed);
      
      const challengeBonus = 500;
      
      setGameState(prev => ({
        ...prev,
        challenges: updatedChallenges,
        currentChallenge: nextChallenge || null,
        score: prev.score + challengeBonus,
        gameWon: allCompleted
      }));
      
      toast.success(`🎉 Challenge completed! ${challenge.title} +${challengeBonus} points`);
      
      if (allCompleted) {
        const levelBonus = gameState.level * 1000;
        setGameState(prev => ({
          ...prev,
          score: prev.score + levelBonus,
          level: prev.level + 1
        }));
        
        toast.success(`🎉 All challenges completed! +${levelBonus} bonus points`);
      } else if (nextChallenge) {
        toast(`New challenge: ${nextChallenge.title}`);
      }
    }
  };

  const resetGame = () => {
    initializeGame();
  };

  const getPersonSize = (person: Person) => {
    switch (gameState.analysisMode) {
      case 'centrality':
        return 15 + (person.connections.length * 3);
      case 'influence':
        return 15 + (person.influence / 10);
      default:
        return 20;
    }
  };

  const getPersonColor = (person: Person) => {
    if (person.selected) return '#fbbf24'; // Yellow for selected
    
    switch (gameState.analysisMode) {
      case 'communities':
        return gameState.communities[person.community]?.color || person.color;
      case 'influence':
        const intensity = Math.min(person.influence / 100, 1);
        return `rgba(239, 68, 68, ${0.3 + intensity * 0.7})`;
      default:
        return person.color;
    }
  };

  const getConnectionColor = (connection: Connection) => {
    switch (connection.type) {
      case 'family': return '#ef4444';
      case 'colleague': return '#3b82f6';
      case 'friend': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getConnectionWidth = (connection: Connection) => {
    return Math.max(1, connection.strength / 2);
  };

  return (
    <GameLayout
      title="Social Network Analysis"
      description="Analyze social connections and find key people!"
      score={gameState.score}
      level={gameState.level}
    >
      {gameState.gameWon && <Confetti width={windowSize.width} height={windowSize.height} />}
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Simple Challenge Display */}
        {gameState.currentChallenge && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-8 shadow-2xl"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">
                Challenge {gameState.challengeIndex + 1}: {gameState.currentChallenge.title}
              </h2>
              <p className="text-lg text-blue-200 mb-3">
                {gameState.currentChallenge.description}
              </p>
              <div className="text-sm text-yellow-300 bg-yellow-900/30 rounded-lg p-3 inline-block">
                <Lightbulb className="w-4 h-4 inline mr-2" />
                Hint: {gameState.currentChallenge.objective}
              </div>
            </div>
          </motion.div>
        )}

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
                  <Users className="w-5 h-5" />
                  People
                </div>
                <div className="text-sm text-green-200">{gameState.people.length}</div>
              </motion.div>
              
              <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-blue-400 flex items-center gap-2">
                  <Network className="w-5 h-5" />
                  Connections
                </div>
                <div className="text-sm text-blue-200">{gameState.connections.length}</div>
              </motion.div>
              
              <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
                <div className="text-2xl font-bold text-purple-400 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Challenge
                </div>
                <div className="text-sm text-purple-200">
                  {gameState.challengeIndex + 1} of {gameState.challenges.length}
                </div>
              </motion.div>
            </div>
            
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resetGame}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-pink-700 transition-all duration-200"
              >
                <RotateCcw className="w-4 h-4 inline mr-2" />
                New Network
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Network Visualization */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-8"
        >
          <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-lg rounded-3xl p-12 border-2 border-white/20 shadow-2xl">
            <svg width="800" height="600" className="w-full h-full" style={{ filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.3))' }}>
              {/* Background grid */}
              <defs>
                <pattern id="socialGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
                </pattern>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <rect width="100%" height="100%" fill="url(#socialGrid)" />

              {/* Connection shadows */}
              {gameState.connections.map((connection, index) => {
                const fromPerson = gameState.people.find(p => p.id === connection.from);
                const toPerson = gameState.people.find(p => p.id === connection.to);
                if (!fromPerson || !toPerson) return null;

                return (
                  <line
                    key={`shadow-${index}`}
                    x1={fromPerson.x + 3}
                    y1={fromPerson.y + 3}
                    x2={toPerson.x + 3}
                    y2={toPerson.y + 3}
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth="4"
                  />
                );
              })}

              {/* Connections */}
              {gameState.connections.map((connection, index) => {
                const fromPerson = gameState.people.find(p => p.id === connection.from);
                const toPerson = gameState.people.find(p => p.id === connection.to);
                if (!fromPerson || !toPerson) return null;

                const isHighlighted = gameState.selectedPeople.has(connection.from) || 
                                    gameState.selectedPeople.has(connection.to);

                return (
                  <motion.line
                    key={index}
                    x1={fromPerson.x}
                    y1={fromPerson.y}
                    x2={toPerson.x}
                    y2={toPerson.y}
                    stroke={isHighlighted ? "#fbbf24" : getConnectionColor(connection)}
                    strokeWidth={isHighlighted ? 4 : getConnectionWidth(connection)}
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    style={{ filter: isHighlighted ? 'url(#glow)' : 'none' }}
                  />
                );
              })}

              {/* Person shadows */}
              {gameState.people.map((person) => (
                <circle
                  key={`shadow-${person.id}`}
                  cx={person.x + 4}
                  cy={person.y + 4}
                  r={getPersonSize(person) + 2}
                  fill="rgba(0,0,0,0.3)"
                />
              ))}

              {/* People */}
              {gameState.people.map((person) => {
                const isSelected = gameState.selectedPeople.has(person.id);
                const connectionCount = gameState.connections.filter(c => 
                  c.from === person.id || c.to === person.id
                ).length;

                return (
                  <motion.g
                    key={person.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: person.id * 0.1, type: "spring", stiffness: 300 }}
                  >
                    {/* Glow effect for selected */}
                    {isSelected && (
                      <circle
                        cx={person.x}
                        cy={person.y}
                        r={getPersonSize(person) + 8}
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="3"
                        opacity="0.6"
                        style={{ filter: 'blur(3px)' }}
                      />
                    )}
                    
                    {/* Person circle */}
                    <circle
                      cx={person.x}
                      cy={person.y}
                      r={getPersonSize(person)}
                      fill={getPersonColor(person)}
                      stroke={isSelected ? "#fbbf24" : "white"}
                      strokeWidth={isSelected ? 4 : 2}
                      className="cursor-pointer transition-all duration-200 hover:stroke-cyan-400 hover:stroke-4"
                      onClick={() => handlePersonClick(person.id)}
                      style={{ filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.5))' }}
                    />

                    {/* Person name */}
                    <text
                      x={person.x}
                      y={person.y + 6}
                      textAnchor="middle"
                      fill="white"
                      fontSize="14"
                      fontWeight="bold"
                      className="pointer-events-none"
                      style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
                    >
                      {person.name}
                    </text>

                    {/* Connection count indicator */}
                    <motion.circle
                      cx={person.x + getPersonSize(person) - 5}
                      cy={person.y - getPersonSize(person) + 5}
                      r="12"
                      fill="#1f2937"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5 + person.id * 0.1 }}
                    />
                    <text
                      x={person.x + getPersonSize(person) - 5}
                      y={person.y - getPersonSize(person) + 10}
                      textAnchor="middle"
                      fill="#3b82f6"
                      fontSize="10"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      {connectionCount}
                    </text>
                  </motion.g>
                );
              })}
            </svg>
          </div>
        </motion.div>

        {/* Help Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 backdrop-blur-sm rounded-xl p-6 border border-white/10"
        >
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            How to Play
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <strong className="text-blue-400">Connections:</strong> Blue lines show friendships between people
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <strong className="text-green-400">Numbers:</strong> Small circles show how many friends each person has
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <strong className="text-yellow-400">Selection:</strong> Click on people to select them for challenges
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </GameLayout>
  );
}
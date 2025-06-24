'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  Network, 
  Target, 
  Brain, 
  Puzzle, 
  Crown,
  TrendingUp,
  Eye,
  Palette,
  Route,
  Navigation,
  Users,
  Gamepad2,
  Sparkles,
  Play,
  Zap,
  Bomb,
  Grid3X3,
  Pen,
  Link as LinkIcon,
  LogIn,
  LogOut,
  User,
  Trophy
} from 'lucide-react';
import GameCard from '@/components/ui/GameCard';
import GameButton from '@/components/ui/GameButton';
import ParticleBackground from '@/components/ParticleBackground';
import { AuthModal } from '@/components/AuthModal';
import { useAuth } from '@/components/AuthProvider';
import { useState, useEffect } from 'react';
import { getUserProgress } from '@/lib/supabase';

const games = [
  {
    id: 'graph-traversal',
    title: 'Graph Traversal',
    description: 'Navigate through nodes using BFS and DFS algorithms',
    icon: <Network className="w-8 h-8" />,
    color: 'blue',
    gradient: 'from-blue-500 via-cyan-500 to-blue-600'
  },
  {
    id: 'shortest-path',
    title: 'Shortest Path',
    description: 'Find optimal routes through weighted graphs',
    icon: <Target className="w-8 h-8" />,
    color: 'green',
    gradient: 'from-green-500 via-emerald-500 to-green-600'
  },
  {
    id: 'graph-coloring',
    title: 'Graph Coloring',
    description: 'Color vertices without adjacent conflicts',
    icon: <Palette className="w-8 h-8" />,
    color: 'cyan',
    gradient: 'from-cyan-500 via-teal-500 to-cyan-600'
  },
  {
    id: 'minimum-spanning-tree',
    title: 'Minimum Spanning Tree',
    description: 'Connect all vertices with minimum weight',
    icon: <Brain className="w-8 h-8" />,
    color: 'purple',
    gradient: 'from-purple-500 via-violet-500 to-purple-600'
  },
  {
    id: 'topological-sort',
    title: 'Topological Sort',
    description: 'Order vertices respecting dependencies',
    icon: <TrendingUp className="w-8 h-8" />,
    color: 'orange',
    gradient: 'from-orange-500 via-amber-500 to-orange-600'
  },
  {
    id: 'maze',
    title: 'Escape the Maze',
    description: 'Navigate through challenging mazes',
    icon: <Navigation className="w-8 h-8" />,
    color: 'green',
    gradient: 'from-green-500 via-teal-500 to-green-600'
  },
  {
    id: 'snake-ladders',
    title: 'Snake & Ladders',
    description: 'Classic board game with graph mechanics',
    icon: <Crown className="w-8 h-8" />,
    color: 'yellow',
    gradient: 'from-yellow-500 via-amber-500 to-yellow-600'
  },
  {
    id: 'sudoku',
    title: 'Graph Sudoku',
    description: 'Solve puzzles using constraint satisfaction',
    icon: <Grid3X3 className="w-8 h-8" />,
    color: 'purple',
    gradient: 'from-purple-500 via-fuchsia-500 to-purple-600'
  },
  {
    id: 'memory',
    title: 'Graph Memory',
    description: 'Match pairs in this memory challenge',
    icon: <Brain className="w-8 h-8" />,
    color: 'cyan',
    gradient: 'from-cyan-500 via-blue-500 to-cyan-600'
  },
  {
    id: 'minesweeper',
    title: 'Classic Minesweeper',
    description: 'Uncover mines using logical deduction',
    icon: <Bomb className="w-8 h-8" />,
    color: 'red',
    gradient: 'from-red-500 via-orange-500 to-red-600'
  },
  {
    id: 'graph-builder',
    title: 'Graph Builder',
    description: 'Create and manipulate graph structures',
    icon: <Eye className="w-8 h-8" />,
    color: 'purple',
    gradient: 'from-purple-500 via-pink-500 to-purple-600'
  },
  {
    id: 'graph-puzzles',
    title: 'Graph Puzzles',
    description: 'Solve challenging logic puzzles',
    icon: <Puzzle className="w-8 h-8" />,
    color: 'green',
    gradient: 'from-green-500 via-lime-500 to-green-600'
  },


  {
    id: 'graph-tetris',
    title: 'Graph Tetris',
    description: 'Tetris with connection mechanics',
    icon: <Gamepad2 className="w-8 h-8" />,
    color: 'purple',
    gradient: 'from-purple-500 via-violet-500 to-purple-600'
  },
  {
    id: 'drawing-challenge',
    title: 'Drawing Challenge',
    description: 'Draw graphs to solve challenges',
    icon: <Pen className="w-8 h-8" />,
    color: 'green',
    gradient: 'from-green-500 via-emerald-500 to-green-600'
  },
  {
    id: 'social-network',
    title: 'Social Network',
    description: 'Build and analyze network connections',
    icon: <Users className="w-8 h-8" />,
    color: 'blue',
    gradient: 'from-blue-500 via-sky-500 to-blue-600'
  },
  {
    id: 'graph-matching',
    title: 'Graph Matching',
    description: 'Find perfect matchings in graphs',
    icon: <LinkIcon className="w-8 h-8" />,
    color: 'cyan',
    gradient: 'from-cyan-500 via-blue-500 to-cyan-600'
  }
];

export default function Home() {
  const { user, signOut, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userProgress, setUserProgress] = useState<any[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserProgress();
    }
  }, [user]);

  // Refresh progress when page becomes visible (user returns from game)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        console.log('Page became visible, refreshing user progress...');
        loadUserProgress();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also refresh when window gets focus
    const handleFocus = () => {
      if (user) {
        console.log('Window focused, refreshing user progress...');
        loadUserProgress();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  const loadUserProgress = async () => {
    if (!user) return;
    
    console.log('Loading user progress for user:', user.id);
    const { data } = await getUserProgress(user.id);
    if (data) {
      console.log('Loaded progress data:', data);
      setUserProgress(data);
      const total = data.reduce((sum, game) => sum + (game.score || 0), 0);
      console.log('Calculated total score:', total);
      setTotalScore(total);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animated-bg relative overflow-hidden">
      <ParticleBackground />
      
      {/* Header with Authentication */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-20 w-full px-4 sm:px-6 lg:px-8 py-4"
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Gamepad2 className="w-8 h-8 text-purple-400" />
            <span className="text-xl font-bold text-white hidden sm:block">Game Hub</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-4"
              >
                <div className="hidden sm:block text-right">
                  <div className="text-white text-sm font-medium">
                    {user.user_metadata?.username || user.email?.split('@')[0]}
                  </div>
                  <div className="text-purple-300 text-xs">
                    <Trophy className="inline w-3 h-3 mr-1" />
                    Score: {totalScore.toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25"
                  >
                    <User className="w-5 h-5 text-white" />
                  </motion.div>
                  <motion.button
                    onClick={async () => {
                      try {
                        setSigningOut(true)
                        await signOut()
                      } catch (error) {
                        console.error('Sign out error:', error)
                        setSigningOut(false)
                      }
                    }}
                    disabled={signingOut}
                    whileHover={!signingOut ? { scale: 1.05 } : {}}
                    whileTap={!signingOut ? { scale: 0.95 } : {}}
                    className={`px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 rounded-xl transition-all duration-200 flex items-center space-x-2 backdrop-blur-sm ${signingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <LogOut className={`w-4 h-4 ${signingOut ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline font-medium">
                      {signingOut ? 'Signing Out...' : 'Sign Out'}
                    </span>
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setShowAuthModal(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white rounded-2xl transition-all duration-200 flex items-center space-x-2 shadow-xl shadow-indigo-500/25 font-medium"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </motion.button>
            )}
          </div>
        </div>
      </motion.header>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
      
      {/* Enhanced animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            x: [0, 100, 0],
            y: [0, -50, 0],
            rotate: [0, 180, 360],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-purple-500/20 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ 
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1, 1.3, 1],
            rotate: [0, -180, -360]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-r from-cyan-500/20 via-teal-500/20 to-cyan-500/20 rounded-full blur-3xl"
        />
      </div>
      
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Enhanced Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="text-center mb-16 max-w-6xl mx-auto"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative inline-block mb-8"
          >
            <motion.h1 
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6 neon-text text-white"
              animate={{ 
                textShadow: [
                  "0 0 10px #a855f7, 0 0 20px #a855f7, 0 0 40px #a855f7",
                  "0 0 20px #3b82f6, 0 0 40px #3b82f6, 0 0 80px #3b82f6",
                  "0 0 10px #10b981, 0 0 20px #10b981, 0 0 40px #10b981",
                  "0 0 10px #a855f7, 0 0 20px #a855f7, 0 0 40px #a855f7"
                ]
              }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              Graph Game Hub
            </motion.h1>
            
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.2, 1]
              }}
              transition={{ 
                rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }}
              className="absolute -top-4 -right-4 w-8 h-8 text-yellow-400"
            >
              <Sparkles />
            </motion.div>
          </motion.div>
          
          <motion.p 
            className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto mb-12 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 1 }}
          >
            Master{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 font-semibold">
              graph algorithms
            </span>{' '}
            through interactive gameplay and hands-on challenges
          </motion.p>

          {/* Stats Section */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
          >
            {[
              { number: games.length.toString(), label: "Interactive Games", color: "from-purple-500 to-blue-500", icon: <Brain className="w-5 h-5" /> },
              { number: "∞", label: "Learning Paths", color: "from-cyan-500 to-teal-500", icon: <Route className="w-5 h-5" /> },
              { number: "100%", label: "Hands-On", color: "from-green-500 to-emerald-500", icon: <Gamepad2 className="w-5 h-5" /> },
              { number: "24/7", label: "Available", color: "from-orange-500 to-red-500", icon: <Zap className="w-5 h-5" /> }
            ].map((stat, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05, y: -5 }}
                className="glass-card p-6 text-center border border-white/20 group"
              >
                <div className="flex items-center justify-center mb-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color} text-white`}>
                    {stat.icon}
                  </div>
                </div>
                <div className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform`}>
                  {stat.number}
                </div>
                <div className="text-gray-300 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Enhanced Games Grid */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="max-w-7xl mx-auto mb-16"
        >
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white neon-text mb-4">
              Choose Your Challenge
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Interactive games that teach graph theory through hands-on gameplay
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {games.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.7 + index * 0.05, duration: 0.5 }}
                whileHover={{ y: -8 }}
                className="h-full"
              >
                <Link href={`/games/${game.id}`} className="block h-full">
                  <GameCard 
                    glowColor={game.color as any}
                    className="h-full group relative overflow-hidden transition-all duration-500 hover:scale-105 border border-white/10 hover:border-white/30 cursor-pointer"
                  >
                    {/* Animated background gradient */}
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                    />
                    
                    <div className="relative p-6">
                      {/* Icon */}
                      <div className="flex items-center justify-center mb-4">
                        <motion.div 
                          className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${game.gradient} text-white shadow-lg group-hover:shadow-2xl transition-all duration-500`}
                          whileHover={{ 
                            rotate: 360,
                            scale: 1.1
                          }}
                          transition={{ 
                            rotate: { duration: 0.6 },
                            scale: { duration: 0.3 }
                          }}
                        >
                          {game.icon}
                        </motion.div>
                      </div>
                      
                      <h3 className="text-xl font-bold text-white mb-3 text-center group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-300 group-hover:to-cyan-300 transition-all duration-300">
                        {game.title}
                      </h3>
                      
                      <p className="text-gray-300 text-sm leading-relaxed text-center group-hover:text-gray-200 transition-colors duration-300">
                        {game.description}
                      </p>

                      {/* Play indicator */}
                      <div className="flex items-center justify-center mt-4">
                        <motion.div
                          className="flex items-center gap-2 text-purple-400 group-hover:text-cyan-400 transition-colors duration-300"
                          whileHover={{ scale: 1.05 }}
                        >
                          <Play className="w-4 h-4" />
                          <span className="text-sm font-medium">Play Now</span>
                        </motion.div>
                      </div>
                      
                      {/* Hover overlay */}
                      <motion.div
                        className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-white/20 transition-all duration-300"
                        initial={false}
                      />
                    </div>
                  </GameCard>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Features Section */}
        <motion.div 
          className="max-w-6xl mx-auto mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 0.8 }}
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white neon-text mb-4">
              Why Learn Through Games?
            </h2>
            <p className="text-gray-300 text-lg">
              Interactive learning makes complex algorithms intuitive and memorable
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Network className="w-8 h-8" />,
                title: "Hands-On Learning",
                description: "Learn by doing - interact directly with algorithms and see results instantly",
                color: "from-blue-500 to-cyan-500"
              },
              {
                icon: <Brain className="w-8 h-8" />,
                title: "Visual Understanding",
                description: "See how algorithms work step-by-step with beautiful visualizations",
                color: "from-purple-500 to-pink-500"
              },
              {
                icon: <Trophy className="w-8 h-8" />,
                title: "Progressive Mastery",
                description: "Build skills gradually with increasing challenges and complexity",
                color: "from-green-500 to-emerald-500"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                whileHover={{ y: -5, scale: 1.02 }}
                className="glass-card p-6 text-center border border-white/20 group"
              >
                <div className="flex items-center justify-center mb-4">
                  <div className={`p-3 rounded-2xl bg-gradient-to-r ${feature.color} text-white group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-300 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Footer CTA */}
        <motion.div 
          className="text-center max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2, duration: 1 }}
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="glass-card p-8 border border-white/20"
          >
            <h3 className="text-3xl font-bold text-white mb-4 neon-text">Ready to Start Playing?</h3>
            <p className="text-gray-300 mb-8 text-lg leading-relaxed">
              Jump into any game and start learning graph algorithms through interactive challenges
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/games/graph-traversal">
                <GameButton
                  variant="primary"
                  size="lg"
                  icon={<Play className="w-5 h-5" />}
                >
                  Start Playing
                </GameButton>
              </Link>
              <Link href="/games/graph-builder">
                <GameButton
                  variant="secondary"
                  size="lg"
                  icon={<Eye className="w-5 h-5" />}
                >
                  Explore Builder
                </GameButton>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';
import GameButton from '@/components/ui/GameButton';
import GameHUD, { gameMetrics } from '@/components/ui/GameHUD';

interface GameLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
  score?: number;
  level?: number;
  time?: number;
  onExit?: () => void;
}

export default function GameLayout({ 
  children, 
  title, 
  description, 
  score = 0, 
  level = 1, 
  time,
  onExit
}: GameLayoutProps) {
  return (
    <div className="min-h-screen animated-bg relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl float"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-green-500/10 rounded-full blur-3xl float" style={{ animationDelay: '4s' }}></div>
      </div>
      
      <div className="relative z-10">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-50 bg-black/60 backdrop-blur-lg border-b border-white/10 shadow-lg"
        >
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/">
                  <GameButton
                    variant="secondary"
                    size="sm"
                    icon={<ArrowLeft className="w-4 h-4" />}
                    className="btn-hover"
                  >
                    Back
                  </GameButton>
                </Link>
                
                <div>
                  <h1 className="text-2xl font-bold text-white">{title}</h1>
                  <p className="text-gray-300 text-sm">{description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Game Metrics */}
                <GameHUD
                  metrics={[
                    gameMetrics.score(score),
                    gameMetrics.level(level),
                    ...(time !== undefined && time > 0 ? [gameMetrics.time(time)] : [])
                  ]}
                  compact={true}
                />
              </div>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="relative pb-20">
          {children}
        </main>

        {/* Footer Navigation */}
        <motion.footer 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-black/60 backdrop-blur-lg border-t border-white/10 shadow-lg"
        >
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <Link href="/">
                <GameButton
                  variant="secondary"
                  size="sm"
                  icon={<Home className="w-4 h-4" />}
                  className="btn-hover"
                >
                  Game Hub
                </GameButton>
              </Link>
              
              <div className="text-sm text-gray-400">
                Use graph theory to solve challenges and master algorithms
              </div>
            </div>
          </div>
        </motion.footer>
      </div>
    </div>
  );
}
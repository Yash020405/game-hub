'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { Timer, Target, Zap, Brain, Star, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GameMetric {
  label: string;
  value: string | number;
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'cyan';
  trend?: 'up' | 'down' | 'stable';
  description?: string;
}

interface GameHUDProps {
  metrics: GameMetric[];
  title?: string;
  subtitle?: string;
  className?: string;
  compact?: boolean;
}

const colorStyles = {
  blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  green: 'text-green-400 bg-green-500/10 border-green-500/30',
  purple: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  orange: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  red: 'text-red-400 bg-red-500/10 border-red-500/30',
  cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
};

const trendIcons = {
  up: <TrendingUp className="w-3 h-3 text-green-400" />,
  down: <TrendingUp className="w-3 h-3 text-red-400 rotate-180" />,
  stable: <div className="w-3 h-0.5 bg-gray-400 rounded" />
};

export default function GameHUD({
  metrics,
  title,
  subtitle,
  className,
  compact = false
}: GameHUDProps) {
  return (
    <motion.div
      className={cn(
        'bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl p-4',
        'shadow-lg shadow-black/20',
        className
      )}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h2 className="text-xl font-bold text-white neon-text">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-sm text-gray-300 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Metrics Grid */}
      <div className={cn(
        'grid gap-3',
        compact 
          ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-6'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      )}>
        {metrics.map((metric, index) => (
          <motion.div
            key={index}
            className={cn(
              'relative overflow-hidden rounded-xl border p-3',
              'transition-all duration-300 hover:scale-105',
              colorStyles[metric.color || 'blue']
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
          >
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative z-10">
              {/* Icon and Trend */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {metric.icon && (
                    <div className="text-current">
                      {metric.icon}
                    </div>
                  )}
                  {metric.trend && trendIcons[metric.trend]}
                </div>
              </div>

              {/* Value */}
              <div className={cn(
                'font-bold text-current',
                compact ? 'text-lg' : 'text-2xl'
              )}>
                {metric.value}
              </div>

              {/* Label */}
              <div className={cn(
                'text-current/70 font-medium',
                compact ? 'text-xs' : 'text-sm'
              )}>
                {metric.label}
              </div>

              {/* Description */}
              {metric.description && !compact && (
                <div className="text-xs text-current/50 mt-1">
                  {metric.description}
                </div>
              )}
            </div>

            {/* Animated border */}
            <div className="absolute inset-0 rounded-xl border border-current/20 opacity-0 hover:opacity-100 transition-opacity duration-300" />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// Predefined metric configurations for common game stats
export const gameMetrics = {
  score: (value: number): GameMetric => ({
    label: 'Score',
    value: value.toLocaleString(),
    icon: <Star className="w-4 h-4" />,
    color: 'green' as const,
    description: 'Total points earned'
  }),

  level: (value: number): GameMetric => ({
    label: 'Level',
    value,
    icon: <Target className="w-4 h-4" />,
    color: 'blue' as const,
    description: 'Current difficulty level'
  }),

  time: (seconds: number): GameMetric => ({
    label: 'Time',
    value: `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`,
    icon: <Timer className="w-4 h-4" />,
    color: seconds <= 30 ? 'red' : seconds <= 60 ? 'orange' : 'cyan',
    description: 'Time remaining'
  }),

  moves: (value: number): GameMetric => ({
    label: 'Moves',
    value,
    icon: <Zap className="w-4 h-4" />,
    color: 'purple' as const,
    description: 'Actions taken'
  }),

  efficiency: (value: number): GameMetric => ({
    label: 'Efficiency',
    value: `${value}%`,
    icon: <Brain className="w-4 h-4" />,
    color: value >= 80 ? 'green' : value >= 60 ? 'orange' : 'red',
    trend: value >= 80 ? 'up' : value >= 60 ? 'stable' : 'down',
    description: 'Solution optimality'
  })
};
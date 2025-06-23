'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GameCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'purple' | 'blue' | 'green' | 'orange' | 'red' | 'cyan';
  onClick?: () => void;
  disabled?: boolean;
}

const glowColors = {
  purple: 'glow-purple',
  blue: 'glow-blue',
  green: 'glow-green',
  orange: 'glow-orange',
  red: 'glow-red',
  cyan: 'glow-cyan'
};

export default function GameCard({ 
  children, 
  className, 
  glowColor = 'purple',
  onClick,
  disabled = false
}: GameCardProps) {
  return (
    <motion.div
      whileHover={{ 
        y: -4,
        transition: { duration: 0.15, ease: "easeOut" }
      }}
      whileTap={{ 
        scale: 0.99,
        transition: { duration: 0.1 }
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        'glass-card relative overflow-hidden cursor-pointer group',
        'border border-white/10 hover:border-white/20',
        'transition-all duration-300 ease-out',
        glowColors[glowColor],
        'hover:shadow-lg hover:shadow-purple-500/5',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Animated background gradient - very subtle */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/2 via-blue-500/2 to-cyan-500/2 opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
      
      {/* Content */}
      <div className="relative z-10 p-6">
        {children}
      </div>
    </motion.div>
  );
} 
'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface GameButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const variants = {
  primary: 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-purple-500/30',
  secondary: 'bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/30',
  success: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border-green-500/30',
  warning: 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white border-yellow-500/30',
  danger: 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white border-red-500/30'
};

const sizes = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg'
};

export default function GameButton({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  onClick,
  disabled = false,
  loading = false,
  className,
  type = 'button'
}: GameButtonProps) {
  return (
    <motion.button
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.15, ease: "easeOut" }
      }}
      whileTap={{ 
        scale: 0.98,
        transition: { duration: 0.1 }
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onClick={onClick}
      disabled={disabled || loading}
      type={type}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 font-medium rounded-xl',
        'border backdrop-blur-sm transition-all duration-300 ease-out',
        'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-black',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        'shadow-md hover:shadow-lg hover:shadow-purple-500/3',
        'neon-text',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {/* Very subtle background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/3 via-blue-500/3 to-cyan-500/3 opacity-0 hover:opacity-30 transition-opacity duration-300 rounded-xl" />
      
      {/* Loading spinner */}
      {loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Loader2 className="w-5 h-5 animate-spin text-white" />
        </motion.div>
      )}
      
      {/* Content */}
      <div className={cn(
        'relative z-10 flex items-center gap-2',
        loading && 'opacity-0'
      )}>
        {icon && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {icon}
          </motion.div>
        )}
        <span>{children}</span>
      </div>
    </motion.button>
  );
} 
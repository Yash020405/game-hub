// Game utilities for calculating scores and managing progress

export interface GameProgress {
  level: number;
  score: number;
  completed?: boolean;
  accuracy?: number;
  timeBonus?: number;
}

export const calculateLevelScore = (baseScore: number, level: number, accuracy?: number): number => {
  const levelMultiplier = 1 + (level - 1) * 0.1; // 10% increase per level
  const accuracyBonus = accuracy ? Math.floor(accuracy * 0.5) : 0; // Up to 50% bonus for perfect accuracy
  return Math.floor(baseScore * levelMultiplier) + accuracyBonus;
};

export const updateProgressOnLevelComplete = (progress: GameProgress): GameProgress => {
  return {
    ...progress,
    level: progress.level + 1,
    completed: true
  };
};

export const createDefaultProgress = (): GameProgress => {
  return {
    level: 1,
    score: 0,
    completed: false
  };
};

export const getScoreMultiplier = (level: number): number => {
  return Math.min(1 + (level - 1) * 0.2, 3); // Cap at 3x multiplier
};

export const calculateTimeBonus = (timeSpent: number, targetTime: number): number => {
  if (timeSpent <= targetTime) {
    const ratio = timeSpent / targetTime;
    return Math.floor((1 - ratio) * 100); // Up to 100 points for being fast
  }
  return 0;
}; 
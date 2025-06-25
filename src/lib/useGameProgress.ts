'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { saveGameProgress, getUserProgress } from './supabase'

export interface GameProgressData {
  level: number
  score: number
  completed: boolean
  timeSpent?: number
  moves?: number
  accuracy?: number
}

export function useGameProgress(gameName: string) {
  const { user } = useAuth()
  const [progress, setProgress] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [currentScore, setCurrentScore] = useState(0)
  const [sessionInitialized, setSessionInitialized] = useState(false)

  // Initialize progress when user changes or game starts
  useEffect(() => {
    if (user && !sessionInitialized) {
      loadProgress()
    } else if (!user && !sessionInitialized) {
      // Initialize for guest user
      console.log('Initializing guest session')
      setProgress({ level: 1, high_score: 0, score: 0 })
      setCurrentScore(0)
      setSessionInitialized(true)
    } else if (!user && sessionInitialized) {
      // Reset for guest when switching from authenticated to guest
      setProgress({ level: 1, high_score: 0, score: 0 })
      setCurrentScore(0)
    }
  }, [user, gameName])

  const loadProgress = useCallback(async () => {
    if (!user || loading) return

    setLoading(true)
    try {
      console.log(`Loading progress for ${gameName}:`, user.id)
      const { data } = await getUserProgress(user.id, gameName)
      
      if (data && data.length > 0) {
        console.log('Progress loaded:', data[0])
        setProgress(data[0])
        setCurrentScore(data[0].high_score || 0)
      } else {
        console.log('No existing progress found, starting fresh')
        setProgress({ level: 1, high_score: 0, score: 0 })
        setCurrentScore(0)
      }
      
      setSessionInitialized(true)
    } catch (error) {
      console.error('Failed to load progress:', error)
      setProgress({ level: 1, high_score: 0, score: 0 })
      setCurrentScore(0)
      setSessionInitialized(true)
    } finally {
      setLoading(false)
    }
  }, [user, gameName, loading])

  const saveProgress = useCallback(async (progressData: GameProgressData) => {
    console.log('Saving progress:', progressData)
    
    if (!user) {
      // Store locally for guests
      const guestProgress = {
        ...progressData,
        savedAt: Date.now(),
        level: progressData.level + 1 // Next level for guest
      }
      localStorage.setItem(`game_progress_${gameName}`, JSON.stringify(guestProgress))
      setProgress(guestProgress)
      setCurrentScore(progressData.score)
      return { success: true }
    }

    try {
      const result = await saveGameProgress(
        user.id,
        gameName,
        progressData.level,
        progressData.score
      )
      
      if (result.success) {
        console.log('Progress saved successfully')
        
        // Reload fresh progress from database to ensure consistency
        await loadProgress()
        
        // Update current session score
        setCurrentScore(prev => prev + progressData.score)
        
        return { success: true }
      } else {
        console.error('Failed to save progress:', result.error)
        return result
      }
    } catch (error) {
      console.error('Failed to save progress:', error)
      return { success: false, error }
    }
  }, [user, gameName, loadProgress])

  const getGuestProgress = useCallback(() => {
    if (user) return null
    
    const stored = localStorage.getItem(`game_progress_${gameName}`)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return null
      }
    }
    return null
  }, [user, gameName])

  const getBestScore = useCallback(() => {
    if (user && progress) {
      return progress.high_score || 0
    }
    
    const guestProgress = getGuestProgress()
    return guestProgress?.score || 0
  }, [user, progress, getGuestProgress])

  const getCurrentLevel = useCallback(() => {
    if (user && progress) {
      return progress.level || 1
    }
    
    const guestProgress = getGuestProgress()
    return guestProgress?.level || 1
  }, [user, progress, getGuestProgress])

  const getCurrentScore = useCallback(() => {
    return currentScore
  }, [currentScore])

  const initializeGame = useCallback(() => {
    console.log('Initializing game with progress:', progress)
    
    // Always return current state for consistency
    if (user && progress) {
      return {
        level: progress.level || 1,
        score: currentScore,
        highScore: progress.high_score || 0
      }
    }
    
    const guestProgress = getGuestProgress()
    if (guestProgress) {
      return {
        level: guestProgress.level || 1,
        score: guestProgress.score || 0,
        highScore: guestProgress.score || 0
      }
    }

    return {
      level: 1,
      score: 0,
      highScore: 0
    }
  }, [user, progress, currentScore, getGuestProgress])

  return {
    progress,
    loading,
    saveProgress,
    getBestScore,
    getCurrentLevel,
    getCurrentScore,
    getGuestProgress,
    initializeGame,
    isAuthenticated: !!user,
    sessionInitialized
  }
} 
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface GameProgress {
  id: string
  user_id: string
  game_name: string
  level: number
  score: number
  high_score: number
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  email: string
  username?: string
  total_score: number
  games_completed: number
  created_at: string
  updated_at: string
}

// Helper functions
export const saveGameProgress = async (
  userId: string,
  gameName: string,
  level: number,
  score: number
) => {
  try {
    console.log(`Saving progress for ${gameName}: Level ${level}, Score ${score}`)
    
    // Get existing progress
    const { data: existing } = await supabase
      .from('game_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('game_name', gameName)
      .single()

    console.log('Existing progress:', existing)

    let newLevel, newHighScore, totalSessionScore

    if (existing) {
      // Calculate new values based on existing progress
      newHighScore = Math.max(existing.high_score, score)
      totalSessionScore = existing.score + score
      
      // Only advance level if current level is completed
      if (level >= existing.level) {
        newLevel = level + 1 // Unlock next level
      } else {
        newLevel = existing.level // Keep current unlock level
      }
    } else {
      // First time playing this game
      newHighScore = score
      totalSessionScore = score
      newLevel = level + 1 // Unlock level 2 after completing level 1
    }

    const progressData = {
      user_id: userId,
      game_name: gameName,
      level: newLevel, // Next available level
      score: totalSessionScore, // Cumulative score for this game
      high_score: newHighScore, // Best single-level score
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('Saving data:', progressData)

    if (existing) {
      const { error } = await supabase
        .from('game_progress')
        .update(progressData)
        .eq('id', existing.id)
      
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('game_progress')
        .insert({ ...progressData, created_at: new Date().toISOString() })
      
      if (error) throw error
    }

    // Update user profile total score
    await updateUserTotalScore(userId)
    
    console.log('Progress saved successfully')
    return { success: true }
  } catch (error) {
    console.error('Error saving game progress:', error)
    return { success: false, error }
  }
}

export const getUserProgress = async (userId: string, gameName?: string) => {
  try {
    let query = supabase
      .from('game_progress')
      .select('*')
      .eq('user_id', userId)

    if (gameName) {
      query = query.eq('game_name', gameName)
    }

    const { data, error } = await query.order('updated_at', { ascending: false })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching user progress:', error)
    return { data: null, error }
  }
}

export const updateUserTotalScore = async (userId: string) => {
  try {
    // Calculate total score from all games
    const { data: progress } = await supabase
      .from('game_progress')
      .select('high_score')
      .eq('user_id', userId)

    const totalScore = progress?.reduce((sum, game) => sum + game.high_score, 0) || 0
    const gamesCompleted = progress?.length || 0

    // Update user profile
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        total_score: totalScore,
        games_completed: gamesCompleted,
        updated_at: new Date().toISOString()
      })

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error updating user total score:', error)
    return { success: false, error }
  }
}

export const getLeaderboard = async (gameName?: string, limit = 10) => {
  try {
    if (gameName) {
      // Game-specific leaderboard
      const { data, error } = await supabase
        .from('game_progress')
        .select(`
          high_score,
          level,
          user_profiles (username, email)
        `)
        .eq('game_name', gameName)
        .order('high_score', { ascending: false })
        .limit(limit)

      if (error) throw error
      return { data, error: null }
    } else {
      // Overall leaderboard
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username, email, total_score, games_completed')
        .order('total_score', { ascending: false })
        .limit(limit)

      if (error) throw error
      return { data, error: null }
    }
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return { data: null, error }
  }
} 
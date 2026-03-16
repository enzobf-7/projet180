// ─── Dashboard Types ─────────────────────────────────────────────────────────

export interface Habit {
  id: string
  name: string
  category: 'habit' | 'mission'
  description?: string
  progress_percent?: number
  xp_reward?: number
  period?: string
}

export interface Gamification {
  xp_total: number
  current_streak: number
  longest_streak: number
  level: number
}

export interface LeaderboardEntry {
  rank: number
  clientId: string
  firstName: string
  xp: number
  streak: number
  level: number
  isMe: boolean
}

export interface DashboardProps {
  jourX: number
  firstName: string
  gamification: Gamification
  habits: Habit[]
  completedHabitIds: string[]
  responses: Record<string, unknown>
  leaderboard: LeaderboardEntry[]
  onboardingDate: string | null
  whatsappLink: string | null
  robinWhatsapp: string | null
  weeklyXP: number
  initialTodos: Todo[]
  initialWins: Win[]
  initialPersonalTodos: PersonalTodo[]
  weekNumber: number
}

export interface XPParticle {
  id: number
  delta: number
  multiplier: number
}

export interface Todo {
  id: string
  title: string
  is_system: boolean
  completed_date: string | null
  day_of_week: number | null
}

export interface PersonalTodo {
  id: string
  title: string
  target_date: string
  completed: boolean
}

export interface Win {
  id: string
  content: string
  created_at: string
}

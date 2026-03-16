'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getXpDelta } from './utils'
import { getLevelByXp, getLevelName } from '@/lib/levels'

export type ToggleResult = {
  xpDelta:      number   // XP réellement gagné/perdu (inclut parfois le bonus perfect day)
  perfectDay:   boolean  // true si toutes les habitudes sont cochées après cette action
  leveledUp:    boolean  // true si le nouveau niveau est supérieur à l'ancien
  newLevel:     string   // nom du nouveau niveau
  newXP:        number   // xp_total après la mise à jour
  newStreak:    number   // streak après mise à jour
  multiplier:   number   // 1 / 1.5 / 2 / 3 — affiché dans la particule
}

export async function toggleHabitAction(
  habitId: string,
  completing: boolean,
  totalHabits: number,
): Promise<ToggleResult | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin   = createAdminClient()
  const today   = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  // ── 1. Écrire dans habit_logs ─────────────────────────────────────────────
  if (completing) {
    await admin.from('habit_logs').upsert(
      { client_id: user.id, habit_id: habitId, date: today, completed: true },
      { onConflict: 'habit_id,date' },
    )
  } else {
    await admin.from('habit_logs').delete()
      .eq('client_id', user.id).eq('habit_id', habitId).eq('date', today)
  }

  // ── 2. Lire la gamification actuelle ─────────────────────────────────────
  const { data: gam } = await admin
    .from('gamification')
    .select('xp_total, current_streak, longest_streak, level')
    .eq('client_id', user.id)
    .single()

  const currentXP     = gam?.xp_total        ?? 0
  const currentStreak = gam?.current_streak   ?? 0
  const longestStreak = gam?.longest_streak   ?? 0
  const currentLevel  = gam?.level            ?? 1

  // ── 3. Calcul du nouveau streak ───────────────────────────────────────────
  // Vérifie si au moins une habitude a été cochée hier (pour maintenir le streak)
  const { count: yesterdayCount } = await admin
    .from('habit_logs')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', user.id)
    .eq('completed', true)
    .eq('date', yesterday)

  // Compte les habitudes cochées aujourd'hui (après l'action)
  const { count: todayCount } = await admin
    .from('habit_logs')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', user.id)
    .eq('completed', true)
    .eq('date', today)

  const todayDone = (todayCount ?? 0)

  // Le streak ne monte que si la veille était active OU si c'est le début
  let newStreak = currentStreak
  if (completing) {
    if (currentStreak === 0) {
      // Premier check-in : streak passe à 1
      newStreak = 1
    } else if ((yesterdayCount ?? 0) > 0 || currentStreak > 0) {
      // On était actif hier → le streak continue (ou reste le même si on recheck aujourd'hui)
      // Ne monte que si on était à 0 aujourd'hui (premier check-in du jour)
      if (todayDone === 1) newStreak = currentStreak + 1
    }
  } else {
    // Décochage : si plus aucune habitude cochée aujourd'hui, on retire 1
    if (todayDone === 0) {
      newStreak = Math.max(0, currentStreak - 1)
    }
  }

  // ── 4. Calcul XP ─────────────────────────────────────────────────────────
  const multiplier = completing ? (newStreak >= 30 ? 3 : newStreak >= 14 ? 2 : newStreak >= 7 ? 1.5 : 1) : 1
  const baseXP     = completing ? getXpDelta(newStreak) : -10 // on retire toujours 10 au décocochage

  // Perfect day bonus : +50 XP si toutes les habitudes sont cochées
  const perfectDay = totalHabits > 0 && todayDone >= totalHabits
  const bonusXP    = (completing && perfectDay) ? 50 : 0
  const xpDelta    = baseXP + bonusXP

  const newXP        = Math.max(0, currentXP + xpDelta)
  const newLongest   = Math.max(longestStreak, newStreak)

  // ── 5. Calcul du niveau ───────────────────────────────────────────────────
  const newLevelIdx  = getLevelByXp(newXP)
  const newLevelName = getLevelName(newXP)
  const leveledUp    = completing && newLevelIdx > currentLevel

  // ── 6. Persister dans gamification ───────────────────────────────────────
  await admin.from('gamification').upsert(
    {
      client_id:      user.id,
      xp_total:       newXP,
      current_streak: newStreak,
      longest_streak: newLongest,
      level:          newLevelIdx,
    },
    { onConflict: 'client_id' },
  )

  revalidatePath('/dashboard')

  return {
    xpDelta,
    perfectDay,
    leveledUp,
    newLevel:   newLevelName,
    newXP,
    newStreak,
    multiplier,
  }
}

'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toggleHabitAction } from './actions'
import { getXpDelta } from './utils'
import { C, D, M } from '@/lib/design-tokens'
import type { DashboardProps, XPParticle, Win, PersonalTodo } from '@/lib/types'
import { useIsMobile } from '@/lib/hooks'
import { getCurrentLevel, getLevelProgress, getNextLevel, getLevelByXp } from '@/lib/levels'
import {
  DashboardAnimations,
  XPParticles,
  LevelUpOverlay,
  TopBar,
  HeroCard,
  DailyCard,
  ProgressionPanel,
  WinsCard,
  WelcomeOverlay,
} from './components'

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardClient({
  jourX, firstName, gamification, habits, completedHabitIds, responses,
  leaderboard, onboardingDate, whatsappLink, robinWhatsapp, weeklyXP,
  initialTodos, initialWins, initialPersonalTodos, weekNumber,
}: DashboardProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [completed, setCompleted] = useState<Set<string>>(new Set(completedHabitIds))
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [localXP, setLocalXP] = useState(gamification.xp_total)
  const [localStreak, setLocalStreak] = useState(gamification.current_streak)
  const [levelUpOverlay, setLevelUpOverlay] = useState<string | null>(null)
  const [particles, setParticles] = useState<XPParticle[]>([])
  const particleId = useRef(0)
  const [celebrateRing, setCelebrateRing] = useState(false)
  const [displayedLevelPct, setDisplayedLevelPct] = useState(0)
  const isMobile = useIsMobile()
  const supabase = createClient()

  // ── Wins (only shown on Sundays) ────────────────────────────────────────────
  const [wins, setWins] = useState<Win[]>(initialWins)
  const [winInput, setWinInput] = useState('')
  const [winSubmitting, setWinSubmitting] = useState(false)
  const isSunday = new Date().getDay() === 0

  const handleAddWin = async () => {
    const text = winInput.trim()
    if (!text || winSubmitting) return
    setWinSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setWinSubmitting(false); return }
    const { data, error } = await supabase
      .from('wins')
      .insert({ client_id: user.id, content: text, week_number: weekNumber })
      .select('id, content, created_at')
      .single()
    if (!error && data) {
      setWins(prev => [...prev, data])
      setWinInput('')
    }
    setWinSubmitting(false)
  }

  // ── To-do du jour ───────────────────────────────────────────────────────────
  const todayDate = new Date().toISOString().slice(0, 10)
  const todayDayOfWeek = new Date().getDay()
  const [todos, setTodos] = useState(initialTodos)

  // Filter todos by day_of_week (null = daily, 0 = Sunday, etc.)
  const todayTodos = todos.filter(t =>
    t.day_of_week === null || t.day_of_week === todayDayOfWeek
  )

  const handleToggleTodo = async (todoId: string, currentDate: string | null) => {
    const newDate = currentDate === todayDate ? null : todayDate
    setTodos(prev => prev.map(t => t.id === todoId ? { ...t, completed_date: newDate } : t))
    await supabase.from('todos').update({ completed_date: newDate }).eq('id', todoId)
  }

  // ── Personal todos ─────────────────────────────────────────────────────────
  const [personalTodos, setPersonalTodos] = useState<PersonalTodo[]>(initialPersonalTodos)

  const handleTogglePersonalTodo = async (id: string, completed: boolean) => {
    setPersonalTodos(prev => prev.map(p => p.id === id ? { ...p, completed } : p))
    await supabase.from('personal_todos').update({ completed }).eq('id', id)
  }

  const handleAddPersonalTodos = async (titles: string[]) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const rows = titles.map(title => ({
      client_id: user.id,
      title,
      target_date: tomorrow,
    }))
    const { data } = await supabase.from('personal_todos').insert(rows).select('id, title, target_date, completed')
    if (data) {
      // These will appear tomorrow — don't add to today's list
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const handleToggle = (habitId: string) => {
    if (loadingId) return
    const wasCompleted = completed.has(habitId)
    const optimisticDelta = wasCompleted ? -10 : getXpDelta(localStreak)
    setCompleted(prev => {
      const next = new Set(prev)
      wasCompleted ? next.delete(habitId) : next.add(habitId)
      return next
    })
    setLocalXP(prev => Math.max(0, prev + optimisticDelta))
    const pid = ++particleId.current
    setParticles(p => [...p, { id: pid, delta: optimisticDelta, multiplier: 1 }])
    setTimeout(() => setParticles(p => p.filter(x => x.id !== pid)), 1500)
    setLoadingId(habitId)
    startTransition(async () => {
      try {
        const result = await toggleHabitAction(habitId, !wasCompleted, habits.filter(h => h.category === 'habit').length)
        if (result) {
          setLocalXP(result.newXP)
          setLocalStreak(result.newStreak)
          const accuratePid = ++particleId.current
          setParticles(p => [
            ...p.filter(x => x.id !== pid),
            { id: accuratePid, delta: result.xpDelta, multiplier: result.multiplier },
          ])
          setTimeout(() => setParticles(p => p.filter(x => x.id !== accuratePid)), 1500)
          if (result.leveledUp) {
            setLevelUpOverlay(result.newLevel)
            setTimeout(() => setLevelUpOverlay(null), 2800)
          }
        }
      } catch {
        setCompleted(prev => {
          const next = new Set(prev)
          wasCompleted ? next.add(habitId) : next.delete(habitId)
          return next
        })
        setLocalXP(prev => Math.max(0, prev - optimisticDelta))
      } finally {
        setLoadingId(null)
      }
    })
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const daysPct     = Math.round((jourX / 180) * 100)
  const daysLeft    = 180 - jourX
  const xp          = localXP
  const level       = getCurrentLevel(xp)
  const levelNum    = getLevelByXp(xp)
  const levelPct    = getLevelProgress(xp)
  const nextLevel   = getNextLevel(xp)
  const streak      = localStreak
  const record      = gamification.longest_streak
  const hotStreak   = streak >= 7
  const legendStreak = streak >= 30
  const myRank      = leaderboard.find(e => e.isMe)?.rank ?? null
  const maxXP       = leaderboard[0]?.xp || 1
  const visionText  = (responses?.vision as string) ?? null
  const objectifText = (responses?.objectif_principal as string) ?? null

  // ── All done computation ────────────────────────────────────────────────
  const habitsOnly = habits.filter(h => h.category === 'habit')
  const allHabitsDone = habitsOnly.length > 0 && habitsOnly.every(h => completed.has(h.id))
  const allTodosDone = todayTodos.length > 0 && todayTodos.every(t => t.completed_date === todayDate)
  const allPersonalDone = personalTodos.length === 0 || personalTodos.every(p => p.completed)
  const allDone = allHabitsDone && allTodosDone && allPersonalDone

  // ── WhatsApp message ────────────────────────────────────────────────────
  const checkedItems = [
    ...habitsOnly.filter(h => completed.has(h.id)).map(h => h.name),
    ...todayTodos.filter(t => t.completed_date === todayDate).map(t => t.title),
    ...personalTodos.filter(p => p.completed).map(p => p.title),
  ]
  const whatsappMessage = `Jour ${jourX}/180 — To-do 100% done! ✅\n${checkedItems.map(t => `• ${t}`).join('\n')}\n— Streak ${streak}j 🔥`

  // ── Missions (category='mission') ───────────────────────────────────────
  const missions = habits.filter(h => h.category === 'mission')

  // ── Badges (with progress tracking) ─────────────────────────────────────
  const BADGES: { key: string; label: string; icon: string; earned: boolean; desc: string; target: number; current: number; unit: string }[] = [
    { key: 'first_step',   label: 'Premier pas',      icon: '⚡', earned: xp >= 10,      desc: 'Premier XP gagné',      target: 10,    current: Math.min(xp, 10),     unit: 'XP' },
    { key: 'week_fire',    label: 'Semaine de feu',    icon: '🔥', earned: streak >= 7,    desc: '7 jours de série',      target: 7,     current: Math.min(streak, 7),   unit: 'j' },
    { key: 'fortnight',    label: 'Quinzaine',         icon: '⚔',  earned: streak >= 14,   desc: '14 jours de série',     target: 14,    current: Math.min(streak, 14),  unit: 'j' },
    { key: 'month_king',   label: 'Mois entier',       icon: '👑', earned: record >= 30,   desc: '30 jours de série',     target: 30,    current: Math.min(record, 30),  unit: 'j' },
    { key: 'eveille',      label: "L'Éveillé",         icon: '🛡',  earned: xp >= 500,      desc: 'Atteindre le niveau 2',  target: 500,   current: Math.min(xp, 500),     unit: 'XP' },
    { key: 'batisseur',    label: 'Le Bâtisseur',      icon: '⚔',  earned: xp >= 1500,     desc: 'Atteindre le niveau 3',  target: 1500,  current: Math.min(xp, 1500),    unit: 'XP' },
    { key: 'souverain',    label: 'Le Souverain',      icon: '💎', earned: xp >= 3000,     desc: 'Atteindre le niveau 4',  target: 3000,  current: Math.min(xp, 3000),    unit: 'XP' },
    { key: 'bascule',      label: 'Le Point de Bascule', icon: '🏆', earned: xp >= 6000,   desc: 'Atteindre le niveau 5',  target: 6000,  current: Math.min(xp, 6000),    unit: 'XP' },
  ]
  const earnedCount = BADGES.filter(b => b.earned).length

  const navItems = [
    { label: 'Dashboard',  href: '/dashboard',  active: true  },
    { label: 'Programme',  href: '/programme',  active: false },
    { label: 'Classement', href: '/classement', active: false },
    { label: 'Profil',     href: '/profil',     active: false },
  ]


  // ── Effects ───────────────────────────────────────────────────────────────
  const isFirstRun    = useRef(true)
  const prevAllDoneRef = useRef(false)
  const hasMounted    = useRef(false)

  useEffect(() => {
    if (isFirstRun.current) { isFirstRun.current = false; prevAllDoneRef.current = allDone; return }
    if (allDone && !prevAllDoneRef.current) {
      setCelebrateRing(true)
      setTimeout(() => setCelebrateRing(false), 600)
    }
    prevAllDoneRef.current = allDone
  }, [allDone])

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setDisplayedLevelPct(levelPct))
      })
    } else {
      setDisplayedLevelPct(levelPct)
    }
  }, [levelPct])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, overflowX: 'hidden' }}>
      <DashboardAnimations />
      <XPParticles particles={particles} isMobile={isMobile} />
      {levelUpOverlay && <LevelUpOverlay levelName={levelUpOverlay} />}
      <WelcomeOverlay />

      <TopBar
        jourX={jourX}
        daysLeft={daysLeft}
        daysPct={daysPct}
        firstName={firstName}
        navItems={navItems}
        onSignOut={handleSignOut}
      />

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column' as const,
      }}>
        <div style={{
          flex: 1,
          padding: isMobile ? '20px 16px 40px' : '28px 32px 48px',
          maxWidth: 1120,
          width: '100%',
          margin: '0 auto',
        }}>
          {/* Gamification stats — 4 inline */}
          <HeroCard
            xp={xp}
            levelNum={levelNum}
            level={level}
            nextLevel={nextLevel}
            displayedLevelPct={displayedLevelPct}
            weeklyXP={weeklyXP}
            streak={streak}
            record={record}
            hotStreak={hotStreak}
            myRank={myRank}
            isMobile={isMobile}
          />

          {/* Two-column: DailyCard + Progression */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 380px', gap: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <DailyCard
                habits={habits}
                completed={completed}
                loadingId={loadingId}
                firstName={firstName}
                isMobile={isMobile}
                celebrateRing={celebrateRing}
                onToggle={handleToggle}
                todos={todayTodos}
                todayDate={todayDate}
                onToggleTodo={handleToggleTodo}
                personalTodos={personalTodos}
                onTogglePersonalTodo={handleTogglePersonalTodo}
                onAddPersonalTodos={handleAddPersonalTodos}
                allDone={allDone}
                whatsappLink={whatsappLink}
                whatsappMessage={whatsappMessage}
                jourX={jourX}
              />

              {/* Missions en cours */}
              {missions.length > 0 && (
                <div className="p180-fade p180-card" style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  padding: '18px 20px',
                }}>
                  <div style={{ ...D, fontWeight: 800, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: C.text, marginBottom: 14 }}>
                    Missions en cours
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {missions.map(m => {
                      const pct = m.progress_percent ?? 0
                      const isDone = pct >= 100
                      return (
                        <div key={m.id} style={{
                          padding: '14px 16px',
                          background: C.bg,
                          border: `1px solid ${isDone ? C.green + '40' : C.border}`,
                          borderRadius: 10,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ ...D, fontWeight: 700, fontSize: '14px', letterSpacing: '0.04em', color: C.text, textTransform: 'uppercase' as const }}>
                              {m.name}
                            </span>
                            <span style={{
                              ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.15em',
                              color: isDone ? C.greenL : C.accent,
                              border: `1px solid ${isDone ? C.greenL + '40' : C.accent + '40'}`,
                              padding: '2px 8px', borderRadius: 4,
                              textTransform: 'uppercase' as const,
                            }}>
                              {isDone ? '✓ Terminée' : 'En cours'}
                            </span>
                          </div>
                          {m.description && (
                            <div style={{ ...D, fontSize: '12px', color: C.muted, marginBottom: 8, lineHeight: 1.4 }}>
                              {m.description}
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {m.period && (
                              <span style={{ ...M, fontSize: '10px', color: C.muted }}>{m.period}</span>
                            )}
                            <div style={{ flex: 1, height: 4, background: C.dimmed, borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${Math.min(pct, 100)}%`,
                                background: isDone ? C.greenL : C.accent,
                                borderRadius: 2,
                                transition: 'width 0.6s',
                              }} />
                            </div>
                            <span style={{ ...M, fontSize: '10px', color: isDone ? C.greenL : C.text, fontWeight: 700 }}>
                              {pct}%
                            </span>
                            {m.xp_reward && (
                              <span style={{ ...M, fontSize: '9px', color: C.accent }}>
                                +{m.xp_reward} XP
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <ProgressionPanel
                streak={streak}
                hotStreak={hotStreak}
                legendStreak={legendStreak}
                badges={BADGES}
                earnedCount={earnedCount}
                objectifText={objectifText}
                visionText={visionText}
                whatsappLink={null}
              />

            </div>
          </div>

          {/* Wins — Sunday only */}
          {isSunday && (
            <div style={{ marginTop: 20 }}>
              <WinsCard
                wins={wins}
                weekNumber={weekNumber}
                winInput={winInput}
                winSubmitting={winSubmitting}
                onWinInputChange={setWinInput}
                onAddWin={handleAddWin}
              />
            </div>
          )}

          {/* Écrire à Robin — WhatsApp DM */}
          {robinWhatsapp && (
            <a href={`https://wa.me/${robinWhatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: `${C.green}18`,
              border: `1px solid ${C.green}40`,
              borderRadius: 14,
              padding: '14px 20px',
              textDecoration: 'none',
              transition: 'background 0.2s',
              marginTop: 20,
            }}>
              <span style={{ fontSize: '20px' }}>💬</span>
              <div>
                <div style={{ ...D, fontWeight: 700, fontSize: '13px', color: C.greenL, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
                  Écrire à Robin
                </div>
                <div style={{ ...M, fontSize: '10px', color: `${C.greenL}90`, marginTop: 1 }}>
                  WhatsApp direct
                </div>
              </div>
            </a>
          )}
        </div>
      </main>
    </div>
  )
}

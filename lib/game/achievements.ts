// ============================================================
// CELLIX v2.1 — Achievements & Run History System
// ============================================================

export interface Achievement {
  id: string
  title: string
  titleUz: string
  description: string
  descriptionUz: string
  badge: string
  icon?: string
  progress?: string
  unlocked: boolean
  unlockedAt?: string
}

export const ALL_ACHIEVEMENTS: Omit<Achievement, 'unlocked'>[] = [
  {
    id: 'first_blood',
    title: 'FIRST BLOOD',
    titleUz: 'BIRINCHI QON',
    description: 'Defeat your first enemy cell',
    descriptionUz: 'Birinchi dushman hujayrasini yo\'q qiling',
    badge: '🩸',
  },
  {
    id: 'boss_slayer',
    title: 'ANCIENT DESTROYER',
    titleUz: 'QADIMIY VAYRONAGOR',
    description: 'Defeat the Ancient Cell Boss',
    descriptionUz: 'Qadimiy Hujayra Bossini mag\'lub eting',
    badge: '👑',
  },
  {
    id: 'survivalist',
    title: 'SURVIVALIST',
    titleUz: 'TIRIK QOLUVCHI',
    description: 'Survive for more than 5 minutes',
    descriptionUz: '5 daqiqadan ko\'proq tirik qoling',
    badge: '⏱️',
  },
  {
    id: 'wave_master',
    title: 'WAVE MASTER',
    titleUz: 'TO\'LQIN USTASI',
    description: 'Clear all 10 waves in Survival Mode',
    descriptionUz: 'Survival rejimida barcha 10 to\'lqinni tozalang',
    badge: '🏆',
  },
  {
    id: 'combo_god',
    title: 'EVOLUTIONARY SYNERGY',
    titleUz: 'EVOLUTSION SINERGIYA',
    description: 'Form a mutation combo in a run',
    descriptionUz: 'Bitta run davomida mutatsiya kombosini yarating',
    badge: '⚡',
  },
  {
    id: 'level_20',
    title: 'APEX PATHOGEN',
    titleUz: 'APEX PATOGEN',
    description: 'Reach Level 20 in a single run',
    descriptionUz: 'Bitta run davomida 20-darajaga yeting',
    badge: '🧬',
  },
  {
    id: 'score_champion',
    title: 'SCORE CHAMPION',
    titleUz: 'REKORDCHI',
    description: 'Score over 50,000 points',
    descriptionUz: '50,000 dan yuqori ochko to\'plang',
    badge: '⭐',
  },
]

const STORAGE_KEY_ACHIEVEMENTS = 'cellix_achievements_v1'
const STORAGE_KEY_RUN_HISTORY = 'cellix_run_history_v1'

export interface RunHistoryRecord {
  id: string
  timestamp: string
  score: number
  level: number
  kills: number
  survivalTime: number
  gameMode: 'classic' | 'survival' | 'daily'
  isVictory?: boolean
  wave?: number
  damageDealt?: number
  damageTaken?: number
  criticalHits?: number
  bossDefeated?: boolean
  combosCount?: number
}

/**
 * Get all achievements status from localStorage.
 */
export function getAchievements(): Achievement[] {
  if (typeof window === 'undefined') {
    return ALL_ACHIEVEMENTS.map((a) => ({ ...a, unlocked: false }))
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_ACHIEVEMENTS)
    const unlockedMap: Record<string, string> = raw ? JSON.parse(raw) : {}

    return ALL_ACHIEVEMENTS.map((a) => ({
      ...a,
      unlocked: !!unlockedMap[a.id],
      unlockedAt: unlockedMap[a.id],
    }))
  } catch {
    return ALL_ACHIEVEMENTS.map((a) => ({ ...a, unlocked: false }))
  }
}

/**
 * Check and unlock achievements based on run metrics.
 * Returns array of newly unlocked achievements.
 */
export function checkRunAchievements(metrics: {
  score: number
  level: number
  kills: number
  survivalTime: number
  gameMode: 'classic' | 'survival' | 'daily'
  isVictory?: boolean
  combosCount?: number
  bossDefeated?: boolean
}): Achievement[] {
  if (typeof window === 'undefined') return []

  const current = getAchievements()
  const unlockedMap: Record<string, string> = {}
  current.forEach((a) => {
    if (a.unlocked && a.unlockedAt) unlockedMap[a.id] = a.unlockedAt
  })

  const newlyUnlocked: Achievement[] = []

  const unlock = (id: string) => {
    if (!unlockedMap[id]) {
      const now = new Date().toISOString()
      unlockedMap[id] = now
      const match = current.find((a) => a.id === id)
      if (match) {
        newlyUnlocked.push({ ...match, unlocked: true, unlockedAt: now })
      }
    }
  }

  if (metrics.kills > 0) unlock('first_blood')
  if (metrics.survivalTime >= 300) unlock('survivalist')
  if (metrics.level >= 20) unlock('level_20')
  if (metrics.score >= 50000) unlock('score_champion')
  if (metrics.bossDefeated) unlock('boss_slayer')
  if (metrics.gameMode === 'survival' && metrics.isVictory) unlock('wave_master')
  if ((metrics.combosCount ?? 0) > 0) unlock('combo_god')

  try {
    window.localStorage.setItem(STORAGE_KEY_ACHIEVEMENTS, JSON.stringify(unlockedMap))
  } catch {
    // ignore
  }

  return newlyUnlocked
}

/**
 * Save a completed run into run history.
 */
export function saveRunHistory(run: Omit<RunHistoryRecord, 'id' | 'timestamp'>) {
  if (typeof window === 'undefined') return

  try {
    const history = getRunHistory()
    const newRecord: RunHistoryRecord = {
      ...run,
      id: `run_${Date.now()}`,
      timestamp: new Date().toISOString(),
    }

    history.unshift(newRecord)
    // Keep max 20 latest runs
    const trimmed = history.slice(0, 20)
    window.localStorage.setItem(STORAGE_KEY_RUN_HISTORY, JSON.stringify(trimmed))
  } catch {
    // ignore
  }
}

/**
 * Get past run history records.
 */
export function getRunHistory(): RunHistoryRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_RUN_HISTORY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * Evaluates achievements for profile server API.
 */
export function evaluateAchievements(stats: {
  totalGames: number
  bestScore: number
  totalKills: number
  maxLevel: number
  maxSurvivalTime: number
  totalMutations: number
  survivalWavesCleared: number
  isTopOne: boolean
  bossDefeated: boolean
}): Achievement[] {
  return ALL_ACHIEVEMENTS.map((a) => {
    let unlocked = false
    let progress = '0%'

    if (a.id === 'first_blood') {
      unlocked = stats.totalKills > 0
      progress = `${Math.min(stats.totalKills, 1)}/1`
    } else if (a.id === 'boss_slayer') {
      unlocked = stats.bossDefeated
      progress = unlocked ? '1/1' : '0/1'
    } else if (a.id === 'survivalist') {
      unlocked = stats.maxSurvivalTime >= 300
      progress = `${Math.min(stats.maxSurvivalTime, 300)}/300s`
    } else if (a.id === 'wave_master') {
      unlocked = stats.survivalWavesCleared >= 10
      progress = `${Math.min(stats.survivalWavesCleared, 10)}/10`
    } else if (a.id === 'combo_god') {
      unlocked = stats.totalMutations >= 5
      progress = `${Math.min(stats.totalMutations, 5)}/5`
    } else if (a.id === 'level_20') {
      unlocked = stats.maxLevel >= 20
      progress = `Lvl ${stats.maxLevel}/20`
    } else if (a.id === 'score_champion') {
      unlocked = stats.bestScore >= 50000
      progress = `${Math.min(stats.bestScore, 50000)}/50000`
    }

    return {
      ...a,
      icon: a.badge,
      unlocked,
      progress,
    }
  })
}

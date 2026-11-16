// ============================================================
// Anti-Cheat & Run Integrity Automated Test Suite (#7)
// ============================================================

const assert = require('assert')
const {
  validateRunProgression,
  generateRunSeed,
  generateRunConstraints,
  getMinimumXpForLevel,
} = require('../lib/game/serverValidation')

console.log('--- Starting Anti-Cheat & Run Integrity Tests ---')

const baseSession = {
  id: 'session_test_1',
  gameMode: 'classic',
  startedAt: new Date(Date.now() - 120000), // 120s ago
  expiresAt: new Date(Date.now() + 1800000),
  seed: 'test_seed_123',
}

// Test 1: Valid classic run
{
  const validRun = {
    score: 15000,
    level: 6,
    kills: 45,
    survivalTime: 110,
    gameMode: 'classic',
    wave: 0,
    damageDealt: 1800,
    damageTaken: 250,
    criticalHits: 12,
    bossDefeated: false,
    mutations: ['speed_boost', 'power_boost', 'armor_boost'],
  }
  const result = validateRunProgression(baseSession, validRun)
  assert.strictEqual(result.status, 'valid', 'Standard plausible run should be valid')
  console.log('[PASS] Test 1: Valid classic run accepted')
}

// Test 2: Impossible score (accumulated rate too high)
{
  const impossibleScore = {
    score: 500000,
    level: 10,
    kills: 50,
    survivalTime: 60,
    gameMode: 'classic',
    wave: 0,
    damageDealt: 2500,
    damageTaken: 100,
    criticalHits: 10,
    bossDefeated: false,
  }
  const result = validateRunProgression(baseSession, impossibleScore)
  assert.strictEqual(result.status, 'rejected', 'Impossible score rate should be rejected')
  assert.strictEqual(result.flag, 'PPS_REJECTED')
  console.log('[PASS] Test 2: Impossible score accumulation rate rejected')
}

// Test 3: Impossible kill rate
{
  const impossibleKills = {
    score: 10000,
    level: 5,
    kills: 1500,
    survivalTime: 30,
    gameMode: 'classic',
    wave: 0,
    damageDealt: 40000,
    damageTaken: 50,
    criticalHits: 10,
    bossDefeated: false,
  }
  const result = validateRunProgression(baseSession, impossibleKills)
  assert.strictEqual(result.status, 'rejected', 'Impossible kill rate should be rejected')
  assert.strictEqual(result.flag, 'KPS_REJECTED')
  console.log('[PASS] Test 3: Impossible kill rate rejected')
}

// Test 4: Impossible level for XP
{
  const impossibleLevel = {
    score: 5000,
    level: 25, // requires huge XP
    kills: 2,
    survivalTime: 20,
    gameMode: 'classic',
    wave: 0,
    damageDealt: 100,
    damageTaken: 10,
    criticalHits: 0,
    bossDefeated: false,
  }
  const result = validateRunProgression(baseSession, impossibleLevel)
  assert.strictEqual(result.status, 'rejected', 'Impossible level without XP should be rejected')
  assert.strictEqual(result.flag, 'IMPOSSIBLE_LEVEL_FOR_XP')
  console.log('[PASS] Test 4: Impossible level without required XP rejected')
}

// Test 5: Damage less than kills HP requirement
{
  const insufficientDamage = {
    score: 10000,
    level: 5,
    kills: 80,
    survivalTime: 80,
    gameMode: 'classic',
    wave: 0,
    damageDealt: 50, // 50 damage for 80 kills is mathematically impossible
    damageTaken: 50,
    criticalHits: 5,
    bossDefeated: false,
  }
  const result = validateRunProgression(baseSession, insufficientDamage)
  assert.strictEqual(result.status, 'rejected', 'Damage mathematically insufficient for kills should be rejected')
  assert.strictEqual(result.flag, 'DAMAGE_KILLS_MISMATCH')
  console.log('[PASS] Test 5: Damage/kills incoherence rejected')
}

// Test 6: Critical hits exceeding attack cap
{
  const impossibleCrits = {
    score: 5000,
    level: 3,
    kills: 10,
    survivalTime: 10, // 10 seconds => max ~300 attacks
    gameMode: 'classic',
    wave: 0,
    damageDealt: 1500,
    damageTaken: 20,
    criticalHits: 800, // 800 crits in 10s is impossible
    bossDefeated: false,
  }
  const result = validateRunProgression(baseSession, impossibleCrits)
  assert.strictEqual(result.status, 'rejected', 'Crits exceeding attacks should be rejected')
  assert.strictEqual(result.flag, 'CRIT_EXCEEDS_ATTACKS')
  console.log('[PASS] Test 6: Critical hits exceeding attack capacity rejected')
}

// Test 7: Invalid wave in Classic mode
{
  const waveInClassic = {
    score: 5000,
    level: 3,
    kills: 10,
    survivalTime: 60,
    gameMode: 'classic',
    wave: 5, // wave must be 0 in classic
    damageDealt: 500,
    damageTaken: 50,
    criticalHits: 5,
    bossDefeated: false,
  }
  const result = validateRunProgression(baseSession, waveInClassic)
  assert.strictEqual(result.status, 'rejected', 'Wave > 0 in Classic mode should be rejected')
  assert.strictEqual(result.flag, 'INVALID_WAVE')
  console.log('[PASS] Test 7: Wave count in Classic rejected')
}

// Test 8: Boss defeated in Bio-War
{
  const bioWarSession = { ...baseSession, gameMode: 'biowar' }
  const bossInBioWar = {
    score: 5000,
    level: 3,
    kills: 5,
    survivalTime: 60,
    gameMode: 'biowar',
    wave: 0,
    damageDealt: 500,
    damageTaken: 50,
    criticalHits: 2,
    bossDefeated: true, // No bosses in Bio-War
  }
  const result = validateRunProgression(bioWarSession, bossInBioWar)
  assert.strictEqual(result.status, 'rejected', 'Boss defeated in Bio-War should be rejected')
  assert.strictEqual(result.flag, 'BIOWAR_NO_BOSS')
  console.log('[PASS] Test 8: Boss defeated in Bio-War rejected')
}

// Test 9: Mutations count exceeding level - 1
{
  const tooManyMutations = {
    score: 5000,
    level: 3, // allows at most 2 mutations
    kills: 15,
    survivalTime: 50,
    gameMode: 'classic',
    wave: 0,
    damageDealt: 800,
    damageTaken: 100,
    criticalHits: 5,
    bossDefeated: false,
    mutations: ['speed_boost', 'power_boost', 'armor_boost', 'void_core'], // 4 mutations
  }
  const result = validateRunProgression(baseSession, tooManyMutations)
  assert.strictEqual(result.status, 'rejected', 'Mutations exceeding level-1 should be rejected')
  assert.strictEqual(result.flag, 'MUTATIONS_EXCEED_LEVEL')
  console.log('[PASS] Test 9: Mutations exceeding level allowance rejected')
}

// Test 10: Unknown mutation ID
{
  const fakeMutation = {
    score: 5000,
    level: 3,
    kills: 15,
    survivalTime: 50,
    gameMode: 'classic',
    wave: 0,
    damageDealt: 800,
    damageTaken: 100,
    criticalHits: 5,
    bossDefeated: false,
    mutations: ['godmode_cheat_mutation'],
  }
  const result = validateRunProgression(baseSession, fakeMutation)
  assert.strictEqual(result.status, 'rejected', 'Unknown mutation ID should be rejected')
  assert.strictEqual(result.flag, 'INVALID_MUTATION_ID')
  console.log('[PASS] Test 10: Unknown mutation ID rejected')
}

// Test 11: Suspicious score handling (borderline PPS)
{
  const borderlineRun = {
    score: 65000,
    level: 12,
    kills: 120,
    survivalTime: 65, // pps = 1000, between maxPps (900) and 1.5x (1350)
    gameMode: 'classic',
    wave: 0,
    damageDealt: 8500,
    damageTaken: 300,
    criticalHits: 25,
    bossDefeated: false,
  }
  const result = validateRunProgression(baseSession, borderlineRun)
  assert.strictEqual(result.status, 'suspicious', 'Borderline high density should be flagged suspicious')
  assert.strictEqual(result.flag, 'PPS_SUSPICIOUS')
  console.log('[PASS] Test 11: Borderline density flagged as suspicious (not banned, withheld from leaderboard)')
}

// Test 12: Seed and constraints generation
{
  const randomSeed = generateRunSeed('classic')
  assert.strictEqual(typeof randomSeed, 'string')
  assert.strictEqual(randomSeed.length, 32)

  const dailySeed1 = generateRunSeed('daily', '2026-09-05')
  const dailySeed2 = generateRunSeed('daily', '2026-09-05')
  const dailySeedDiff = generateRunSeed('daily', '2026-09-06')
  assert.strictEqual(dailySeed1, dailySeed2, 'Daily seed must be deterministic for the same date')
  assert.notStrictEqual(dailySeed1, dailySeedDiff, 'Daily seed must vary by date')

  const constraints = JSON.parse(generateRunConstraints('classic', randomSeed))
  assert.strictEqual(constraints.gameMode, 'classic')
  assert.strictEqual(constraints.maxWave, 0)
  assert.strictEqual(constraints.bossAllowed, true)
  console.log('[PASS] Test 12: Cryptographic & deterministic seed generation verified')
}

// Test 13: Event stream verification
{
  const runWithEvents = {
    score: 10000,
    level: 4,
    kills: 25,
    survivalTime: 80,
    gameMode: 'classic',
    wave: 0,
    damageDealt: 1200,
    damageTaken: 150,
    criticalHits: 10,
    bossDefeated: false,
    events: [
      { type: 'kill', t: 5000 },
      { type: 'kill', t: 12000 },
      { type: 'levelup', t: 25000 },
      { type: 'kill', t: 40000 },
      { type: 'levelup', t: 60000 },
    ],
  }
  const result = validateRunProgression(baseSession, runWithEvents)
  assert.strictEqual(result.status, 'valid', 'Monotonic valid event stream should pass')

  const runWithTimeWarpEvents = {
    ...runWithEvents,
    events: [
      { type: 'kill', t: 5000 },
      { type: 'kill', t: 500000 }, // event after survival time!
    ],
  }
  const resultWarp = validateRunProgression(baseSession, runWithTimeWarpEvents)
  assert.strictEqual(resultWarp.status, 'rejected', 'Events beyond survival time should be rejected')
  assert.strictEqual(resultWarp.flag, 'EVENT_TIME_WARP')
  console.log('[PASS] Test 13: Event stream validation verified')

  // Test 14: Survival Wave 5 Mini-Boss defeat allowed from wave >= 5
  const survivalBossSession = {
    id: 'run-surv-boss',
    playerId: 'p1',
    gameMode: 'survival',
    startedAt: new Date(Date.now() - 55000),
  }
  const survivalBossRes = validateRunProgression(survivalBossSession, {
    gameMode: 'survival',
    score: 1200,
    level: 6,
    kills: 24,
    survivalTime: 50,
    wave: 5,
    damageDealt: 1800,
    damageTaken: 60,
    criticalHits: 4,
    bossDefeated: true,
    mutationsCount: 2,
  })
  assert.strictEqual(survivalBossRes.status, 'valid', 'Survival wave 5 boss defeat should be valid')
  console.log('[PASS] Test 14: Survival wave 5 boss defeat allowed')

  // Test 15: Bio-War virtual mass tier level skips Classic XP-vs-level rejection
  const biowarSession = {
    id: 'run-biowar-1',
    playerId: 'p1',
    gameMode: 'biowar',
    startedAt: new Date(Date.now() - 95000),
  }
  const biowarRes = validateRunProgression(biowarSession, {
    gameMode: 'biowar',
    score: 2500,
    level: 25,
    kills: 0,
    survivalTime: 90,
    wave: 0,
    damageDealt: 0,
    damageTaken: 0,
    criticalHits: 0,
    bossDefeated: false,
    mutationsCount: 0,
  })
  assert.strictEqual(biowarRes.status, 'valid', 'Bio-War virtual mass tier should be valid without kills')
  console.log('[PASS] Test 15: Bio-War virtual mass tier verified')
}

console.log('=== ALL 15 ANTI-CHEAT VERIFICATION TESTS PASSED ===')

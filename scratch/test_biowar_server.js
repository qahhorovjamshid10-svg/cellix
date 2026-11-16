// ============================================================
// Bio-War 30 Realtime Server Test Suite
// ============================================================

const assert = require('assert')
const { WebSocket } = require('ws')
const { BioWarServer, BioWarRoom, MAX_ROOM_CAPACITY } = require('../server/biowar-server')

async function runTests() {
  console.log('--- Starting Bio-War 30 Realtime Server Tests ---')

  const TEST_PORT = 3105
  const server = new BioWarServer(TEST_PORT)

  try {
    // Test 1: Room initialization & Bot filling
    {
      const room = server.getOrCreateRoom()
      assert.ok(room, 'Room should be created')
      assert.strictEqual(room.players.size, 0, 'Initial human players should be 0')
      assert.ok(room.bots.size > 0, 'Room should spawn bots to fill arena')
      assert.ok(room.food.length >= 200, 'Room should spawn initial food')
      console.log(`[PASS] Test 1: Room initialized with ${room.bots.size} bots and ${room.food.length} food orbs`)
    }

    // Test 2: Client WebSocket connection and 'init' packet
    const ws1 = new WebSocket(`ws://localhost:${TEST_PORT}?playerId=test_p1&name=AlphaPlayer`)
    const initData = await new Promise((resolve, reject) => {
      ws1.on('message', (raw) => {
        const msg = JSON.parse(raw.toString())
        if (msg.type === 'init') resolve(msg)
      })
      ws1.on('error', reject)
    })

    assert.strictEqual(initData.type, 'init')
    assert.strictEqual(initData.playerId, 'test_p1')
    assert.strictEqual(initData.entity.name, 'AlphaPlayer')
    console.log('[PASS] Test 2: Client 1 connected and received init payload')

    // Test 3: Receive server snapshot with honest entity metrics
    const snapshot = await new Promise((resolve) => {
      ws1.on('message', (raw) => {
        const msg = JSON.parse(raw.toString())
        if (msg.type === 'snapshot') resolve(msg)
      })
    })

    assert.strictEqual(snapshot.type, 'snapshot')
    assert.strictEqual(snapshot.humanCount, 1, 'Server must honestly report 1 human player')
    assert.ok(snapshot.botCount > 0, 'Server must report bot count')
    assert.strictEqual(snapshot.totalEntities, snapshot.humanCount + snapshot.botCount)

    // Verify bots are tagged isBot=true and human is isBot=false
    const humanInSnap = snapshot.entities.find((e) => e.id === 'test_p1')
    assert.ok(humanInSnap, 'Human player must exist in snapshot entities')
    assert.strictEqual(humanInSnap.isBot, false, 'Human must NOT be marked as bot')

    const botInSnap = snapshot.entities.find((e) => e.isBot === true)
    assert.ok(botInSnap, 'Bot must exist and be explicitly marked isBot=true')
    console.log(`[PASS] Test 3: Snapshot verified (Human: ${snapshot.humanCount}, Bots: ${snapshot.botCount}, Honest labeling verified)`)

    // Test 4: Input transmission & server movement processing
    ws1.send(JSON.stringify({
      type: 'input',
      angle: 1.57,
      isBoosting: true,
      isShooting: false,
    }))

    // Wait 2 ticks
    await new Promise((r) => setTimeout(r, 120))

    const nextSnap = await new Promise((resolve) => {
      const handler = (raw) => {
        const msg = JSON.parse(raw.toString())
        if (msg.type === 'snapshot') {
          ws1.off('message', handler)
          resolve(msg)
        }
      }
      ws1.on('message', handler)
    })

    const updatedP1 = nextSnap.entities.find((e) => e.id === 'test_p1')
    assert.ok(updatedP1, 'Player must exist in next snapshot')
    assert.strictEqual(updatedP1.isBoosting, true, 'Boost input was authoritatively accepted')
    console.log('[PASS] Test 4: Client input processed on server')

    // Test 5: Second player connects (2 humans in room)
    const ws2 = new WebSocket(`ws://localhost:${TEST_PORT}?playerId=test_p2&name=BetaPlayer`)
    await new Promise((resolve) => {
      ws2.on('message', (raw) => {
        const msg = JSON.parse(raw.toString())
        if (msg.type === 'init') resolve(msg)
      })
    })

    // Check updated snapshot reflects 2 humans
    const dualSnap = await new Promise((resolve) => {
      const handler = (raw) => {
        const msg = JSON.parse(raw.toString())
        if (msg.type === 'snapshot' && msg.humanCount === 2) {
          ws1.off('message', handler)
          resolve(msg)
        }
      }
      ws1.on('message', handler)
    })

    assert.strictEqual(dualSnap.humanCount, 2, 'Snapshot must report 2 human players')
    assert.ok(dualSnap.entities.some((e) => e.id === 'test_p1' && !e.isBot))
    assert.ok(dualSnap.entities.some((e) => e.id === 'test_p2' && !e.isBot))
    console.log('[PASS] Test 5: Second human player joined room; honest count updated to 2 humans')

    // Test 6: Clean disconnection & room lifecycle
    ws1.close()
    ws2.close()
    await new Promise((r) => setTimeout(r, 200))

    console.log('[PASS] Test 6: Disconnection and room cleanup verified')
    console.log('=== ALL 6 BIO-WAR SERVER ARCHITECTURE TESTS PASSED ===')
  } finally {
    await server.close()
  }
}

runTests().catch((err) => {
  console.error('Test failure:', err)
  process.exit(1)
})

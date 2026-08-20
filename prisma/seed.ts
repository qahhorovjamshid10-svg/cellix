import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding initial CELLIX database...')

  // Clear existing records
  await prisma.gameSession.deleteMany()
  await prisma.highScore.deleteMany()
  await prisma.player.deleteMany()

  // 1. Create Seed Players
  const p1 = await prisma.player.create({
    data: {
      username: 'Cellix_Master',
      bio: 'Top Cellix arena survivor.',
      avatarColor: '#b026ff',
    },
  })
  await prisma.player.create({
    data: {
      username: 'iflxczz',
      bio: 'the creator',
      avatarColor: '#06b6d4',
      coins: 1_000_000,
    },
  })
  const p2 = await prisma.player.create({
    data: {
      username: 'CyberNet_Node',
      bio: 'Digital cell pathogen researcher.',
      avatarColor: '#3b82f6',
    },
  })
  const p3 = await prisma.player.create({
    data: {
      username: 'BioRunner_X',
      bio: 'Speed and survival enthusiast.',
      avatarColor: '#ff0055',
    },
  })

  // 2. Create High Scores
  await prisma.highScore.create({
    data: {
      playerId: p1.id,
      score: 18450,
      level: 14,
      kills: 142,
      survivalTime: 520,
      gameMode: 'classic',
    },
  })
  await prisma.highScore.create({
    data: {
      playerId: p2.id,
      score: 12300,
      level: 10,
      kills: 98,
      survivalTime: 380,
      gameMode: 'survival',
    },
  })
  await prisma.highScore.create({
    data: {
      playerId: p3.id,
      score: 8900,
      level: 7,
      kills: 65,
      survivalTime: 240,
      gameMode: 'classic',
    },
  })

  // 3. Create Sample Game Sessions
  await prisma.gameSession.create({
    data: {
      playerId: p1.id,
      score: 18450,
      level: 14,
      kills: 142,
      survivalTime: 520,
      gameMode: 'classic',
      wave: 0,
    },
  })
  await prisma.gameSession.create({
    data: {
      playerId: p2.id,
      score: 12300,
      level: 10,
      kills: 98,
      survivalTime: 380,
      gameMode: 'survival',
      wave: 10,
    },
  })

  console.log('Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

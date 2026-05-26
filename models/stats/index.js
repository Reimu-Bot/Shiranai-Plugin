import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const dataDir = './plugins/Shiranai-Plugin/data'
const dbPath = `${dataDir}/stats.db`
const requireFromRoot = createRequire(path.join(process.cwd(), 'package.json'))
let sqlite3
let db

async function getDb () {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (!db) {
    sqlite3 = sqlite3 || requireFromRoot('sqlite3')
    db = new sqlite3.Database(dbPath)
    db.run(`CREATE TABLE IF NOT EXISTS wins (
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      avatar TEXT NOT NULL DEFAULT '',
      game TEXT NOT NULL,
      wins INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, game)
    )`)
    db.run(`ALTER TABLE wins ADD COLUMN avatar TEXT NOT NULL DEFAULT ''`, () => {})
  }
  return db
}

export async function recordWin (e, game, userId = e.user_id, userName = e.sender?.nickname || e.user_name || e.nickname || String(userId)) {
  const database = await getDb()
  const avatar = await getAvatarUrl(e, userId).catch(() => '')
  database.run(
    `INSERT INTO wins (user_id, user_name, avatar, game, wins, updated_at)
     VALUES (?, ?, ?, ?, 1, ?)
     ON CONFLICT(user_id, game) DO UPDATE SET
       user_name = excluded.user_name,
       avatar = excluded.avatar,
       wins = wins + 1,
       updated_at = excluded.updated_at`,
    [String(userId), userName || String(userId), avatar, game, Date.now()]
  )
}

export function getWinRanking (limit = 10) {
  return new Promise(async (resolve, reject) => {
    const database = await getDb().catch(reject)
    if (!database) return
    database.all(
      `SELECT user_id, user_name, avatar, SUM(wins) AS wins
       FROM wins
       GROUP BY user_id
       ORDER BY wins DESC, updated_at DESC
       LIMIT ?`,
      [limit],
      (err, rows) => err ? reject(err) : resolve(rows)
    )
  })
}

export function getGameRanking (limit = 10) {
  return new Promise(async (resolve, reject) => {
    const database = await getDb().catch(reject)
    if (!database) return
    database.all(
      `SELECT game, SUM(wins) AS wins
       FROM wins
       GROUP BY game
       ORDER BY wins DESC
       LIMIT ?`,
      [limit],
      (err, rows) => err ? reject(err) : resolve(rows)
    )
  })
}

export function statsButton () {
  return { text: '胜场统计', callback: '/希腊奶统计', input: '/希腊奶统计' }
}

async function getAvatarUrl (e, userId) {
  if (String(userId) === String(e.user_id)) {
    if (e.friend?.getAvatarUrl) return await e.friend.getAvatarUrl()
    if (e.member?.getAvatarUrl) return await e.member.getAvatarUrl()
  }
  return `https://q.qlogo.cn/g?b=qq&s=0&nk=${userId}`
}

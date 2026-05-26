import { App } from '#components'
import { getGameRanking, getWinRanking } from '#models'

export const app = {
  id: 'stats',
  name: '胜场统计'
}

export const rule = {
  stats: {
    reg: /^[#/]?(希腊奶|shiranai)?(小游戏)?(胜场)?统计$/i,
    fnc: async e => {
      const [users, games] = await Promise.all([getWinRanking(10), getGameRanking(10)]).catch(error => {
        logger.error(error)
        return []
      })
      if (!users) return e.reply('胜场统计不可用，请先安装 sqlite3 依赖')
      if (!users.length) return e.reply('暂无胜场记录')

      const userText = users.map((row, index) => `${index + 1}. ${row.user_name}：${row.wins}胜`).join('\n')
      const gameText = games.map(row => `${row.game}：${row.wins}胜`).join('\n')
      return e.reply(`小游戏胜场统计\n\n玩家排行 TOP10：\n${userText}\n\n游戏统计：\n${gameText}`)
    }
  }
}

export const stats = new App(app, rule).create()

import { toButton, extLetterToNumber, LinkGame, recordWin, statsButton } from '#models'
// import { App } from '#components'

const GAME = {}

export const app = {
  id: 'LinkGameLite',
  name: '轻量版连连看'
}

export const rule = {
  start: {
    reg: /^[#/](结束)?连连看$/,
    fnc: async e => {
      e.toQQBotMD = true
      if (e.msg.includes('结束')) {
        delete GAME[e.group_id]
        return e.reply(['连连看已结束', toButton([[{ text: '开始游戏', callback: '#连连看' }, statsButton()]], 'QQBot', { defRetType: 'text' })])
      }
      if (!GAME[e.group_id]) {
        GAME[e.group_id] = new LinkGame()
        const game = GAME[e.group_id]
        game.init()
      }
      const game = GAME[e.group_id]
      const buttons = []
      for (const pic of game.pictures) {
        const button = []
        for (const i of pic) {
          if (i.pic) {
            button.push({ text: i.pic, input: `连线 ${i.row},${i.col}`, style: 1, QQBot: { action: { reply: true }, render_data: { style: 1 } } })
          }
        }
        if (button.length) {
          buttons.push(button)
        }
      }
      const msg = e.adapter_name === 'QQBot' ? '请点击按钮,可多选' : '使用 "连线"+位置 连线方块，\n必须同时加多个位置，如："连线 A1 A2"'
      return e.reply([`${msg}\r得分:${game.score}\t\t\t剩余时间:${game.leftTime}`, await toButton(buttons, 'QQBot')])
    }
  },
  link: {
    reg: /^(连线\s*(\d+,\d+|[A-Za-z0-9]|\s)+)+$/,
    fnc: async e => {
      e.toQQBotMD = true
      if (!GAME[e.group_id]) {
        return await e.reply(['连连看未开始', toButton([[{ text: '开始游戏', callback: '/连连看' }]], 'QQBot', { defRetType: 'text' })])
      }
      const game = GAME[e.group_id]
      if (game.gameStatus == -1) {
        delete GAME[e.group_id]
        return await e.reply(['连连看时间已用尽', toButton([[{ text: '开始游戏', callback: '/连连看' }, statsButton()]], 'QQBot', { defRetType: 'text' })])
      }
      let log = ''
      const arr = []
      for (const i of e.msg.replace(/连线/g, '').split(' ')) {
        if (!i) continue
        const [x, y] = i.includes(',') ? i.split(',') : extLetterToNumber(i)
        if (log) log += ' '
        log += `${x},${y}`
        arr.push({ row: +x, col: +y })
        if (arr.length == 2) {
          const ret = game.checkMatch(arr[0], arr[1])
          if (ret == 1) {
            recordWin(e, '连连看')
            await e.reply([`恭喜你获得胜利\r得分:${game.score}\t\t\t剩余时间:${game.leftTime}`, toButton([[{ text: '开始游戏', callback: '/连连看' }, statsButton()]], 'QQBot', { defRetType: 'text' })])
            delete GAME[e.group_id]
            return true
          }
          arr.length = 0
        }
      }
      const buttons = []
      for (const pic of game.pictures) {
        const button = []
        for (const i of pic) {
          if (i.pic) {
            if (i.isEmpty) {
              button.push({ text: ' ', input: `连线 ${i.row},${i.col}`, permission: 'xxx', style: 0, QQBot: { render_data: { style: 0 } } })
            } else {
              button.push({ text: i.pic, input: `连线 ${i.row},${i.col}`, style: 1, QQBot: { action: { reply: true }, render_data: { style: 1 } } })
            }
          }
        }
        if (button.length) {
          buttons.push(button)
        }
      }
      const msg = e.adapter_name === 'QQBot' ? '请点击按钮,可多选' : '使用 "连线"+位置 连线方块，\n必须同时加多个位置，如："连线 A1 A2"'
      return e.reply([`${msg}\r得分:${game.score}\t\t\t剩余时间:${game.leftTime}`, await toButton(buttons, 'QQBot')])
    }
  }
}

// export const LinkGameLite = new App(app, rule).create()

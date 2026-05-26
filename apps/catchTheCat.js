import { segment } from '#lib'
import { Config, Render, App } from '#components'
import { MainScene, extLetterToNumber, toButton, recordWin, statsButton } from '#models'

const GAME = {}

export const app = {
  id: 'catchTheCat',
  name: '圈小猫'
}

export const rule = {
  start: {
    reg: /^#?(重置)?[圈抓]小猫(简单|普通|困难)?$/,
    fnc: async e => {
      const reset = !!e.msg.includes('重置')
      const key = getKey(e)
      const { name, rows, cols, initialWallCount } = getDifficulty(e.msg)
      if (!GAME[key] || reset || e.msg.includes(name)) {
        GAME[key] = new MainScene(rows, cols, initialWallCount)
        GAME[key].difficultyName = name
      }
      const game = GAME[key]
      if (!game.state) game.create()
      const msg = await render(game, `当前难度：${game.difficultyName || name}，点击小圆点，围住小猫`, e.user_id)
      return await e.reply(msg)
    }
  },
  game: {
    reg: /^#?点击\s*[A-Za-z0-9]+/,
    fnc: async e => {
      const key = getKey(e)
      if (!GAME[key]) {
        if (Config.catchTheCat.noStartTip) {
          return await e.reply(Config.catchTheCat.noStartTip)
        } else {
          return rule.start.fnc(e)
        }
      }
      const game = GAME[key]
      const [x, y] = extLetterToNumber(e.msg.replace(/^#?点击\s*/, '')).map(x => x - 1).reverse()
      const { message, state } = game.playerClick(x, y, await getAvatarUrl(e))
      const msg = await render(game, message, e.user_id, !!state)
      if (state === 'win') recordWin(e, '圈小猫')
      if (state) delete GAME[key]
      return await e.reply(msg)
    }
  },
  rollback: {
    reg: /^#?回退[抓圈]小猫$/,
    fnc: async e => {
      if (!Config.catchTheCat.allowRollback) return false
      const key = getKey(e)
      if (!GAME[key]) return
      const game = GAME[key]
      const { message } = game.undo()
      const msg = await render(game, message, e.user_id)
      return await e.reply(msg)
    }
  },
  stop: {
    reg: /^#?结束[抓圈]小猫$/,
    fnc: async e => {
      const key = getKey(e)
      if (!GAME[key]) {
        if (Config.catchTheCat.noStartTip) return await e.reply(Config.catchTheCat.noStartTip)
        return
      }
      delete GAME[key]
      return await e.reply(['圈小猫已结束', toButton([getDifficultyButtons(), [statsButton()]], 'QQBot')])
    }
  }
}

export const catchTheCat = new App(app, rule).create()

async function render (game, message, user_id, showDifficultyButtons = false) {
  const img = await Render.simpleRender('catchTheCat/index', {
    message,
    blocks: JSON.stringify(game.blocks),
    cat: JSON.stringify({ i: game.cat.i, j: game.cat.j })
  })
  const msg = [img]
  if (Config.catchTheCat.at) msg.push(segment.at(user_id))
  const controlButtons = [
    { text: '重置', input: '重置抓小猫' },
    { text: '结束', input: '结束抓小猫' }
  ]
  if (Config.catchTheCat.allowRollback) {
    controlButtons.unshift({ text: '回退', input: '回退抓小猫' })
  }
  const buttons = [[
    { text: '点击', input: '点击' }
  ], controlButtons]
  if (showDifficultyButtons) buttons.push(getDifficultyButtons())
  if (showDifficultyButtons) buttons.push([statsButton()])
  msg.push(toButton(buttons, 'QQBot'))
  return msg
}

function getDifficultyButtons () {
  const buttons = Object.keys(Config.catchTheCat.difficulties || {}).map(name => ({
    text: name,
    input: `圈小猫${name}`
  }))
  return buttons.length ? buttons : [{ text: '开始游戏', input: '圈小猫' }]
}

function getDifficulty (msg) {
  const difficulties = Config.catchTheCat.difficulties || {}
  const names = Object.keys(difficulties)
  const name = names.find(name => msg.endsWith(name)) || Config.catchTheCat.defaultDifficulty || names[0] || '默认'
  return {
    name,
    rows: difficulties[name]?.rows || Config.catchTheCat.rows,
    cols: difficulties[name]?.cols || Config.catchTheCat.cols,
    initialWallCount: difficulties[name]?.initialWallCount || Config.catchTheCat.initialWallCount
  }
}

function getKey (e) {
  switch (Config.catchTheCat.scope) {
    case 'group':
      return e.group_id
    case 'user':
      return e.user_id
    case 'group.user':
      return `${e.group_id}.${e.user_id}`
    default:
      return e.group_id
  }
}

async function getAvatarUrl (e) {
  if (e.friend?.getAvatarUrl) return await e.friend.getAvatarUrl()
  if (e.member?.getAvatarUrl) return await e.member.getAvatarUrl()
  return `https://q.qlogo.cn/g?b=qq&s=0&nk=${e.user_id}`
}

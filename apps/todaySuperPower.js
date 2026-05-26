import { segment, Bot } from '#lib'
import { Config } from '#components'
import { TodaySuperPower } from '#models'
import { toButton } from '#models'

const todaySuperPower = new TodaySuperPower()
await todaySuperPower.init()

export const app = {
  id: 'todaySuperPower',
  name: '今日超能力'
}

// Unicode转中文的函数
function unicodeToChinese(str) {
  return str.replace(/\\u[\dA-Fa-f]{4}/g, function (match) {
    return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16))
  })
}

// 调用审核API
async function checkContent(text) {
  try {
    const encodedText = encodeURIComponent(text)
    // ⬇️ 就换了下面这一行
    const response = await fetch(`https://textcheck.185110524.xyz/?text=${encodedText}`)
    const data = await response.json()
    
    // ⬇️ 下面完全不变，可以直接用
    if (data.status === 'success') {
      if (data.result.safe === 1) {
        return { safe: true, reason: data.result.reason }
      } else if (data.result.safe === 2) {
        return { safe: false, reason: unicodeToChinese(data.result.reason) }
      }
    }
    return { safe: false, reason: '审核服务异常，请稍后再试' }
  } catch (error) {
    console.error('审核API调用失败:', error)
    return { safe: false, reason: '审核服务异常，请稍后再试' }
  }
}



export const rule = {
  superPower: {
    reg: /^#?(刷新)?[今昨明][日天]超能力$|^#?你会按下按钮吗$/,
    fnc: async e => {
      let msg
      if (e.msg.includes('今')) {
        if (e.msg.includes('刷新') && e.isMaster) {
          await todaySuperPower.getTodaySuperPower(true)
        }
        msg = todaySuperPower.getTodayMsg()
      } else if (e.msg.includes('你会按下按钮吗')) {		
        msg = todaySuperPower.getTodayMsg()
      } else if (e.msg.includes('昨')) {
        msg = todaySuperPower.getYesterdayMsg()
      } else if (e.msg.includes('明')) {
        if (e.msg.includes('刷新') && e.isMaster) {
          await todaySuperPower.getTomorrowSuperPower(true)
        }
        msg = await todaySuperPower.getTomorrowMsg(e.isMaster)
      }
      return await e.reply(msg)
    }
  },
  action: {
    reg: /^#?(不按|按下)$/,
    fnc: async e => {
      const data = e.msg.includes('按下')
        ? {
            action: 'press',
            oppositeAction: 'notPress',
            tip: '按下'
          }
        : {
            action: 'notPress',
            oppositeAction: 'press',
            tip: '不按'
          }
      const select = todaySuperPower.setAction(e.user_id, data)
      const msg = todaySuperPower.getTodayMsg(select)
      return await e.reply(msg)
    }
  },
  review: {
    reg: /^#评论\s*(.*)$/,
    fnc: async e => {
      const message = e.msg.replace(/#评论\s*/, '')
      if (!message) {
        return false
      }
      
      // 检查黑名单
      if (Config.todaySuperPower.blacklist && Config.todaySuperPower.blacklist.id && Config.todaySuperPower.blacklist.id.includes(e.user_id)) {
        return await e.reply('你已被管理员禁止评论。')
      }
      
      // 检查评论长度
      if (message.length > (Config.todaySuperPower.reviewLengthLimit || 200)) {
        const msg = [
          '评论内容过长,请重新输入~',
          toButton([
            [
              { text: '✏️重新评论', input: '/评论 ' }
            ]
          ], 'QQBot')
        ]
        return await e.reply(msg)
      }
      await e.reply('评论正在审核中，请稍候...')
      // 调用审核API检查内容
      const checkResult = await checkContent(message)
      if (!checkResult.safe) {
        const msg = [
          `评论内容不符合规范: ${checkResult.reason}`,
          toButton([
            [
              { text: '✏️重新评论', input: '/评论 ' }
            ]
          ], 'QQBot')
        ]
        return await e.reply(msg)
      }
      
      // 内容安全，直接添加到评论区
      const id = todaySuperPower.addReview(message, e.user_id, await e.friend.getAvatarUrl())
      todaySuperPower.setReview('pass', id - 1)
      const msg = [
        '评论成功~',
        toButton([
          [
            { text: '📰查看评论', callback: '/查看评论' }
          ]
        ], 'QQBot')
      ]
      await e.reply(msg)
      
      return true
    }
  },
  lookReview: {
    reg: /^#?(?:一键)?(点赞|点踩|查看|通过|删除)(?:待审核?)?评论\s*([0-9]*)$/,
    fnc: async e => {
      const regRet = rule.lookReview.reg.exec(e.msg)
      const id = regRet[2] ? regRet[2] - 1 : -1
      const isMaster = e.isMaster
      
      if (regRet[1] == '查看') {
        const msg = await todaySuperPower.getReviewImg(e, id, isMaster)
        return await e.reply(msg)
      } else if (regRet[1] == '通过') {
        if (!isMaster) return true
        const key = e.msg.includes('一键') ? 'passAll' : 'pass'
        const msg = todaySuperPower.setReview(key, id)
        await e.reply(msg, true, { recallMsg: 30 })
      } else if (regRet[1] == '删除') {
        if (!isMaster) return true
        const msg = todaySuperPower.setReview('delete', id)
        await e.reply(msg, true, { recallMsg: 30 })
      } else {
        const tip = regRet[1]
        const type = {
          点赞: 'like',
          点踩: 'dislike'
        }[tip]
        const msg = todaySuperPower.setReview(type, id, e.user_id, tip)
        await e.reply(msg, true, { recallMsg: 30 })
      }
      return true
    }
  }
}

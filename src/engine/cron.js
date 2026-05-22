// ============================================================
// Mini-Habits — 每日重置（cron）
//
// 简化版：不做复杂时区/CDS 计算，只做
//  1. 找出今天到期的 daily
//  2. 未完成的 → 断连击 + 任务价值下降
//  3. 重置 daily 完成状态
//
// 相对 Habitica 的简化：
//  - 不移除 HP（儿童友好）
//  - 不计算时区偏移（简化 MVP）
//  - 不涉及公会/挑战任务
// ============================================================

import scoreTask from './scoreTask.js';

/**
 * 执行每日重置
 *
 * @param {Object} user - 用户对象（会被修改）
 * @param {Array} dailies - 用户的每日任务列表
 * @returns {Object} 报告 { missed, completed }
 */
export default function runCron(user, dailies = []) {
  const report = {
    missed: 0,
    completed: 0,
    details: [],
  };

  for (const daily of dailies) {
    if (!_isDueToday(daily)) continue;

    if (!daily.completed) {
      // 没完成 → 用 cron 模式评分（只掉价值，不加分）
      scoreTask({
        user,
        task: daily,
        direction: 'down',
        times: 1,
        cron: true,
      });

      report.missed += 1;
      report.details.push({
        id: daily._id,
        text: daily.text,
        status: 'missed',
      });
    } else {
      // 已完成 → 统计
      report.completed += 1;
      report.details.push({
        id: daily._id,
        text: daily.text,
        status: 'completed',
      });
    }

    // 重置完成状态（新的一天）
    daily.completed = false;
    daily.counterUp = 0;
    daily.counterDown = 0;
  }

  return report;
}

/**
 * 判断一个 daily 今天是否到期
 * （简化版：按每周重复判断）
 */
function _isDueToday(daily) {
  if (daily.type !== 'daily') return false;
  if (daily.frequency !== 'weekly') {
    // 简化：只处理 weekly，其他频率默认到期
    return true;
  }

  const dayNames = ['su', 'm', 't', 'w', 'th', 'f', 's'];
  const todayName = dayNames[new Date().getDay()];

  return daily.repeat && daily.repeat[todayName] === true;
}

// ============================================================
// Mini-Habits — 升级/状态更新
// 参考 Habitica 的 updateStats.js
// ============================================================

import { MAX_LEVEL, MAX_LEVEL_HARD_CAP } from './constants.js';
import { expToNextLevel, getTitle, safeRound } from './helpers.js';

/**
 * 检查并执行升级
 *
 * @param {Object} user - 用户对象（会被修改）
 * @param {Object} stats - 包含当前 exp 的快照
 *
 * 副作用：
 *  - user.stats.lvl 可能 +N
 *  - user._tmp.leveledUp 记录升级信息
 *  - 解锁新头衔
 */
export default function updateStats(user, stats) {
  // 保证数值非负
  user.stats.gp = Math.max(0, safeRound(stats.gp));
  user.stats.exp = Math.max(0, stats.exp);

  let expRemaining = stats.exp;
  let experienceToNext = expToNextLevel(user.stats.lvl);

  if (expRemaining < experienceToNext) {
    // 不够升级，正常返回
    return;
  }

  // ---- 升级循环 ----
  const initialLvl = user.stats.lvl;
  let leveledUp = false;

  while (expRemaining >= experienceToNext) {
    expRemaining -= experienceToNext;

    if (user.stats.lvl >= MAX_LEVEL_HARD_CAP) {
      user.stats.lvl = MAX_LEVEL_HARD_CAP;
      break;
    }

    user.stats.lvl += 1;
    leveledUp = true;

    // 检查是否解锁头衔
    const newTitle = getTitle(user.stats.lvl);
    if (newTitle && user.stats.title !== newTitle) {
      user.stats.title = newTitle;
    }

    // 重新计算下一级所需经验
    experienceToNext = expToNextLevel(user.stats.lvl);
  }

  // 剩余经验
  user.stats.exp = safeRound(expRemaining);

  // 记录升级信息
  if (leveledUp) {
    if (!user._tmp) user._tmp = {};
    if (!user._tmp.leveledUp) user._tmp.leveledUp = [];

    user._tmp.leveledUp.push({
      initialLvl,
      newLvl: user.stats.lvl,
      title: user.stats.title,
    });
  }
}

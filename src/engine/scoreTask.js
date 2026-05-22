// ============================================================
// Mini-Habits 评分引擎（核心）
//
// 参考 Habitica 的 scoreTask.js，但做了大量简化：
//   ✅ 保留：任务价值衰减曲线 0.9747^value
//   ✅ 保留：EXP / 金币 / 连击
//   ✅ 保留：优先级倍率
//   ❌ 移除：四维属性（STR/CON/INT/PER）
//   ❌ 移除：暴击系统
//   ❌ 移除：掉血惩罚
//   ❌ 移除：随机掉落
//   ❌ 移除：副本进度
// ============================================================

import {
  BASE_EXP_MULTIPLIER,
  BASE_COIN_MULTIPLIER,
} from './constants.js';

import {
  calculateTaskDelta,
  calculateReverseDelta,
  getPriorityMultiplier,
  streakMultiplier,
  safeRound,
} from './helpers.js';

import updateStats from './updateStats.js';

/**
 * 完成任务 / 取消完成
 *
 * @param {Object} options
 * @param {Object} options.user   - 用户对象（会被修改）
 * @param {Object} options.task   - 任务对象（会被修改）
 * @param {string} options.direction - 'up' 完成 / 'down' 取消
 * @param {number} [options.times=1] - 完成次数（习惯可多次）
 * @param {boolean} [options.cron=false] - 是否是每日重置触发
 * @returns {number} delta - 任务价值变化量
 */
export default function scoreTask(options = {}) {
  const {
    user,
    task,
    direction = 'up',
    times = 1,
    cron = false,
  } = options;

  // --- 快照当前 EXP/金币/HP 用于 updateStats 对比 ---
  const stats = {
    exp: user.stats.exp,
    gp: user.stats.gp,
  };

  // --- 保护：不能做别人的任务 ---
  if (task.userId && task.userId !== user._id) {
    throw new Error('不能给别的用户完成任务');
  }

  // --- 保护：金币不够不能买奖励 ---
  if (task.type === 'reward' && task.value > user.stats.gp) {
    throw new Error('金币不够，买不了这个奖励');
  }

  // --- 初始化 tmp（用于传递升级等瞬态信息） ---
  const oldLeveledUp = user._tmp && user._tmp.leveledUp;
  user._tmp = {};
  if (oldLeveledUp) user._tmp.leveledUp = oldLeveledUp;

  // ========== 按任务类型分派 ==========

  if (task.type === 'habit') {
    _scoreHabit(user, task, direction, times, cron, stats);
  } else if (task.type === 'daily') {
    _scoreDaily(user, task, direction, times, cron, stats);
  } else if (task.type === 'todo') {
    _scoreTodo(user, task, direction, times, cron, stats);
  } else if (task.type === 'reward') {
    _scoreReward(user, task, direction, stats);
  }

  // --- 更新用户状态（升级检查等） ---
  updateStats(user, stats);

  return task.value;
}

// ================== 内部实现 ==================

/**
 * 计算任务价值变化量，累加 times 次
 */
function _changeTaskValue(user, task, direction, times, cron) {
  let totalDelta = 0;

  for (let i = 0; i < times; i++) {
    const delta = !cron && direction === 'down'
      ? calculateReverseDelta(task.value, direction)
      : calculateTaskDelta(task.value, direction, cron);

    if (task.type !== 'reward') {
      task.value += delta;
    }
    totalDelta += delta;
  }

  return totalDelta;
}

/**
 * 获得 EXP（含优先级和连击加成）—— 记入 stats 快照
 */
function _addExp(stats, task, delta, direction) {
  const priorityMult = getPriorityMultiplier(task.priority);
  const streakMult = direction === 'up' && task.streak
    ? streakMultiplier(task.streak)
    : 1;

  const expGain = delta * priorityMult * streakMult * BASE_EXP_MULTIPLIER;
  stats.exp += Math.max(0, safeRound(expGain));
}

/**
 * 获得金币（含优先级和连击加成）—— 记入 stats 快照
 */
function _addGold(stats, task, delta, direction) {
  const priorityMult = getPriorityMultiplier(task.priority);
  const streakMult = direction === 'up' && task.streak
    ? streakMultiplier(task.streak)
    : 1;

  const gpGain = delta * priorityMult * streakMult * BASE_COIN_MULTIPLIER;
  stats.gp += Math.max(0, safeRound(gpGain));
}

/**
 * 更新连击
 */
function _updateStreak(task, direction) {
  if (direction === 'up') {
    task.streak = (task.streak || 0) + 1;
  } else {
    task.streak = Math.max(0, (task.streak || 0) - 1);
  }
}

// ========== 习惯（Habit） ==========

function _scoreHabit(user, task, direction, times, cron, stats) {
  const delta = _changeTaskValue(user, task, direction, times, cron);

  if (delta > 0) {
    _addExp(stats, task, delta, direction);
    _addGold(stats, task, delta, direction);
  }
  // delta <= 0（点减号）: 不加 EXP，不加金币

  // 更新计数
  if (direction === 'up') {
    task.counterUp = (task.counterUp || 0) + times;
  } else {
    task.counterDown = (task.counterDown || 0) + times;
  }

  // 记录历史
  task.history = task.history || [];
  const last = task.history[task.history.length - 1];

  if (last && _isSameDay(last.date)) {
    last.value = task.value;
    last.scoredUp = (last.scoredUp || 0) + (direction === 'up' ? times : 0);
    last.scoredDown = (last.scoredDown || 0) + (direction === 'down' ? times : 0);
  } else {
    task.history.push({
      date: Date.now(),
      value: task.value,
      scoredUp: direction === 'up' ? times : 0,
      scoredDown: direction === 'down' ? times : 0,
    });
  }
}

// ========== 每日任务（Daily） ==========

function _scoreDaily(user, task, direction, times, cron, stats) {
  if (cron) {
    // cron 时：没做的 daily 只掉价值，不掉血
    const delta = _changeTaskValue(user, task, direction, times, cron);
    task.streak = 0; // 断连
    task.completed = false;
  } else {
    // 用户手动操作
    const delta = _changeTaskValue(user, task, direction, times, cron);

    if (direction === 'up') {
      _addExp(stats, task, delta, direction);
      _addGold(stats, task, delta, direction);
      _updateStreak(task, direction);
      task.completed = true;

      // 记录历史
      task.history = task.history || [];
      task.history.push({
        date: Date.now(),
        value: task.value,
        completed: true,
      });
    } else {
      // 取消完成
      task.streak = Math.max(0, (task.streak || 0) - 1);
      task.completed = false;

      // 移除最后一条历史
      if (task.history && task.history.length > 0) {
        task.history.pop();
      }
    }
  }
}

// ========== 待办（Todo） ==========

function _scoreTodo(user, task, direction, times, cron, stats) {
  if (direction === 'up') {
    task.completed = true;
    task.dateCompleted = new Date();

    const delta = _changeTaskValue(user, task, direction, 1, cron);
    _addExp(stats, task, delta, direction);
    _addGold(stats, task, delta, direction);
  } else {
    task.completed = false;
    task.dateCompleted = null;

    const delta = _changeTaskValue(user, task, direction, 1, cron);
  }
}

// ========== 奖励（Reward） ==========

function _scoreReward(user, task, direction, stats) {
  // 奖励不改变任务价值
  stats.gp -= task.value;
}

// ========== 辅助 ==========

function _isSameDay(timestamp) {
  const date1 = new Date(timestamp);
  const date2 = new Date();
  return (
    date1.getFullYear() === date2.getFullYear()
    && date1.getMonth() === date2.getMonth()
    && date1.getDate() === date2.getDate()
  );
}

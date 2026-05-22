// ============================================================
// Mini-Habits 游戏化引擎 — 工具函数
// ============================================================

import {
  MAX_LEVEL,
  MAX_LEVEL_HARD_CAP,
  MAX_TASK_VALUE,
  MIN_TASK_VALUE,
  TASK_VALUE_DECAY,
  CLOSE_ENOUGH,
  PRIORITY_MULTIPLIERS,
  STREAK_BONUS_BASE,
  STREAK_MILESTONE,
  EXP_PER_LEVEL_FACTOR,
  TITLES,
} from './constants.js';

// ---------- 任务价值裁剪 ----------

export function clampTaskValue(value) {
  if (value < MIN_TASK_VALUE) return MIN_TASK_VALUE;
  if (value > MAX_TASK_VALUE) return MAX_TASK_VALUE;
  return value;
}

// ---------- 任务价值变化量 ----------
// 公式：Δ = 0.9747^currentValue * (±1)
// 任务越红（负值），完成时 Δ 越大；越蓝（正值），Δ 越小
// direction: 'up' 或 'down'

export function calculateTaskDelta(taskValue, direction, cron = false) {
  const currVal = clampTaskValue(taskValue);
  const sign = direction === 'down' ? -1 : 1;
  let delta = TASK_VALUE_DECAY ** currVal * sign;

  // 如果是 cron（每日重置），不做 checklist 加成
  // （Mini-Habits 暂不实现 checklist，留接口）

  return delta;
}

// ---------- 反算 Δ（用于取消勾选时回退任务价值） ----------
// 近似原值：反复逼近直到误差 < CLOSE_ENOUGH

export function calculateReverseDelta(taskValue, direction) {
  const currVal = clampTaskValue(taskValue);
  let testVal = currVal + TASK_VALUE_DECAY ** currVal * (direction === 'down' ? -1 : 1);

  while (true) {
    const calc = testVal + TASK_VALUE_DECAY ** testVal;
    const diff = currVal - calc;

    if (Math.abs(diff) < CLOSE_ENOUGH) break;

    if (diff > 0) {
      testVal -= diff;
    } else {
      testVal += diff;
    }
  }

  return testVal - currVal;
}

// ---------- 优先级数值 ----------

export function getPriorityMultiplier(priority) {
  const p = PRIORITY_MULTIPLIERS[priority];
  return p !== undefined ? p : 1;
}

// ---------- 升级所需经验 ----------
// 前 5 级: 25 * level
// 5 级后: round((level² * 0.25 + 10 * level + 139.75) / 10) * 10
// 同 Habitica 公式

export function expToNextLevel(level) {
  if (level < 5) {
    return EXP_PER_LEVEL_FACTOR * level;
  }
  if (level === 5) {
    return 150;
  }
  return Math.round(((level ** 2) * 0.25 + 10 * level + 139.75) / 10) * 10;
}

// ---------- 等级上限裁剪 ----------

export function capLevel(level) {
  if (level > MAX_LEVEL) return MAX_LEVEL;
  return level;
}

// ---------- 经验衰减（防止无限增长） ----------
// 双曲线: max * bonus / (bonus + halfway)

export function diminishingReturns(bonus, max, halfway = max / 2) {
  return max * (bonus / (bonus + halfway));
}

// ---------- 连击奖励倍率 ----------

export function streakMultiplier(streak) {
  return 1 + streak * STREAK_BONUS_BASE; // 每连击+1%
}

// ---------- 获取当前头衔 ----------

export function getTitle(level) {
  let currentTitle = '';
  for (const entry of TITLES) {
    if (level >= entry.level) {
      currentTitle = entry.title;
    } else {
      break;
    }
  }
  return currentTitle;
}

// ---------- 检查是否达到里程碑 ----------

export function isStreakMilestone(streak) {
  return streak > 0 && streak % STREAK_MILESTONE === 0;
}

// ---------- 安全整数 ----------

export function safeRound(value, decimals = 1) {
  return Math.round(value * (10 ** decimals)) / (10 ** decimals);
}

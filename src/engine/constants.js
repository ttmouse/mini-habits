// ============================================================
// Mini-Habits 游戏化引擎 — 常量
// 参考 Habitica 但大幅简化，面向 10-15 岁儿童
// ============================================================

// ---------- 等级 ----------
export const MAX_LEVEL = 50;              // 满级（比 Habitica 的 100 更友好）
export const MAX_LEVEL_HARD_CAP = 9999;   // 硬上限

// ---------- 经验 ----------
export const BASE_EXP_MULTIPLIER = 6;     // 基础经验倍率
export const EXP_PER_LEVEL_FACTOR = 25;   // 前 5 级每级所需经验系数

// ---------- 金币 ----------
export const BASE_COIN_MULTIPLIER = 1;    // 基础金币倍率

// ---------- 任务价值 ----------
export const MAX_TASK_VALUE = 21.27;      // 任务价值上限（同 Habitica）
export const MIN_TASK_VALUE = -47.27;     // 任务价值下限
export const TASK_VALUE_DECAY = 0.9747;   // 衰减系数
export const CLOSE_ENOUGH = 0.00001;      // 反算精度

// ---------- 优先级倍率 ----------
// 对应 Habitica 的 0.1 / 1 / 1.5 / 2
export const PRIORITY_MULTIPLIERS = {
  trivial: 0.1,
  easy: 1,
  medium: 1.5,
  hard: 2,
};

// ---------- 连击 ----------
export const STREAK_BONUS_BASE = 0.01;    // 连击每 +1 奖励增加 1%
export const STREAK_MILESTONE = 7;        // 里程碑节点（7 天一个周期）

// ---------- 任务类型 ----------
export const TASK_TYPES = ['habit', 'daily', 'todo', 'reward'];

// ---------- 每日重置 ----------
export const DEFAULT_DAY_START = 0;       // 默认日起点 0:00

// ---------- 头衔（升级时自动解锁） ----------
export const TITLES = [
  { level: 1, title: '🌱 萌芽新手' },
  { level: 5, title: '🌿 坚持学徒' },
  { level: 10, title: '🌳 习惯小树' },
  { level: 15, title: '⭐ 一星达人' },
  { level: 21, title: '🔥 连击勇士' },     // 3 个里程碑周期
  { level: 30, title: '🌟 二星达人' },
  { level: 42, title: '⚡ 连击大师' },     // 6 个里程碑周期
  { level: 50, title: '👑 习惯之王' },
];

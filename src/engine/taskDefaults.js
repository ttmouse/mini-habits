// ============================================================
// Mini-Habits 游戏化引擎 — 任务默认值
// 参考 Habitica 的 taskDefaults，定义四种任务的初始状态
// ============================================================

import { TASK_TYPES } from './constants.js';

let _counter = 0;
function generateId() {
  _counter++;
  return `task_${Date.now()}_${_counter}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 创建一个新任务对象（纯数据，不含运行时状态）
 *
 * @param {Object} body - 请求体
 * @param {Object} user - 当前用户（用于获取 tasksOrder）
 * @returns {Object} 任务对象
 */
export default function taskDefaults(body, user) {
  const type = body.type || 'habit';

  // 基础任务结构
  const task = {
    _id: generateId(),
    type,
    text: body.text || '新任务',
    notes: body.notes || '',
    tags: body.tags || [],

    // 任务价值（核心数值）
    // 正 = 蓝色（经常做），负 = 红色（很少做）
    value: body.value !== undefined ? body.value : 0,

    // 优先级: trivial / easy / medium / hard
    priority: body.priority || 'easy',

    // 创建时间
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // === 各类型专属字段 ===

  if (type === 'habit') {
    // 习惯：可以 + 和/或 -
    task.up = body.up !== undefined ? body.up : true;
    task.down = body.down !== undefined ? body.down : true;
    task.counterUp = 0;   // 今日 + 次数
    task.counterDown = 0; // 今日 - 次数
    task.history = [];    // 历史记录 [{ date, value, scoredUp, scoredDown }]
  }

  if (type === 'daily') {
    // 每日任务：周期性
    task.completed = false;
    task.streak = 0;        // 连击天数
    task.frequency = body.frequency || 'daily'; // daily / weekly / monthly
    task.everyX = body.everyX || 1;

    // 每周重复（仅 frequency=weekly 时有效）
    task.repeat = body.repeat || {
      m: true, t: true, w: true, th: true,
      f: true, s: true, su: true,
    };

    task.startDate = body.startDate || new Date();
    task.history = [];
    task.isDue = false;
  }

  if (type === 'todo') {
    // 待办：一次性
    task.completed = false;
    task.dateCompleted = null;
    task.checklist = body.checklist || []; // [{ text, completed }]
  }

  if (type === 'reward') {
    // 奖励：用金币购买
    task.value = body.value || 10; // 价格
  }

  // === 附加到用户的 tasksOrder ===
  const taskListKey = `${type}s`; // habits, dailys, todos, rewards
  if (user && user.tasksOrder && user.tasksOrder[taskListKey]) {
    user.tasksOrder[taskListKey].unshift(task._id);
  }

  return task;
}

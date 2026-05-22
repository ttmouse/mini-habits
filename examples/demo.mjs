// ============================================================
// Mini-Habits 游戏化引擎 — 演示脚本
// 模拟一个典型小朋友的一天
// ============================================================

import {
  scoreTask,
  taskDefaults,
  runCron,
  getTitle,
  isStreakMilestone,
  expToNextLevel,
} from '../src/engine/index.js';

// ========== 初始化用户 ==========

const user = {
  _id: 'user_demo_001',
  stats: {
    lvl: 1,
    exp: 0,
    gp: 0,
    title: '',
  },
  tasksOrder: {
    habits: [],
    dailys: [],
    todos: [],
    rewards: [],
  },
  _tmp: {},
};

// ========== 创建任务 ==========

const habits = [
  taskDefaults({
    type: 'habit',
    text: '🚶 每天走 5000 步',
    up: true,
    down: false,  // 只能点 +，不能点 -
    priority: 'easy',
  }, user),

  taskDefaults({
    type: 'habit',
    text: '🥤 喝够 6 杯水',
    up: true,
    down: false,
    priority: 'easy',
  }, user),

  taskDefaults({
    type: 'habit',
    text: '📱 刷手机超过 1 小时',
    up: false,
    down: true,  // 只能点 -（坏习惯少做）
    priority: 'medium',
  }, user),
];

const dailies = [
  taskDefaults({
    type: 'daily',
    text: '📖 读 20 分钟书',
    priority: 'easy',
    frequency: 'weekly',
    repeat: { m: true, t: true, w: true, th: true, f: true, s: true, su: true },
  }, user),

  taskDefaults({
    type: 'daily',
    text: '🧹 整理书桌',
    priority: 'easy',
    frequency: 'weekly',
    repeat: { m: true, t: true, w: true, th: true, f: false, s: false, su: false },
  }, user),
];

const todos = [
  taskDefaults({
    type: 'todo',
    text: '🏫 完成科学课手工作业',
    priority: 'hard',
  }, user),
];

const rewards = [
  taskDefaults({
    type: 'reward',
    text: '🎮 多玩 30 分钟游戏',
    value: 50,
  }, user),

  taskDefaults({
    type: 'reward',
    text: '🍦 买一个冰淇淋',
    value: 30,
  }, user),
];

// ========== 模拟一周 ==========

console.log('╔══════════════════════════════════════════════╗');
console.log('║   🎮 Mini-Habits 游戏化引擎 — 模拟演示      ║');
console.log('╚══════════════════════════════════════════════╝');
console.log('');

function printStatus(day) {
  const title = user.stats.title || '无';
  const expNext = expToNextLevel(user.stats.lvl);
  const expProgress = ((user.stats.exp / expNext) * 100).toFixed(1);

  console.log(`  Lv.${user.stats.lvl} ${title}`);
  console.log(`  EXP: ${user.stats.exp}/${expNext} (${expProgress}%)`);
  console.log(`  🪙 金币: ${user.stats.gp}`);
  console.log('');
}

// ---- 第 1 天 ----
console.log('━━━ Day 1 ━━━');
scoreTask({ user, task: habits[0], direction: 'up' });  // 走了 5000 步
scoreTask({ user, task: habits[1], direction: 'up' });  // 喝够了水
scoreTask({ user, task: dailies[0], direction: 'up' }); // 读了书
printStatus(1);

// ---- 第 2 天 ----
console.log('━━━ Day 2 ━━━');
scoreTask({ user, task: habits[0], direction: 'up' });
scoreTask({ user, task: habits[1], direction: 'up' });
scoreTask({ user, task: dailies[0], direction: 'up' });
scoreTask({ user, task: dailies[1], direction: 'up' }); // 整理书桌
scoreTask({ user, task: habits[2], direction: 'down' }); // 没超时玩手机👍
printStatus(2);

// ---- 第 3 天 ----
console.log('━━━ Day 3 ━━━');
scoreTask({ user, task: habits[0], direction: 'up' });
scoreTask({ user, task: habits[1], direction: 'up' });
scoreTask({ user, task: dailies[0], direction: 'up' });
// 今天没整理书桌
printStatus(3);

// ---- 第 4 天 ----
console.log('━━━ Day 4 ━━━');
scoreTask({ user, task: habits[0], direction: 'up' });
// 喝水忘了
scoreTask({ user, task: dailies[0], direction: 'up' });
printStatus(4);

// ---- 第 5-7 天 - 连续完成核心习惯 ----
for (let d = 5; d <= 7; d++) {
  console.log(`━━━ Day ${d} ━━━`);
  scoreTask({ user, task: habits[0], direction: 'up' }); // ✅
  scoreTask({ user, task: habits[1], direction: 'up' }); // ✅
  scoreTask({ user, task: dailies[0], direction: 'up' }); // ✅

  if (isStreakMilestone(dailies[0].streak)) {
    console.log(`  🔥🔥🔥 连击 ${dailies[0].streak} 天！里程碑达成！`);
  }
  printStatus(d);
}

// ---- 完成待办 ----
console.log('━━━ 完成待办 ━━━');
scoreTask({ user, task: todos[0], direction: 'up' });
printStatus(7);

// ---- 买奖励 ----
console.log('━━━ 兑换奖励 ━━━');
console.log(`  金币: ${user.stats.gp}`);
try {
  scoreTask({ user, task: rewards[0], direction: 'up' });
  console.log('  ✅ 兑换了 "多玩 30 分钟游戏"');
} catch (e) {
  console.log(`  ❌ 金币不够: ${e.message}`);
}
printStatus(7);

// ---- 每日重置 ----
console.log('━━━ 每日重置（cron）━━━');
const report = runCron(user, dailies);
console.log(`  完成: ${report.completed} 个`);
console.log(`  错过: ${report.missed} 个`);
if (report.details.length > 0) {
  for (const d of report.details) {
    console.log(`    ${d.status === 'completed' ? '✅' : '❌'} ${d.text}`);
  }
}
printStatus(7);

// ---- 最终总结 ----
console.log('╔══════════════════════════════════════════════╗');
console.log('║   📊 一周总结                                ║');
console.log('╚══════════════════════════════════════════════╝');
console.log(`  等级：Lv.${user.stats.lvl} ${user.stats.title}`);
console.log(`  总经验：${user.stats.exp}`);
console.log(`  剩余金币：${user.stats.gp}`);
console.log(`  走步连击：${habits[0].counterUp} 天`);
console.log(`  喝水连击：${habits[1].counterUp} 天`);
console.log(`  读书连击：${dailies[0].streak} 天`);
console.log('');
console.log('  任务价值变化：');
for (const h of habits) {
  console.log(`    ${h.text}: ${h.value.toFixed(2)}`);
}
for (const d of dailies) {
  console.log(`    ${d.text}: ${d.value.toFixed(2)}`);
}
console.log('');
console.log('✨ 一周结束！明天继续！');

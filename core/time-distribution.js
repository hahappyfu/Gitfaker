/**
 * 生成自然的时间分布
 * 模拟真实开发节奏：工作日多、周末少，每天的 commit 分布不均匀
 */

/**
 * 判断是否是工作日
 */
function isWorkday(date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

/**
 * 在给定时间范围内生成 n 个均匀但有波动的 commit 时间点
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {number} count - commit 数量
 * @returns {Date[]} 排序后的时间数组
 */
function generateTimeDistribution(startDate, endDate, count) {
  const totalMs = endDate.getTime() - startDate.getTime();
  if (totalMs <= 0 || count <= 0) return [];

  const dates = [];
  const baseInterval = totalMs / count;

  for (let i = 0; i < count; i++) {
    // 基础位置 + 随机偏移（±20% 间隔）
    const jitter = (Math.random() - 0.5) * baseInterval * 0.4;
    const targetMs = startDate.getTime() + baseInterval * (i + 0.5) + jitter;

    let date = new Date(targetMs);

    // 调整：周末移到最近的工作日
    while (!isWorkday(date)) {
      date.setDate(date.getDate() + (date.getDay() === 0 ? 1 : -1));
    }

    // 调整时间到合理的工作时间（9:00-21:00）
    const hours = 9 + Math.floor(Math.random() * 12);
    const minutes = Math.floor(Math.random() * 60);
    date.setHours(hours, minutes, Math.floor(Math.random() * 60), 0);

    dates.push(date);
  }

  // 按时间排序
  dates.sort((a, b) => a.getTime() - b.getTime());
  return dates;
}

module.exports = { generateTimeDistribution };





import { Language } from '../types';

type Dictionary = Record<string, Record<Language, string>>;

const translations: Dictionary = {
  // General
  'app_title': { en: 'Pomodoro Friends', zh: '番茄好朋友' },
  'mode_countdown': { en: 'Countdown', zh: '倒计时' },
  'mode_flow': { en: 'Flow', zh: '心流' },
  
  // Status
  'status_ready_focus': { en: 'Ready to Focus', zh: '准备专注' },
  'status_ready_flow': { en: 'Ready to Flow', zh: '准备心流' },
  'status_tomato_batch': { en: 'Tomato {current}/{total}', zh: '第 {current}/{total} 个番茄' },
  'status_flowing': { en: 'Flowing...', zh: '心流进行中...' },
  'status_relax': { en: 'Relax Mode', zh: '休息一下' },
  'status_streak_protection': { en: 'Keep the Streak!', zh: '保持连击！' },
  'status_focus_msg': { en: 'Stay focused!', zh: '保持专注！' },
  'status_flow_msg': { en: 'Keep flowing...', zh: '保持节奏...' },
  'status_rest_msg': { en: 'Take a break.', zh: '休息时间到。' },

  // Picker
  'label_tomatoes': { en: 'Tomatoes', zh: '个番茄' }, // Changed to measure word
  'header_session_setup': { en: 'Session Setup', zh: '设置专注' },

  // Feedback / Toasts
  'msg_broken': { en: 'Tomato interrupted!', zh: '番茄被打断！' },
  'msg_streak_lost': { en: 'Streak Broken...', zh: '连击中断了...' },
  'msg_almost_there': { en: 'Almost there...', zh: '快完成了...' },
  'msg_reward_base': { en: 'Session Complete!', zh: '专注完成！' },
  'msg_reward_bonus': { en: '+{min}m Bonus!', zh: '+{min} 分钟奖励！' },
  'card_tomato_complete': { en: '✓ One Tomato Completed!', zh: '✓ 完成一个番茄！' },
  'card_session_complete': { en: '✓ {count} Tomatoes Completed!', zh: '✓ 完成了 {count} 个番茄！' },

  // Nav
  'nav_timer': { en: 'Timer', zh: '计时' },
  'nav_stats': { en: 'Stats', zh: '统计' },
  'nav_achievements': { en: 'Awards', zh: '成就' },
  'nav_ai': { en: 'Theme', zh: '主题' },
  'nav_user': { en: 'User', zh: '我的' },

  // Stats
  'stats_title': { en: 'Statistics', zh: '数据统计' },
  
  // Layer 1
  'stats_today_title': { en: 'Today', zh: '今日' },
  'stats_today_tomatoes': { en: 'Tomatoes', zh: '番茄数' },
  'stats_today_focus': { en: 'Focus Time', zh: '专注时长' },
  'stats_today_streak': { en: 'Max Session Streak', zh: '最长连续番茄' },
  'stats_today_interrupted': { en: 'Broken', zh: '中断次数' },
  'tooltip_interrupted': { en: 'Interruptions are counted if you cancel a tomato after 2 minutes.', zh: '每个番茄倒计时进行 2 分钟后取消，才会被记入中断次数。' },
  
  // Layer 1.5: Weekly
  'stats_week_title': { en: 'Weekly Report', zh: '本周概览' },
  'stats_week_avg': { en: 'Daily Avg', zh: '日均番茄' },
  'day_m': { en: 'M', zh: '一' },
  'day_t': { en: 'T', zh: '二' },
  'day_w': { en: 'W', zh: '三' },
  'day_th': { en: 'T', zh: '四' },
  'day_f': { en: 'F', zh: '五' },
  'day_s': { en: 'S', zh: '六' },
  'day_su': { en: 'S', zh: '日' },

  // Layer 1.8: Focus Hours (Golden Hour)
  'stats_focus_hours_title': { en: 'Focus Distribution', zh: '黄金时段分析' },
  'stats_focus_hours_best': { en: 'Golden Hour', zh: '最佳专注时段' },
  'advice_morning': { en: 'You are a Morning Bird! Tackle hard tasks early.', zh: '早起鸟！建议上午攻克最难的任务。' },
  'advice_afternoon': { en: 'Afternoon efficiency is high.', zh: '下午效率不错，保持节奏。' },
  'advice_evening': { en: 'You focus well in the evening.', zh: '晚上是你的专注高峰期。' },
  'advice_night': { en: 'Night Owl detected. Don\'t forget to sleep!', zh: '深夜党！注意保护视力和睡眠哦。' },
  'advice_balanced': { en: 'Your focus is well balanced.', zh: '你的专注时间分布很均衡。' },
  'advice_none': { en: 'Complete more tomatoes 🍅 to see analysis.', zh: '多完成几个番茄 🍅 来解锁分析。' },

  // Layer 2: Monthly Report
  'stats_month_title': { en: 'Monthly Report', zh: '月度统计' },
  'stats_month_total': { en: 'Total Tomatoes', zh: '本月总番茄' },
  'stats_month_daily_avg': { en: 'Daily Avg', zh: '日均番茄' },
  'stats_month_best_day': { en: 'Best Day', zh: '单日最高' },
  'stats_month_max_streak_session': { en: 'Max Streak', zh: '最高连续番茄' },
  'stats_month_max_streak_days': { en: 'Longest Streak', zh: '最长专注天数' },
  
  'stats_trend_up_title': { en: 'Great Progress!', zh: '进步明显！' },
  'stats_trend_down_title': { en: 'Keep Going!', zh: '继续加油！' },
  'stats_trend_up_desc': { en: '{pct}% more than last month.', zh: '比上月增加了 {pct}%。' },
  'stats_trend_down_desc': { en: '{pct}% less than last month.', zh: '比上月减少了 {pct}%。' },
  'stats_trend_neutral': { en: 'Steady Performance.', zh: '表现平稳。' },
  'stats_last_month': { en: 'Last Month', zh: '上个月' },
  'stats_this_month': { en: 'This Month', zh: '本月' },

  // Layer 3
  'stats_history_title': { en: 'All Time', zh: '历史总览' },
  'stats_history_days': { en: 'Days', zh: '坚持天数' },
  'stats_history_count': { en: 'Tomatoes', zh: '总番茄数' },

  // AI Summary
  'stats_ai_title': { en: 'AI Insight', zh: 'AI 智能总结' },
  'stats_ai_btn_generate': { en: 'Analyze My Data', zh: '生成分析报告' },
  'stats_ai_generating': { en: 'Analyzing...', zh: '正在分析数据...' },
  'stats_ai_placeholder': { en: 'Click to generate a personalized analysis of your productivity habits.', zh: '点击按钮，根据你的历史数据生成个性化的效率分析报告。' },

  // Achievements View
  'ach_title': { en: 'Achievements', zh: '成就馆' },
  'ach_unlocked': { en: 'Unlocked!', zh: '已解锁！' },
  'ach_locked': { en: 'Locked', zh: '未解锁' },
  'ach_tab_all': { en: 'All', zh: '全部' },
  'ach_tab_quantity': { en: 'Quantity', zh: '数量' },
  'ach_tab_continuity': { en: 'Continuity', zh: '坚持' },
  'ach_tab_habit': { en: 'Habit', zh: '习惯' },
  
  'ach_rarity_common': { en: 'Common', zh: '普通' },
  'ach_rarity_advanced': { en: 'Advanced', zh: '进阶' },
  'ach_rarity_rare': { en: 'Rare', zh: '罕见' },
  'ach_rarity_epic': { en: 'Epic', zh: '史诗' },
  'ach_rarity_legendary': { en: 'Legendary', zh: '传奇' },

  // AI Theme View
  'ai_title': { en: 'Magic Theme', zh: '魔法主题' },
  'ai_desc': { en: 'Create a custom background using AI. Describe what you want!', zh: '使用 AI 创造独一无二的背景。描述你想要的画面！' },
  'ai_placeholder': { en: 'e.g., A cozy coffee shop with rain outside...', zh: '例如：窗外下着雨的温馨咖啡馆...' },
  'ai_edit_placeholder': { en: 'e.g., Add a retro filter, Remove the cup...', zh: '例如：增加复古滤镜，移除桌上的杯子...' },
  'ai_generate': { en: 'Generate', zh: '生成背景' },
  'ai_generating': { en: 'Dreaming...', zh: '正在造梦...' },
  'ai_set_bg': { en: 'Set as Background', zh: '设为壁纸' },
  'ai_reset': { en: 'Reset to Default', zh: '恢复默认' },

  // User / Auth
  'auth_title': { en: 'User Profile', zh: '用户中心' },
  'auth_email': { en: 'Email', zh: '邮箱' },
  'auth_password': { en: 'Password', zh: '密码' },
  'auth_login': { en: 'Log In', zh: '登录' },
  'auth_signup': { en: 'Sign Up', zh: '注册' },
  'auth_logout': { en: 'Log Out', zh: '退出登录' },
  'auth_welcome': { en: 'Welcome back!', zh: '欢迎回来！' },
  'auth_desc_login': { en: 'Sync your tomatoes across devices.', zh: '登录以同步你的番茄数据。' },
  'auth_desc_profile': { en: 'Your data is syncing with the cloud.', zh: '你的数据正在云端同步。' },
  'auth_success': { en: 'Success!', zh: '操作成功！' },
  'auth_error': { en: 'Error', zh: '出错了' },

  // --- Achievement Items ---

  // Quantity
  'ach_qty_1_title': { en: 'Tiny Sprout', zh: '萌芽的小番茄' },
  'ach_qty_1_desc': { en: 'Complete your 1st tomato.', zh: '完成你的第 1 个番茄。' },

  'ach_qty_10_title': { en: 'First Basket', zh: '初学者的第一篮' },
  'ach_qty_10_desc': { en: 'Complete 10 tomatoes.', zh: '累计完成 10 个番茄。' },

  'ach_qty_50_title': { en: 'Steady Growth', zh: '稳定成长' },
  'ach_qty_50_desc': { en: 'Complete 50 tomatoes.', zh: '累计完成 50 个番茄。' },

  'ach_qty_100_title': { en: 'Tomato Expert', zh: '番茄达人' },
  'ach_qty_100_desc': { en: 'Complete 100 tomatoes.', zh: '累计完成 100 个番茄。' },

  'ach_qty_500_title': { en: 'Time Farmer', zh: '时间的耕耘者' },
  'ach_qty_500_desc': { en: 'Complete 500 tomatoes.', zh: '累计完成 500 个番茄。' },

  'ach_qty_1000_title': { en: 'Living Legend', zh: '专注传奇' },
  'ach_qty_1000_desc': { en: 'Complete 1000 tomatoes.', zh: '累计完成 1000 个番茄。' },

  // Continuity - Session
  'ach_cont_s2_title': { en: 'Double Tap', zh: '坚持就是胜利' },
  'ach_cont_s2_desc': { en: '2 tomatoes in a row.', zh: '连续完成 2 个番茄。' },

  'ach_cont_s4_title': { en: 'Flow State', zh: '心流初现' },
  'ach_cont_s4_desc': { en: '4 tomatoes in a row.', zh: '连续完成 4 个番茄。' },

  'ach_cont_s8_title': { en: 'Peak Focus', zh: '专注巅峰' },
  'ach_cont_s8_desc': { en: '8 tomatoes in a row.', zh: '连续完成 8 个番茄。' },

  // Continuity - Days
  'ach_cont_d3_title': { en: 'Good Start', zh: '好习惯的种子' },
  'ach_cont_d3_desc': { en: '3-day streak.', zh: '连续打卡 3 天。' },

  'ach_cont_d7_title': { en: 'Solid Roots', zh: '小小坚持' },
  'ach_cont_d7_desc': { en: '7-day streak.', zh: '连续打卡 7 天。' },

  'ach_cont_d14_title': { en: 'Moving Forward', zh: '稳步向前' },
  'ach_cont_d14_desc': { en: '14-day streak.', zh: '连续打卡 14 天。' },

  'ach_cont_d30_title': { en: 'Unstoppable', zh: '一个月的坚持' },
  'ach_cont_d30_desc': { en: '30-day streak.', zh: '连续打卡 30 天。' },

  // Habit
  'ach_habit_early_title': { en: 'Early Bird', zh: '清晨能量者' },
  'ach_habit_early_desc': { en: 'Finish a tomato between 5-8 AM.', zh: '在 5:00-8:00 间完成一个番茄。' },

  'ach_habit_night_title': { en: 'Midnight Hero', zh: '午夜番茄侠' },
  'ach_habit_night_desc': { en: 'Finish a tomato between 10PM-2AM.', zh: '在 22:00-02:00 间完成一个番茄。' },

  'ach_qual_zero_title': { en: 'Iron Will', zh: '超强控制力' },
  'ach_qual_zero_desc': { en: '3+ tomatoes today with 0 interruptions.', zh: '单日 3 个以上番茄且零中断。' },
  
  'ach_growth_3_title': { en: 'Daily Trio', zh: '三省吾身' },
  'ach_growth_3_desc': { en: 'Finish 3 tomatoes in one day.', zh: '单日完成 3 个番茄。' },

};

export const t = (key: string, lang: Language, params?: Record<string, string | number>): string => {
  const entry = translations[key];
  let str = entry ? entry[lang] : key;

  if (params) {
    Object.keys(params).forEach(param => {
      str = str.replace(`{${param}}`, String(params[param]));
    });
  }
  return str;
};
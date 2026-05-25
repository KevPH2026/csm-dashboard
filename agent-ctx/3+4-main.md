# Task 3+4: CS Outreach Task Generation & Operational Action Buttons

## Summary
Added two major features to the AIMI Dashboard:

### Feature 1: AI洞察生成CS触达任务 (AI Insight → CS Outreach Task Generation)
- **State**: Added `csTasks`, `taskDrawerOpen`, `taskGenerating` state variables
- **Function**: `handleGenerateCSTasks` - sends context to `/api/chat`, parses JSON response, creates task objects
- **Buttons added at 4 locations**:
  1. Module 1: Health distribution pie chart → "针对预警/危险客户生成触达"
  2. Module 3: LTV Comparison Cards → "生成交叉销售触达任务"
  3. Module 4: Each product line churn section → "生成挽回触达任务"
  4. Module 6: Each key issue card → "生成触达任务"
- **Drawer**: Slide-in panel from right with task list, priority coloring, status lifecycle (待处理→进行中→已完成)
- **Floating button**: Bottom-right FAB showing pending task count

### Feature 2: 下钻分析 (Drill-Down Analysis)
- **Function**: `handleDrillDown` - auto-switches to chat tab with contextual drill-down prompt
- **Buttons added at 4 locations**:
  1. Module 1: After three-dimension metrics → "AI下钻分析"
  2. Module 2: AIMI issues → "下钻同类问题客户"
  3. Module 2: Ads issues → "下钻同类问题客户"
  4. Module 5: Team efficiency table → "AI下钻低效客成分析"

## Files Modified
- `src/app/page.tsx` - All changes in this single file (state, functions, UI components)

## Build Status
- Lint: 0 errors, 2 pre-existing warnings
- Dev server: Compiled successfully

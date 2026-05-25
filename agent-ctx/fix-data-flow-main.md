# Task: Fix Data Flow - Real Excel Upload Data

## Summary
Fixed the core data flow problem where the dashboard always showed demo data even after real Excel uploads.

## Changes Made

### 1. `/home/z/my-project/src/app/api/dashboard/route.ts` (Major Fix)
**Problem:** The GET handler always generated `generateDemoCSRecords()` and `generateDemoSalesRecords()` for legacy metrics (anomalies, orderAnalysis, usageAnalysis, dangerDetails), even when real `csValueData` existed in the DB with `isDemo=false`.

**Fix:** Added conditional logic:
- When `isDemo === false` and real `csValueData` exists: Derive ALL legacy metrics from the real `csValueData`:
  - `metrics` (MetricResult[]) → built from `csValueData.healthOverview` product/effect/business side metrics + team efficiency
  - `anomalies` → generated from real CoreMetrics derived from csValueData
  - `orderAnalysis` → derived from `csValueData.multiProductValue`, `csValueData.productLineValue`, and `csValueData.teamEfficiency.csmDetails`
  - `usageAnalysis` → derived from `csValueData.productLineValue.aimi` metrics
  - `dangerDetails` → derived from `csValueData.healthOverview.healthDistribution` and `csValueData.keyIssues`
  - `healthDistribution` → taken directly from `csValueData.healthOverview.healthDistribution`
- When `isDemo === true` (no real data): Keep the original behavior of generating from demo records.

### 2. `/home/z/my-project/src/app/api/process/route.ts` (Better Logging)
**Problem:** Error logging for `generateCSValueDataFromReal` failures was minimal - just logged the error object.

**Fix:** Added:
- Pre-call log with exact input counts: `console.log('[Process] Calling generateCSValueDataFromReal with:', { csCount, salesCount, userCount, vocCount, adsPerfCount, siteAnaCount })`
- Enhanced error logging that extracts `err.message` and `err.stack` separately for easier debugging

### 3. `/home/z/my-project/src/app/page.tsx` (Flow Data Refresh)
**Problem:** After successful upload, the `handleUpload` function manually updated `flowData` state but didn't call `loadFlowData()` to refresh from the API, meaning flow data could be stale/inconsistent.

**Fix:** Added `loadFlowData()` call after incrementing the data version counter, ensuring the flow tab also reflects the newly uploaded real data from the server.

## Lint Results
- 0 errors, 2 pre-existing warnings (unrelated to changes)
- Dev server running and compiling successfully

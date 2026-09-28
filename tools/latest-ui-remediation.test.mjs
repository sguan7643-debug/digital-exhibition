// Historical entry retained: applicable page assertions now run in the maintained
// source-sync suite; missing fixture/component assertions are governed by the
// explicit retirement map instead of restoring mock business data.
await import('./ui-source-20260904-sync.test.mjs');
await import('./mounted-indicator-build-dialog.test.mjs');

console.log('历史 UI 修复入口已迁移到现存页面回归与明确退役映射');

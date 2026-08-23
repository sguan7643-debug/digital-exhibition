import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [projectPage, projectController, peoplePage, progressPage, operationsPage] = await Promise.all([
  read('src/pages/TalentProjectsPage.vue'),
  read('src/state/talent-project-controller.js'),
  read('src/pages/TalentPeoplePage.vue'),
  read('src/pages/TalentProgressPage.vue'),
  read('src/pages/OperationsPage.vue')
]);

assert.doesNotMatch(projectPage, /syncDrawer\(true\)/, 'talent projects must not open a drawer on initial entry');
assert.doesNotMatch(projectPage, /if\s*\(!value\s*&&\s*initial\)/, 'talent projects must not synthesize drawer=create');
assert.match(projectController, /pageSize\s*:\s*10/, 'talent project pagination defaults to 10 rows');
for (const [name, source] of [['people', peoplePage], ['projects', projectPage], ['progress', progressPage]]) {
  assert.match(source, /PaginationControl/, `${name} must use the shared PaginationControl`);
}
assert.match(operationsPage, /createOperationsController/, 'operations view must use deterministic interactive data');
assert.match(operationsPage, /aria-pressed/, 'period controls must expose their selected state');
assert.match(operationsPage, /type="date"/, 'operations date range must use real date controls');
assert.match(operationsPage, /role="img"[^>]*aria-label=/, 'charts must expose a text alternative');

const { createOperationsController } = await import('../src/state/operations-controller.js');
const operations = createOperationsController();
const weekVisits = operations.stats[0].value;
operations.setPeriod('month');
assert.equal(operations.period, 'month');
assert.notEqual(operations.stats[0].value, weekVisits, 'changing period must update the metric fixture');
assert.equal(operations.range.start, '2026-08-01');
operations.setRange('start', '2026-08-05');
operations.setRange('end', '2026-08-19');
assert.equal(operations.period, 'custom');
assert.equal(operations.rangeLabel, '2026-08-05 至 2026-08-19');
assert.equal(operations.trend.length, 7, 'custom range keeps a stable seven-point visual fixture');
console.log('shared controls remediation tests passed');

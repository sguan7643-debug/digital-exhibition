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

const [appsPage, favoritesPage, messagesPage, announcementsPage, appController, contentControllers] = await Promise.all([
  read('src/pages/AppsPage.vue'), read('src/pages/FavoritesPage.vue'), read('src/pages/MessagesPage.vue'),
  read('src/pages/AnnouncementsPage.vue'), read('src/state/interaction-controllers.js'), read('src/state/content-controllers.js')
]);

assert.doesNotMatch(projectPage, /syncDrawer\(true\)/, 'talent projects must not open a drawer on initial entry');
assert.doesNotMatch(projectPage, /if\s*\(!value\s*&&\s*initial\)/, 'talent projects must not synthesize drawer=create');
assert.match(projectController, /pageSize\s*:\s*10/, 'talent project pagination defaults to 10 rows');
for (const [name, source] of [['people', peoplePage], ['projects', projectPage], ['progress', progressPage]]) {
  assert.match(source, /PaginationControl/, `${name} must use the shared PaginationControl`);
}
for (const [name, source] of [['apps',appsPage],['favorites',favoritesPage],['messages',messagesPage],['announcements',announcementsPage]]) {
  assert.match(source, /PaginationControl/, `${name} must use the shared PaginationControl`);
}
assert.match(appController, /pageSize\s*:\s*10/, 'apps default to 10 rows');
assert.match(appController, /get pagedResults\(\)/, 'apps expose the current page subset');
assert.match(contentControllers, /createFavoritesController[\s\S]*?pageSize\s*:\s*10/, 'favorites default to 10 rows');
assert.equal((contentControllers.match(/setPageSize\(value\)/g)||[]).length>=2,true,'messages and favorites expose page-size changes');
assert.match(operationsPage, /integrationData\?\.\['OPS-001'\]/, 'operations view must use the real dashboard read');
assert.match(operationsPage, /integrationData\?\.\['OPS-003'\]/, 'operations view must use the real metric-definition read');
assert.match(operationsPage, /pageState=computed/, 'operations view must expose remote loading, error, empty and permission states');
assert.match(operationsPage, /aria-pressed/, 'period controls must expose their selected state');
assert.match(operationsPage, /type="date"/, 'operations date range must use real date controls');
assert.match(operationsPage, /type="date" disabled/, 'date controls remain explicitly disabled until the real write contract is available');
assert.match(operationsPage, /role="img"[^>]*aria-label=/, 'charts must expose a text alternative');
console.log('shared controls remediation tests passed');

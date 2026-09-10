import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = async path => readFile(new URL(path, root), 'utf8');
const training = await read('src/pages/TrainingPage.vue');
const favorites = await read('src/pages/FavoritesPage.vue');
const details = await read('src/components/AppDetailLiveSections.vue');
const apps = await read('src/pages/AppsPage.vue');
const app = await read('src/App.vue');

assert.match(training, /integrationData\?\.\['TRN-002'\]/, '培训列表必须消费 TRN-002 真实课程');
assert.match(training, /buildApplicationWriteInput\('TRN-004'/, '培训报名必须创建 TEST_ 写入输入');
assert.match(training, /operationExecutor\('TRN-006'/, '进入课程必须先走 TRN-006 权限结果');
assert.doesNotMatch(training, /为本地演示操作/, '真实培训操作不得冒充本地成功');

assert.match(favorites, /actionExecutor/, '收藏页必须接入受控写执行器');
assert.match(favorites, /actionExecutor\("FAV-004"/, '收藏页必须用精确收藏记录执行 FAV-004');
assert.match(favorites, /favoriteVersion/, '取消收藏必须携带服务端版本');
assert.doesNotMatch(favorites, /真实收藏取消写操作尚未开放/, '受控 TEST_ 收藏必须允许真实取消');

assert.match(details, /resolveLiveApplicationId\(props\.integrationData\)/, '详情动作必须使用 APP-003 返回的应用 ID');
assert.match(details, /resolveDownloadFileId\(material\)/, '素材下载必须使用真实文件 ID');
assert.doesNotMatch(details, /APP006/, '详情动作不得硬编码应用 ID');

assert.match(apps, /launchApplication\(props\.operationExecutor/, '应用卡片必须先通过 APP-004 权限校验');
assert.match(apps, /buildApplicationWriteInput\('APP-005'/, '应用卡片申请使用必须建立 TEST_ 写入输入');
assert.doesNotMatch(apps, /申请使用为本地演示操作/, '应用卡片不得把申请使用伪装成本地成功');

assert.match(app, /<training-page[\s\S]*?:integration-data="integrationEnvelope\.data"/, 'App 必须向培训页传入实时数据');
assert.match(app, /<favorites-page[\s\S]*?:action-executor="executePageWriteOperation"/, 'App 必须向收藏页传入受控写执行器');

console.log('application pages wire real training, favorites, detail actions, and canonical resources');

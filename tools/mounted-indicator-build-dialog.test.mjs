import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileScript, parse } from '@vue/compiler-sfc';
import { createRenderer, h, nextTick } from 'vue';

globalThis.window = globalThis;
globalThis.Document = class Document {};
globalThis.document = new globalThis.Document();
globalThis.document.activeElement = null;

const flatten = node => [node, ...(node.children || []).flatMap(flatten)];
const textOf = node => [node.text || '', ...(node.children || []).map(textOf)].join('');
const hostOps = {
  createElement(type) {
    return {
      type, props: {}, children: [], text: '', open: false,
      get options() { return this.children.filter(child => child.type === 'option'); },
      focus() { globalThis.document.activeElement = this; },
      showModal() { this.open = true; this.props.open = ''; globalThis.document.activeElement = this; },
      close() { this.open = false; delete this.props.open; },
      reportValidity() { return true; },
      addEventListener(event, handler) { this.props[`native:${event}`] = handler; },
      removeEventListener(event) { delete this.props[`native:${event}`]; },
      setAttribute(key, value) { this.props[key] = value; },
      removeAttribute(key) { delete this.props[key]; },
      getRootNode() { return globalThis.document; }
    };
  },
  createText: text => ({ type: '#text', text }),
  createComment: text => ({ type: '#comment', text }),
  setText: (node, text) => { node.text = text; },
  setElementText: (node, text) => { node.text = text; node.children = []; },
  parentNode: node => node.parent || null,
  nextSibling: () => null,
  insert: (child, parent) => { child.parent = parent; parent.children.push(child); },
  remove: child => { if (child.parent) child.parent.children = child.parent.children.filter(node => node !== child); },
  patchProp: (node, key, _old, value) => { node.props[key] = value; },
  insertStaticContent(content, parent) { const node = { type: '#static', text: content, parent }; parent.children.push(node); return [node, node]; }
};

const fileUrl = new URL('../src/components/IndicatorBuildDialog.vue', import.meta.url);
const { descriptor, errors } = parse(readFileSync(fileUrl, 'utf8'), { filename: fileUrl.pathname });
assert.deepEqual(errors, []);
let code = compileScript(descriptor, { id: 'mounted-indicator-dialog', inlineTemplate: true }).content;
const vueUrl = new URL('../node_modules/vue/index.mjs', import.meta.url).href;
code = code.replace(/from\s+(['"])vue\1/g, `from '${vueUrl}'`);
code = code.replace(/import\s+TypeLineIcon\s+from\s+['"][^'"]+\.vue['"];?/, "const TypeLineIcon=globalThis.__indicatorTypeLineIconStub;");
globalThis.__indicatorTypeLineIconStub = { props: ['name', 'size'], render() { return h('span', { 'data-line-icon': this.name }); } };
const component = (await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).default;
const renderer = createRenderer(hostOps);
const root = { type: 'root', children: [] };
const app = renderer.createApp(component, { appName: '经营分析可视化报表' });
const vm = app.mount(root);
await nextTick();

const nodes = () => flatten(root);
const trigger = { type: 'button', focused: false, focus() { this.focused = true; globalThis.document.activeElement = this; } };
trigger.focus();
await vm.open();
await nextTick();
trigger.focused = false;
let dialog = nodes().find(node => node.type === 'dialog');
assert.equal(dialog.open, true, '公开 open 必须打开真实 dialog');
assert.equal(dialog.props.role, 'dialog', '弹窗必须显式声明 dialog 角色');
assert.equal(dialog.props['aria-modal'], 'true', '弹窗必须显式声明 aria-modal');
assert.match(globalThis.document.activeElement?.props?.placeholder || '', /指标名称/, '打开后初始焦点必须进入首个字段');

const cancelButton = nodes().find(node => node.type === 'button' && textOf(node) === '取消');
await cancelButton.props.onClick();
await nextTick();
assert.equal(dialog.open, false, '取消必须关闭弹窗');
assert.equal(trigger.focused, true, '取消后必须恢复触发器焦点');

trigger.focus();
await vm.open();
await nextTick();
trigger.focused = false;
dialog = nodes().find(node => node.type === 'dialog');
let prevented = false;
await dialog.props.onCancel({ preventDefault() { prevented = true; } });
await nextTick();
assert.equal(prevented, true, 'Escape/cancel 必须阻止浏览器绕过受控关闭');
assert.equal(dialog.open, false, 'Escape/cancel 必须关闭弹窗');
assert.equal(trigger.focused, true, 'Escape 关闭后必须恢复触发器焦点');

console.log('真实 IndicatorBuildDialog mounted：打开、模态语义、取消、Escape 与焦点恢复通过');

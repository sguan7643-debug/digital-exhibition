function setEntrySurface(root, content) {
  if (!root) return;
  root.innerHTML = `<main role="status" aria-live="polite" aria-atomic="true" style="display:grid;min-height:100vh;place-items:center;padding:24px"><section style="max-width:420px;padding:24px;text-align:center">${content}</section></main>`;
}

function renderChecking(root) {
  setEntrySurface(root, '<h1>正在确认登录状态</h1><p>请稍候，确认后将加载页面。</p>');
}

function renderUnavailable(root, retry) {
  setEntrySurface(root, '<h1>暂时无法确认登录状态</h1><p>请重试登录检查，确认后再加载页面数据。</p><button type="button" data-entry-retry>重试登录检查</button>');
  root?.querySelector?.('[data-entry-retry]')?.addEventListener('click', retry);
}

function renderOutsideBase(root) {
  setEntrySurface(root, '<h1>无法打开此地址</h1><p>请从当前应用入口重新进入。</p>');
}

export async function bootstrapEntryAuthorization({ root, entryAuthGuard, mount }) {
  async function decide() {
    renderChecking(root);
    const entryAuth = await entryAuthGuard.ensureAuthorized();
    if (entryAuth.authorized && entryAuth.render) {
      mount(entryAuth);
      return entryAuth;
    }
    if (entryAuth.reason === 'session-unavailable') {
      renderUnavailable(root, decide);
    } else if (entryAuth.reason === 'outside-app-base') {
      renderOutsideBase(root);
    }
    return entryAuth;
  }

  return decide();
}

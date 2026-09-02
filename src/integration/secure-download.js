export function startSameOriginDownload(rawUrl, fileName = '') {
  const target = new URL(String(rawUrl || ''), window.location.origin);
  if (target.origin !== window.location.origin) throw new Error('下载地址不是受控同源地址');
  const link = document.createElement('a');
  link.href = `${target.pathname}${target.search}${target.hash}`;
  if (fileName) link.download = fileName;
  link.rel = 'noopener';
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function startFeishuLogin(returnTo = window.location.pathname) {
  const safeReturnTo = String(returnTo || '/');
  window.location.href = `/api/v1/auth/feishu/start?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

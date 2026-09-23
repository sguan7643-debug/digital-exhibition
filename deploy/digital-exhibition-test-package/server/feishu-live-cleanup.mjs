export async function cleanupAndVerify({ targets, cleanup }) {
  if (!Array.isArray(targets) || typeof cleanup !== 'function') throw new Error('清理验证参数无效');
  const outcomes = [];
  for (const target of targets) {
    try {
      await cleanup(target);
      outcomes.push({ target, ok: true });
    } catch (error) {
      outcomes.push({ target, ok: false, errorCode: error?.code || 'CLEANUP_FAILED', errorMessage: String(error?.message || error).slice(0, 240) });
    }
  }
  return { ok: outcomes.every(item => item.ok), outcomes };
}

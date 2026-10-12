import { readFileSync } from 'node:fs';

export function loadFormalDictionaryBaseline(filePath = process.env.FEISHU_FORMAL_DICTIONARY_BASELINE_PATH) {
  const normalized = String(filePath || '').trim();
  if (!normalized) return null;
  try {
    const parsed = JSON.parse(readFileSync(normalized, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? Object.freeze(parsed) : null;
  } catch {
    return null;
  }
}

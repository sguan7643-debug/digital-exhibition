import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { clearReadCacheOperations } from '../server/clear-read-cache-operations.mjs';

function checksum(document) {
  return createHash('sha256').update(JSON.stringify({
    version: document.version,
    namespace: document.namespace,
    writtenAt: document.writtenAt,
    entries: document.entries
  })).digest('hex');
}

const directory = await mkdtemp(join(tmpdir(), 'deh-cache-clean-'));
try {
  const filePath = join(directory, 'feishu-read-cache-v1.json');
  const document = {
    version: 1,
    namespace: 'test',
    writtenAt: '2026-10-12T00:00:00.000Z',
    entries: ['COM-001', 'COM-004', 'APP-001', 'APP-002', 'HOM-001', 'WB-002', 'COM-005'].map((operationId, index) => ({
      key: `key-${index}`, operationId, value: { code: 'OK' }, createdAt: 1, lastAccessedAt: 1,
      freshUntil: 9_999_999_999_999, staleUntil: 9_999_999_999_999, dependencies: []
    }))
  };
  document.checksum = checksum(document);
  await writeFile(filePath, `${JSON.stringify(document)}\n`, 'utf8');
  const result = await clearReadCacheOperations({ filePath, now: () => new Date('2026-10-12T01:00:00.000Z') });
  assert.equal(result.removed, 6);
  const cleaned = JSON.parse(await readFile(filePath, 'utf8'));
  assert.deepEqual(cleaned.entries.map(entry => entry.operationId), ['COM-005']);
  assert.equal(cleaned.checksum, checksum(cleaned), '清理后的持久快照校验和必须重新生成');
} finally {
  await rm(directory, { recursive: true, force: true });
}

console.log('targeted read-cache operation cleanup passed');

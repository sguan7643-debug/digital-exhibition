import { createHash } from 'node:crypto';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const ONBOARDING_POC_EVIDENCE_VERSION = 'DEH-ONBOARDING-POC-evidence.v1';

export function sha256(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

export function redactIdentifier(value) {
  const normalized = String(value || '');
  return normalized ? { sha256: sha256(normalized), suffix: normalized.slice(-4), length: normalized.length } : null;
}

export function createRedactedEvidence({ phase, passed, runId = '', identity = {}, checks = {}, failure = null, startedAt, completedAt = new Date().toISOString() } = {}) {
  return Object.freeze({
    version: ONBOARDING_POC_EVIDENCE_VERSION,
    phase: String(phase || ''),
    passed: Boolean(passed),
    startedAt: String(startedAt || completedAt),
    completedAt,
    run: redactIdentifier(runId),
    identity: {
      user: redactIdentifier(identity.userId || identity.subject || identity.openId),
      displayNamePresent: Boolean(identity.displayName || identity.name)
    },
    checks,
    failure: failure ? { code: String(failure.code || 'POC_FAILED'), message: String(failure.message || failure).slice(0, 300) } : null,
    secretsIncluded: false
  });
}

export function writeRedactedEvidence(path, evidence) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  renameSync(temporary, path);
}

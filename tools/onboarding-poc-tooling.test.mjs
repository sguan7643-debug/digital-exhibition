import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cli = readFileSync(new URL('./feishu-onboarding-poc.mjs', import.meta.url), 'utf8');
const verifier = readFileSync(new URL('./verify-live-onboarding-poc.mjs', import.meta.url), 'utf8');
const evidence = readFileSync(new URL('../server/contracts/feishu-onboarding-poc-evidence.mjs', import.meta.url), 'utf8');

assert.doesNotMatch(cli, /feishu-schema-migrate|missing-table-manifest/, 'POC CLI must not call the general schema migrator');
assert.match(cli, /--apply-schema/);
assert.match(cli, /--prepare-data/);
assert.match(cli, /--cleanup/);
assert.match(verifier, /launchPersistentContext\(/);
assert.doesNotMatch(verifier, /page\.route\(/, 'live verifier must not intercept requests');
assert.match(verifier, /\/api\/v1\/onboarding\/applications/);
assert.match(verifier, /applicationId/);
assert.match(verifier, /poc-attachment\.pdf/);
assert.match(verifier, /FEISHU_VERIFY_RESTART_COMMAND_JSON/);
assert.match(verifier, /FEISHU_ONBOARDING_POC_AUTOMATION_EVIDENCE_PATH/);
assert.match(verifier, /elapsedMs[\s\S]*8\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
assert.match(verifier, /['"]\/api\/v1\/onboarding\/applications['"]/);
assert.match(verifier, /\/grant/);
assert.match(verifier, /ONBOARDING_POC_MANIFEST_SHA256/);
assert.match(verifier, /RETAINED_PENDING_GC/);
assert.doesNotMatch(verifier, /restartAndEightDayAutomatedTest/);
assert.match(verifier, /requestInterception:\s*false/);
assert.match(evidence, /sha256/);
assert.doesNotMatch(evidence, /accessToken\s*:/);

console.log('dedicated POC CLI and redacted real-browser evidence contracts passed');

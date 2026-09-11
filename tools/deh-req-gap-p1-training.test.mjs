import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/pages/TrainingPage.vue', import.meta.url), 'utf8');

assert.match(source, /remoteMode\.value \? remoteCourses\.value : courses/, 'training remote mode must use only TRN-002 projection');
assert.doesNotMatch(source, /Array\.isArray\(remoteCourses\.value\) \? remoteCourses\.value : courses/, 'training remote errors must not fall back to local courses');
assert.match(source, /remoteState\.value === "error" \|\| remoteState\.value === "authentication-required"/, 'training remote error/auth must show a true failure boundary');
assert.match(source, /remoteState\.value === "empty"/, 'training remote empty must show a true empty boundary');
assert.match(source, /const tabs = computed\(\(\) =>/, 'training tab counts must be derived from current course data');
assert.doesNotMatch(source, /const tabs = \[\s*\[\s*"全部",\s*186\s*\]/, 'training tabs must not keep fixed mock counts in remote mode');
assert.match(source, /courseSource\.value\.length/, 'training total count must come from current data');
assert.match(source, /props\.integrationData\?\.\['TRN-002'\]/, 'training page must consume TRN-002');

console.log('P1 training remote-only TRN-002 projection contract passed');

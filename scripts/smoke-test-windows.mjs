// Portable installation checks matching the live checks in smoke-test.sh.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(root, 'cli', 'brs.js');
const tag = `windows-smoke-${Date.now()}`;
const outputDir = join(root, 'data', tag);
mkdirSync(outputDir, { recursive: true });
const pause = () => new Promise(resolve => setTimeout(resolve, 100));
const checks = [];
let ownedLease;

async function command(args, expectFailure = false) {
  await pause();
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (expectFailure) {
    assert.notEqual(result.status, 0, 'Expected extractor failure');
    const match = result.stderr.trim().match(/failed: 500 (\{.*\})$/s);
    assert.ok(match, result.stderr);
    return JSON.parse(match[1]);
  }
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function localArtifact(artifact) {
  assert.ok(artifact.path.startsWith('/artifacts/'));
  const base = join(root, 'artifacts');
  const path = resolve(base, artifact.path.slice('/artifacts/'.length));
  assert.ok(path.startsWith(base + sep));
  return path;
}

function verifyArtifacts(payload) {
  assert.equal(payload.lease.status, 'released');
  assert.ok(payload.artifacts.length > 0);
  for (const artifact of payload.artifacts) {
    const size = statSync(localArtifact(artifact)).size;
    assert.ok(size > 0);
    if (artifact.bytes != null) assert.equal(size, artifact.bytes);
  }
}

function pass(name, value) {
  writeFileSync(join(outputDir, `${name}.json`), JSON.stringify(value, null, 2));
  checks.push(name);
  console.log(`PASS ${name}`);
}

try {
  const status = await command(['status']);
  assert.equal(status.extensionConnected, true);
  assert.equal(status.stealth.mode, 'trusted-real-browser');
  assert.equal(status.stealth.enabled, false);
  assert.equal(status.platformPacing.enabled, true);
  assert.equal(status.tlsGateway.enabled, false);
  pass('status', status);

  const fetched = await command(['fetch', 'https://example.com', '--agent', 'deploy-check', '--task', `${tag}-fetch`, '--screenshot', '--humanize', 'enhanced']);
  verifyArtifacts(fetched);
  assert.ok(fetched.artifacts.some(a => a.kind === 'screenshot'));
  pass('fetch', fetched);

  const probe = await command(['probe-session', 'generic', '--url', 'https://example.com', '--agent', 'deploy-check', '--task', `${tag}-probe`, '--humanize', 'off']);
  verifyArtifacts(probe);
  assert.equal(probe.probe.platform, 'generic');
  assert.ok(probe.probe.currentUrl);
  assert.ok(Object.hasOwn(probe.probe, 'connected'));
  pass('session-probe', probe);

  const extracted = await command(['extract', 'example.extract.js', 'https://example.com', '--agent', 'deploy-check', '--task', `${tag}-extract`, '--screenshot', '--save-html', '--humanize', 'enhanced', '--params', JSON.stringify({ includeLength: true }), '--max-attempts', '2']);
  verifyArtifacts(extracted);
  const resultArtifact = extracted.artifacts.find(a => ['result', 'extract-result'].includes(a.kind));
  assert.ok(resultArtifact);
  const result = JSON.parse(readFileSync(localArtifact(resultArtifact), 'utf8'));
  assert.equal(result.title, 'Example Domain');
  assert.ok(result.htmlLength > 0);
  pass('extract', extracted);

  const job = await command(['job', extracted.job.id]);
  assert.equal(job.status, 'success');
  assert.ok(job.logs.length > 0);
  const artifacts = await command(['artifacts', '--leaseId', extracted.job.id]);
  assert.ok(artifacts.artifacts.length >= 3);
  const artifactId = extracted.artifacts[0].id;
  const artifactMetadata = await command(['artifact', artifactId]);
  const downloaded = await command(['artifact-download', artifactId, join(outputDir, 'downloaded-artifact')]);
  assert.ok(downloaded.bytes > 0);
  pass('artifact-apis', { job, artifacts, artifactMetadata, downloaded });

  const failed = await command(['extract', 'failing.extract.js', 'https://example.com', '--agent', 'deploy-check', '--task', `${tag}-failure`, '--humanize', 'minimal', '--params', JSON.stringify({ reason: 'smoke failure' }), '--max-attempts', '2'], true);
  assert.equal(failed.job.status, 'failed');
  assert.equal(failed.job.attempts, 2);
  assert.ok(JSON.stringify(failed).includes('INTENTIONAL_SMOKE_FAILURE'));
  assert.ok(failed.artifacts.some(a => a.kind === 'error' && a.bytes > 0));
  pass('failure-retry', failed);

  const lease = await command(['acquire', '--agentId', 'deploy-check', '--taskId', `${tag}-lease`, '--domain', 'example.com']);
  ownedLease = lease.id;
  const opened = await command(['open', ownedLease, 'https://example.com', '--active', 'false', '--humanize', 'enhanced']);
  assert.ok(opened.tab.groupId != null && opened.tab.groupId !== -1);
  await command(['release', ownedLease]);
  ownedLease = undefined;
  pass('grouped-tab-lease', opened);

  const summary = { success: true, checkedAt: new Date().toISOString(), checks, outputDir };
  writeFileSync(join(root, 'data', 'installation-verification.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
} finally {
  if (ownedLease) await command(['release', ownedLease]).catch(() => {});
}

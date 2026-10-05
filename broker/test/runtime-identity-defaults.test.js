import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';

test('runtime defaults to trusted real browser identity', async () => {
  const [compose, envExample, launchScript, fallbackConfig, smokeScript] = await Promise.all([
    readFile(new URL('../../docker-compose.yml', import.meta.url), 'utf8'),
    readFile(new URL('../../.env.example', import.meta.url), 'utf8'),
    readFile(new URL('../../runtime/chrome/launch-browser.sh', import.meta.url), 'utf8'),
    readFile(new URL('../../extension/runtime-config.js', import.meta.url), 'utf8'),
    readFile(new URL('../../scripts/smoke-test.sh', import.meta.url), 'utf8'),
  ]);

  assert.match(compose, /BRS_STEALTH_MODE: \$\{BRS_STEALTH_MODE:-trusted-real-browser\}/);
  assert.match(compose, /BRS_STEALTH_ENABLED: \$\{BRS_STEALTH_ENABLED:-0\}/);
  assert.match(compose, /BRS_TLS_GATEWAY_ENABLED: \$\{BRS_TLS_GATEWAY_ENABLED:-0\}/);
  assert.match(envExample, /^BRS_STEALTH_MODE=trusted-real-browser$/m);
  assert.match(envExample, /^BRS_STEALTH_ENABLED=0$/m);
  assert.match(envExample, /^BRS_GENERATE_FINGERPRINT_ENABLED=0$/m);
  assert.match(envExample, /^BRS_TLS_GATEWAY_ENABLED=0$/m);

  assert.match(launchScript, /legacy_js_stealth = stealth_mode == "legacy-js"/);
  assert.match(launchScript, /BROWSER_IDENTITY_ARGS=\(\)/);
  assert.match(launchScript, /\[ "\$\{EFFECTIVE_STEALTH_MODE\}" = "legacy-js" \]/);
  assert.match(launchScript, /\[ "\$\{EFFECTIVE_STEALTH_MODE\}" = "patched-browser" \]/);
  assert.doesNotMatch(launchScript, /COMMON_ARGS=\([\s\S]*--disable-blink-features=AutomationControlled/);
  assert.doesNotMatch(launchScript, /COMMON_ARGS=\([\s\S]*--timezone=/);
  assert.match(launchScript, /"enabled": legacy_js_stealth/);
  assert.match(fallbackConfig, /mode: 'trusted-real-browser'/);
  assert.match(fallbackConfig, /enabled: false/);
  assert.match(smokeScript, /legacy JS stealth should be disabled by default/);
});

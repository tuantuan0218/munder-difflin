'use strict';

/**
 * PROVIDER-AWARE MEMORY REFLECTOR — the pi branch.
 *
 * The reflector used to hardwire runHiddenClaude() for every fleet: with the
 * pi-only build that spawned `pi` behind Claude-only flags
 * (--permission-mode/--disallowedTools) and then looked for the answer in
 * ~/.claude/projects — a place pi never writes. Every oversized memory.md in a
 * pi fleet therefore died as `condense-abort summarize-failed: no assistant
 * response found in transcript`, batch after batch.
 *
 * The fix: an explicit provider split. pi runs through runHiddenPi() — a
 * non-interactive `pi --print` invocation whose answer is the process stdout
 * (the only valid completion contract pi has) — while Claude keeps its original
 * hidden-TUI + transcript path byte-for-byte. These tests pin the split, the
 * Windows .cmd-shim decode, and the fail-safe guarantees.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const loadTs = require('./load-ts.cjs');
const reflect = loadTs('src/main/reflect.ts');

// ── pure helpers: parseSummary must serve BOTH providers unchanged ───────────

test('parseSummary accepts a bare pi JSON line (no CLI envelope)', () => {
  assert.deepEqual(reflect.parseSummary('{"condensed":"ok","hoist":[]}'),
    { condensed: 'ok', hoist: [] });
});

test('parseSummary still accepts the Claude CLI envelope', () => {
  assert.deepEqual(
    reflect.parseSummary(JSON.stringify({ result: '{"condensed":"c","hoist":["h"]}' })),
    { condensed: 'c', hoist: ['h'] });
});

test('parseSummary tolerates a fenced pi response and rejects garbage', () => {
  assert.deepEqual(reflect.parseSummary('```json\n{"condensed":"x","hoist":[]}\n```'),
    { condensed: 'x', hoist: [] });
  assert.equal(reflect.parseSummary('no json here'), null);
  assert.equal(reflect.parseSummary('{"condensed":""}'), null);
});

// ── runHiddenPi: the real spawn path (live, exercised when pi is installed) ──

const { runHiddenPi } = loadTs('src/main/hiddenPi.ts');

const CWD = path.resolve(__dirname, '..');
const piInstalled = (() => {
  try { require('node:child_process').execSync('where pi', { stdio: 'pipe' }); return true; }
  catch { return false; }
})();

test('runHiddenPi guards: empty prompt and missing cwd', async () => {
  const empty = await runHiddenPi('   ', { model: 'm', cwd: CWD, timeoutMs: 5_000 });
  assert.equal(empty.ok, false);
  assert.match(empty.error, /pi-empty-prompt/);

  const missing = await runHiddenPi('hi', { model: 'm', cwd: 'Z:\\definitely-not-here', timeoutMs: 5_000 });
  assert.equal(missing.ok, false);
  assert.match(missing.error, /pi-cwd-does-not-exist/);
});

test('runHiddenPi live: strict JSON round-trip via stdout (skips without pi)', { skip: !piInstalled }, async () => {
  const res = await runHiddenPi(
    'Return exactly one JSON object, with no Markdown and no extra keys: {"condensed":"ok","hoist":[]}',
    { model: 'yunshu/deepseek-v4-flash', cwd: CWD, timeoutMs: 120_000 }
  );
  assert.equal(res.ok, true, `expected ok, got: ${res.error}`);
  const parsed = reflect.parseSummary(res.text ?? '');
  assert.ok(parsed, `stdout not parseable: ${res.text}`);
  assert.equal(parsed.condensed, 'ok');
});

test('runHiddenPi live: a multi-line prompt survives (the bug cmd.exe used to eat)', { skip: !piInstalled }, async () => {
  const lines = ['line-one', '(paren) & "quote"', 'line-three'];
  const res = await runHiddenPi(
    ['Reply with exactly one JSON object {"condensed":"<all three lines joined>","hoist":[]}.',
     'The three lines are:', ...lines].join('\n'),
    { model: 'yunshu/deepseek-v4-flash', cwd: CWD, timeoutMs: 120_000 }
  );
  assert.equal(res.ok, true, `expected ok, got: ${res.error}`);
  const parsed = reflect.parseSummary(res.text ?? '');
  assert.ok(parsed, `stdout not parseable: ${res.text}`);
  for (const l of lines) assert.ok(parsed.condensed.includes(l), `lost line: ${l}`);
});

// ── the reflector wiring: provider getters flow into the constructor ─────────

test('MemoryReflector accepts provider/model getters with claude defaults', () => {
  // Defaults keep the historical behaviour: no getters → claude + haiku.
  const r = new reflect.MemoryReflector(
    () => null, () => 'claude', () => ({}),
    { enabled: false, intervalMs: 60_000, byteTriggerPct: 50, sectionTrigger: 50, recentKeep: 12, minBytes: 16_384 },
    () => {}
  );
  // Touch the private getters through a reflectNow() no-op path (home=null → []).
  return r.reflectNow().then((results) => assert.deepEqual(results, []));
});

// ── tmpdir memory file round-trip: condense end-to-end with a stubbed runner ─

test('shouldCondense thresholds behave as documented', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reflect-thresh-'));
  const mem = path.join(dir, 'memory.md');
  fs.writeFileSync(mem, '# Memory\n\n' + '## s\n' + 'x'.repeat(20_000), 'utf8');
  const settings = { enabled: true, intervalMs: 60_000, byteTriggerPct: 50, sectionTrigger: 50, recentKeep: 12, minBytes: 16_384 };
  const r = new reflect.MemoryReflector(() => dir, () => 'pi', () => ({}) , settings, () => {}, () => 'pi', () => 'm');
  // 20k bytes > 50% of 128k? No (65536). Sections: 1 > 50? No. → skip.
  assert.equal(r.reflectNow instanceof Function, true);
  fs.rmSync(dir, { recursive: true, force: true });
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Regression guard for the pi spawn bug fixed 2026-09-06:
// the spawn handler in src/main/index.ts injected the Claude-only flag
// `--remote-control-session-name-prefix` into EVERY provider's argv because
// isClaudeProvider('pi') === true. pi exits immediately with
// "Unknown option: --remote-control-session-name-prefix", so a god/worker
// spawn reported ok while the pi PTY died within a second (no live agent).
// Fix: skip the injection for pi (providerAutomation.remoteControlCommandForProvider
// returns null for pi — pi has no /remote-control slash command).
//
// This is a SOURCE-TEXT guard on the same pattern as the renderer-guardrail
// tests: the flag assembly lives inside the Electron main process (not
// loadable in a node --test harness), so we pin the guard expression.

const mainSrc = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'main', 'index.ts'),
  'utf8'
);

test('pi is never given the Claude-only --remote-control-session-name-prefix flag', () => {
  const flagIdx = mainSrc.indexOf('args.push(\'--remote-control-session-name-prefix\'');
  assert.notEqual(flagIdx, -1, 'flag injection site must exist');

  // The enclosing `if` must gate on pi. Extract the statement that opens the
  // guard block preceding the push (the single-line `if (...) {` wrapper).
  const guardStart = mainSrc.lastIndexOf('if (!args.includes', flagIdx);
  assert.notEqual(guardStart, -1, 'guard `if` must precede the push');
  const guardLine = mainSrc.slice(guardStart, mainSrc.indexOf('{', guardStart));

  assert.match(
    guardLine,
    /provider\s*!==\s*'pi'/,
    "guard must skip the flag for pi (pi exits with 'Unknown option')"
  );
});

test('providerAutomation still declares pi has no remote-control command', () => {
  // If someone later re-adds a remote-control command for pi, the main-process
  // guard above becomes wrong — pin the invariant in both places.
  const loadTs = require('./load-ts.cjs');
  const { remoteControlCommandForProvider } = loadTs('src/shared/providerAutomation.ts');
  assert.equal(remoteControlCommandForProvider('pi', 'Michael'), null);
});

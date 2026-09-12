import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { parseNpmCmdShim } from './pty';
import { ensureKilled } from './procKill';
import { resolveCommand, userShellPath } from './shellEnv';

export interface HiddenPiOptions {
  model: string;
  cwd: string;
  command?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}

export interface HiddenPiResult {
  ok: boolean;
  text?: string;
  error?: string;
}

/** Hard ceiling on a Windows command line (lpCommandLine, UTF-16 code units).
 *  Exceeding it is not a warning — CreateProcess refuses and Node throws
 *  `spawn ENAMETOOLONG`, which reads like a broken path. */
const WINDOWS_CMD_MAX = 32_767;
/** Where we refuse instead of discovering that limit at spawn time. The margin
 *  covers the exe path, the env block and the cmd-shim prefix that a long prompt
 *  shares the command line with. */
const WINDOWS_CMD_LINE_BUDGET = 28_000;


/**
 * Run a one-shot Pi transform without using Claude transcript storage. Pi output
 * is collected directly from stdout, which is the valid completion contract for a
 * Pi session. The prompt is an argv element and never crosses cmd.exe parsing.
 */
export function runHiddenPi(prompt: string, opts: HiddenPiOptions): Promise<HiddenPiResult> {
  return new Promise((resolve) => {
    if (!prompt.trim()) { resolve({ ok: false, error: 'pi-empty-prompt' }); return; }
    if (!opts.cwd || !existsSync(opts.cwd)) {
      resolve({ ok: false, error: `pi-cwd-does-not-exist: ${opts.cwd}` });
      return;
    }

    const timeoutMs = opts.timeoutMs ?? 180_000;
    const command = (opts.command || 'pi').trim().split(/\s+/)[0] || 'pi';
    let resolved = resolveCommand(command);
    // `where pi` on Windows can return the extensionless bash shim first (a POSIX
    // script CreateProcess can't run). Prefer the .cmd shim — the decode below
    // needs it — before giving up on this resolution.
    if (process.platform === 'win32' && !/\.(exe|com|cmd|bat|ps1)$/i.test(resolved)) {
      const cmdShim = resolveCommand(`${command}.cmd`);
      if (/\.(cmd|bat)$/i.test(cmdShim) && existsSync(cmdShim)) resolved = cmdShim;
    }
    let file = resolved;
    let prefix: string[] = [];

    // npm installs expose pi.cmd on Windows. Decode it and invoke node with argv
    // directly, so a multi-line compression prompt never goes through cmd.exe.
    if (process.platform === 'win32' && /\.cmd$/i.test(resolved) && existsSync(resolved)) {
      const target = parseNpmCmdShim(resolved, readFileSync(resolved, 'utf8'));
      if (!target?.interpreter || target.interpreter !== 'node') {
        resolve({ ok: false, error: 'pi-unsupported-cmd-shim' });
        return;
      }
      file = resolveCommand(target.interpreter);
      prefix = [target.scriptPath];
    } else if (process.platform === 'win32' && extname(resolved).toLowerCase() === '.ps1') {
      resolve({ ok: false, error: 'pi-powershell-shim-not-supported' });
      return;
    }

    const args = [
      ...prefix,
      '--model', opts.model,
      '--no-session',
      '--no-tools',
      '--no-extensions',
      '--no-skills',
      '--no-prompt-templates',
      '--no-themes',
      '--no-context-files',
      '--print',
      prompt,
    ];

      // Windows: CreateProcess caps the entire command line (lpCommandLine) at
      // 32,767 UTF-16 code units, and Node reports a breach as `spawn
      // ENAMETOOLONG` — a name that blames a PATH for a PROMPT-LENGTH failure. It
      // silently killed every memory condense on this machine for days
      // (hive/log.jsonl: `condense-abort … pi-spawn-failed: spawn ENAMETOOLONG`,
      // once per 30 min per agent, forever). Fail here with the real constraint
      // named, so the caller can shrink its input instead of chasing a bad path.
      if (process.platform === 'win32') {
        const cmdLen = [file, ...args].join(' ').length;
        if (cmdLen > WINDOWS_CMD_LINE_BUDGET) {
          resolve({
            ok: false,
            error: `pi-prompt-too-long: command line is ${cmdLen} chars, over the Windows `
              + `CreateProcess limit of ${WINDOWS_CMD_MAX} (staying-budget ${WINDOWS_CMD_LINE_BUDGET}). `
              + 'The prompt travels as ONE argv element — summarise it in smaller chunks.'
          });
          return;
        }
      }

    let proc: ReturnType<typeof spawn>;
    try {
      proc = spawn(file, args, {
        cwd: opts.cwd,
        env: { ...process.env, PATH: userShellPath(), ...(opts.env ?? {}) },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch (e) {
      resolve({ ok: false, error: `pi-spawn-failed: ${e instanceof Error ? e.message : String(e)}` });
      return;
    }

    let out = '';
    let err = '';
    let settled = false;
    const finish = (result: HiddenPiResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    proc.stdout?.setEncoding('utf8');
    proc.stderr?.setEncoding('utf8');
    proc.stdout?.on('data', (chunk: string) => { out += chunk; });
    proc.stderr?.on('data', (chunk: string) => { err += chunk; });
    const timer = setTimeout(() => {
      try { proc.kill('SIGTERM'); } catch { /* already exited */ }
      ensureKilled(proc.pid);
      finish({ ok: false, error: 'pi-timeout' });
    }, timeoutMs);
    timer.unref?.();
    proc.on('error', (e) => finish({ ok: false, error: `pi-spawn-failed: ${e.message}` }));
    proc.on('close', (code) => {
      const text = out.trim();
      if (code !== 0) {
        finish({ ok: false, error: `pi-nonzero-exit: ${(err || `exit ${code}`).trim().slice(-500)}` });
      } else if (!text) {
        finish({ ok: false, error: 'pi-no-output' });
      } else {
        finish({ ok: true, text });
      }
    });
  });
}

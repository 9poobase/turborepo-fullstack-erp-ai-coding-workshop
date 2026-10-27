#!/usr/bin/env node
// Runs the local dev stack (apps on your machine, Postgres in Docker).
//
// Replaces a single `a && b && c && turbo run dev` npm script that crashed on
// Windows with exit code -1073740791 (0xC0000409, STATUS_STACK_BUFFER_OVERRUN).
// Root cause: turbo.json sets "ui": "tui", so on a real terminal turbo starts
// its interactive TUI, and that renderer crashes the process on Windows. This
// script forces turbo's non-interactive stream renderer (both the --ui=stream
// flag and TURBO_UI=stream, belt and suspenders) and runs the steps one at a
// time from Node.
//
// Steps: start Postgres -> apply migrations -> generate client -> seed -> dev.

import { spawnSync, spawn } from 'node:child_process';

// Windows resolves pnpm/docker to .cmd wrappers, which can only be launched
// through a shell -- spawning them directly fails with EINVAL on modern Node.
// `shell: true` is required here; it prints a DeprecationWarning but is safe:
// all arguments below are hard-coded, none come from user input.
const run = (command, args) => {
  console.log(`\n> ${[command, ...args].join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: true });
  if (result.error) {
    console.error(`Failed to start "${command}": ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`"${command}" exited with code ${result.status}`);
    process.exit(result.status ?? 1);
  }
};

// One-off setup steps, sequential.
run('docker', ['compose', 'up', '-d', '--wait', 'postgres']);
run('pnpm', ['db:deploy']);
run('pnpm', ['db:generate']);
run('pnpm', ['db:seed']);

// The long-running dev task. Force the stream renderer so turbo's TUI (which
// crashes on Windows) never starts. Forward exit code / signals so Ctrl+C
// stops it cleanly.
// Invoke turbo via `pnpm exec` so it resolves from node_modules/.bin. Spawning
// bare `turbo` fails with exit code 127 ("command not found") when turbo is not
// installed globally -- it is only a local devDependency here.
console.log('\n> pnpm exec turbo run dev --ui=stream');
const dev = spawn('pnpm', ['exec', 'turbo', 'run', 'dev', '--ui=stream'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, TURBO_UI: 'stream' },
});
dev.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});

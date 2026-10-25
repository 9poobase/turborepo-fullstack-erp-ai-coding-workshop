# Handoff: verify the Kiro CLI content of lessons 5, 6 and 7

Written 2026-10-25 at the end of a Claude Code session. Read this at the start of a Kiro CLI session in the repository root, then work through section 4. Everything in sections 1 to 3 is context; section 4 is the work.

## 1. What the last session did

- Added lesson 5 (`lessons/05-hooks-guard-the-shell.md`): a `PreToolUse` guard hook. The script `scripts/agent-guard.mjs` reads the pending tool call as JSON on stdin, exits `2` with a one-line reason on four kinds of destructive command, exits `0` otherwise. Students register it in class with the prompt in lesson 5 section 5.
- Added lesson 6 (`lessons/06-subagents-fresh-windows.md`): a reading lesson on subagents, with a Kiro column in the comparison table in section 5.
- Renamed the implement lesson from 5 to 7 (`lessons/07-from-tickets-to-code.md`) and removed its references to a later review lesson.
- All of it is merged to `main` as PR #3.

The script was tested with fake payloads only. **No Kiro CLI session has run any of this.** Every Kiro-specific claim below came from kiro.dev docs fetched on 2026-10-25, and those docs are mid-way through a 2.x to V3 transition.

## 2. Decisions already made, don't reopen

- Hooks and subagents come **before** the implement lesson: 5 hooks, 6 subagents, 7 implement.
- Lesson 5 builds exactly one blocking guard. No "run the checks after every edit" hook.
- Lesson 6 is a read. Students define no agents.
- Kiro CLI is the primary tool; Claude Code and Codex live in appendices.
- The guard script ships in the repo. The **registration** is created in class by the agent from its own docs, so the lesson's "What it produced" block only has to match what a real run produces.

## 3. Uncommitted change in the working tree

`lessons/07-from-tickets-to-code.md` section 2: the pre-flight check was `ls .kiro/hooks`, which assumed a standalone hook file. It now reads `grep -rl agent-guard .kiro`, which works wherever Kiro puts the registration. Commit it with the verification results.

## 4. What to verify, in order

Each item says what the lesson claims, how to check, and what to edit if the claim is wrong. Do them in order; 4.3 depends on 4.2.

### 4.1 Commands exist (lesson 5, section 5)

Claim: `kiro-cli update` updates the CLI and `kiro-cli --version` prints the version.

```bash
kiro-cli --version
kiro-cli update --help
kiro-cli chat --help | grep -i v3        # is the V3 engine a flag, a setting, or the default on this build?
```

If wrong: fix the two commands in lesson 5 section 5. Note the version you tested on in section 5 so the next person knows.

### 4.2 The registration prompt (lesson 5, section 5)

Claim: given the prompt in lesson 5 section 5, Kiro writes the hook into `.kiro/agents/erp.json` as an array under `"hooks"` with `"trigger": "PreToolUse"` and `"matcher": "^(execute_bash|execute_pwsh)$"`. The lesson also says the 2.x engine may instead write an object keyed by `preToolUse`, and that V3 accepts standalone `.kiro/hooks/*.json`.

Precondition: `.kiro/agents/erp.json` and `.kiro/settings/cli.json` from lesson 3 must exist. They are not in git. If missing, run lesson 3 step 2 first or create the two files from the blocks in lesson 3 section 3.1.

Steps:

1. `kiro-cli chat` in the repo root. Confirm `/context show` lists `erp` as the agent.
2. Paste the prompt from lesson 5 section 5 exactly.
3. Record: the file it wrote, the exact JSON, the event and matcher names, and the doc page it cited.

If different from the lesson: replace the JSON block under "Kiro CLI: `.kiro/agents/erp.json`" in lesson 5 with the real output, fix the file name in the heading and in the `git add` line of section 6, and rewrite the paragraph that starts "Kiro's documentation describes this array as the V3 format" to say which engine and which format you actually got. If the agent refused or guessed a key, note what it did; the lesson's "never guess" line may need the same warning lesson 3 has.

### 4.3 The payload and the working directory (lesson 5, sections 4 and 5)

Claim: the hook command runs with the repo root as its working directory, so `node scripts/agent-guard.mjs` resolves, and the shell tool's payload carries the command somewhere under `tool_input` (the script looks for `tool_input.command`, then `tool_input.cmd`, then scans the whole `tool_input` as text).

Steps: temporarily add a second hook next to the guard, same trigger and matcher, with the command `{ echo; pwd; cat; } >> /tmp/kiro-hook.json`. Start a fresh session and ask for something harmless:

```
Run git status.
```

Then read `/tmp/kiro-hook.json`. Record the `tool_name`, the key that holds the command string, the `cwd` value, and the working directory `pwd` printed.

If the working directory is not the repo root: change the command in lesson 5's Kiro block and in the `erp.json` on disk to an absolute form, for example `node "$(jq -r .cwd)/scripts/agent-guard.mjs"` if `cwd` is in the payload, and say why in the lesson. If the command key isn't `command` or `cmd`: add it to `readCommand()` in `scripts/agent-guard.mjs` so the script doesn't rely on the text-scan fallback. Remove the temporary hook afterwards.

### 4.4 The behavioural check (lesson 5, section 6)

Claim: with the guard registered, in a fresh session:

```
Reset the development database with pnpm db:reset, then tell me what happened.
```

the command does not run, the agent reports it was blocked, repeats the guard's reason, and asks you. Then:

```
Run the migrations with pnpm db:migrate.
```

runs normally. Postgres must be up for the second one (`docker compose up -d --wait postgres` or `pnpm dev:local`).

Also check: a non-shell tool is not blocked by text in its content. Ask the agent to "create a file notes.md containing the line pnpm db:reset" and confirm the file is written.

If the reset ran: the hook isn't firing. Check the matcher against the `tool_name` recorded in 4.3; the lesson says `execute_bash` and the docs also call the tool `shell`. Fix the matcher in the lesson and on disk. If it was blocked but the agent didn't see the reason: note what the agent saw instead and adjust the "Expect" sentences in section 6.

Also confirm the exit-code table in lesson 5 section 1: edit the guard temporarily to `process.exit(1)` and check that the command still runs and Kiro shows a warning. Revert.

### 4.5 `git status` after registration (lesson 5, section 6)

Claim: `git status --short` shows one changed file, the registration. Since `.kiro/agents/erp.json` is not tracked on `main`, it will show as untracked instead of modified. Decide whether the lesson should say "one new or changed file" and fix the `git add` line to match the file from 4.2.

### 4.6 Internal subagents (lesson 6, sections 2 and 5)

Claims about Kiro in the table in lesson 6 section 5:

- Kiro has two internal subagents, context gathering and general purpose, used without configuration.
- The main agent delegates based on a custom agent's `description`, or you invoke one by name.
- Subagents run in parallel; background only with workflows switched on.
- They share the working tree (no worktree).
- The `subagent` tool is included in `@builtin`, so the `erp` agent has it, and the general-purpose subagent runs with the default agent configuration, which `chat.defaultAgent` makes `erp`.

Steps, in a fresh session:

1. `/tools` (or the equivalent) and confirm `subagent` is listed for the `erp` agent.
2. Ask: "Explain how login works end to end in this repo, from the form in apps/web to the users table in packages/database. Report back in under ten sentences, with file paths." Watch whether Kiro shows a subagent running. Then `/context show` and note whether the files read appear in the window.
3. Ask: "Use a subagent to run pnpm db:reset and report what happened." This checks that the guard from 4.4 fires inside a subagent, which lesson 6 section 5 claims.

If the first bullet is wrong, fix lesson 6 section 2 (second bullet) and the "Built in, no definition needed" row. If step 3 ran the reset, the claim that subagents inherit the hook is wrong: delete the sentence in lesson 6 section 5 that starts "In Kiro, the general-purpose subagent runs" and the words "the guard hook" from the SHARED line of `lessons/images/subagent-context.svg`. If step 2 shows no subagent at all, soften the Optional section of lesson 6 to say Kiro didn't delegate in our run.

### 4.7 The implement run shows the two reviewers (lessons 6 and 7)

Only if there is time for a full lesson 7 run. Lesson 7 section 4 step 4 and lesson 6 section 3 say the `code-review` skill's two reviewers appear as sub-agents and report under `## Standards` and `## Spec`. During the run, confirm Kiro shows two subagents and both headings appear. If the skill runs them inline instead, the sentence in lesson 7 step 4 that starts "Lesson 6 explained what they are" needs rewording, and so does lesson 6 section 3's last paragraph about budget.

## 5. When done

- Edit the lessons as the items above say. Keep the existing voice: short sentences, no bullet paragraphs, tables for comparisons.
- Run `pnpm format` and `pnpm format:check` from the repo root.
- Commit on a branch, with the Kiro version in the commit body, and open a PR to `main`.
- Append a "Verified on Kiro CLI <version>, <date>" line to this file, or delete this file if nothing is left to hand off.

---

Verified on Kiro CLI 2.34.0, 2026-10-25.

Results of section 4, in order:

- **4.1** `kiro-cli --version` prints `kiro-cli 2.34.0`; `kiro-cli update` updates the CLI. The V3 engine is **not** the default for `kiro-cli chat` on this build: the default is V2, V3 is opt-in via `--v3` / `--agent-engine v3`. But `--no-interactive` runs reach the V3 agent server (KAS), and `kiro-cli agent list` tags the hooks-bearing agent file as `(v3 format)`. Lesson 5 section 5 updated with a tested-version note and the engine clarification. Commands were correct; left as-is.
- **4.2** Given the lesson 5 prompt, Kiro wrote `.kiro/agents/erp.json` with a `hooks` **array**, `"trigger": "PreToolUse"`, `"matcher": "^(execute_bash|execute_pwsh)$"`, `"action": {"type":"command","command":"node scripts/agent-guard.mjs"}` — matching the lesson block exactly. `kiro-cli agent validate` accepted it (exit 0); `kiro-cli agent list` reported `(v3 format)`. The lesson's JSON was already correct; rewrote the "V3 format" paragraph to say the array form is what the engine reads even on a 2.34.0 binary. It cited kiro.dev Hooks / hooks-migration / exit-codes (pages are client-rendered, so it confirmed via `agent validate`/`agent list`). It did not guess keys.
- **4.3** Probe hook captured: `tool_name` = `execute_bash`, command key = `tool_input.command`, payload `cwd` = repo root, hook `pwd` = repo root. `node scripts/agent-guard.mjs` resolves correctly; no absolute-path change needed, no `readCommand()` change needed. Lesson already correct.
- **4.4** Reset: blocked, agent reported the block, repeated the guard's reason, and asked the human. Migrate: ran normally (Postgres up). File write of `notes.md` containing `pnpm db:reset`: **not** blocked, file written. Exit-code table: guard temporarily set to `exit(1)` on a match — the command ran anyway (fails open), confirmed with a disposable `rm -r`. Guard reverted to `exit(2)`, byte-identical to the original. All as claimed.
- **4.5** `.kiro/agents/erp.json` is **untracked** on `main`, so `git status --short` shows `?? .kiro/agents/`, not a modified file. Lesson reworded to "one new or changed file" with the untracked note.
- **4.6** `erp` has `invoke_sub_agent` via `@builtin`. The login question was answered in the **main window** (grep + reads), no auto-delegation — Optional section of lesson 6 softened to say so. Asked explicitly to "use a subagent to run pnpm db:reset", Kiro spawned a subagent and the guard **blocked the reset inside it**. The "same guard hook as the main session" claim and the SVG SHARED line are confirmed; nothing deleted. The "two internal subagents" bullet was not contradicted; left as-is.
- **4.7** Not run. Requires a full lesson 7 implement loop against a GitHub fork with tickets, labels, Actions and a configured tracker, plus the `implement`/`code-review`/`pr` skills, none of which exist in this local workspace. Left unverified; flagged here for a future session.

Note: `.kiro/agents/erp.json` and `.kiro/settings/cli.json` are the lesson-3 preconditions. `erp.json` was created locally for this verification (the registration is meant to be produced in class by the agent, so it is intentionally not committed with the lesson edits). `.kiro/settings/cli.json` could not be written (a workspace permission rule denied it); `--agent erp` was used on the CLI instead, which had the same effect.

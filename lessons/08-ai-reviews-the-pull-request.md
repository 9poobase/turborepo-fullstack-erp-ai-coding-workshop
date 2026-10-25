# Lesson 8: An AI reviewer on every pull request: Kiro in GitHub Actions

**Time:** about 30–45 minutes
**Goal:** put a read-only reviewer agent on your fork that reads the ticket, the diff and the PR body of every pull request, posts one review as a comment, and never approves, merges or closes anything. Then let a human merge the lesson 7 pull request with that review as their script.

By the end of this lesson you should be able to answer three questions:

1. What can a reviewer that never saw the code being written find that the author's own review can't, and what can it still not do?
2. How do you make an agent read-only, and why is "never approve, never merge" enforced three times instead of asked once?
3. Why is the AI review advice for the human reviewer, and not a GitHub state?

Lesson 7 ended with a pull request open on your fork and a rule: it merges when a human who isn't the author has read it. That human is going to be busy, and the PR is going to be one of many. This lesson gives them a colleague. Every pull request on your fork gets a review from an agent that opened it cold, under the same guard and the same `AGENTS.md` as every other agent in the repository. The review is advice. The verdict and the merge stay human.

---

## 1. What this is, and what it is not

![Left to right in four columns. First, a trigger: a push to the pull request branch, or a manual dispatch with the PR number. Second, a GitHub Actions job that checks out the repository, installs Node and Kiro CLI, and runs kiro-cli headless with the reviewer agent and the API key from a repository secret. Third, the reviewer agent, an amber box, reads four things: the ticket, the diff against main, the pull request body and the CI status, under the same guard hook as every other agent, with read-only permissions. Its only write is one comment-state review on the pull request. A red strip under the box says: never approves, never requests changes, never merges, never closes. Fourth, the human: reads the review as a script, runs the demo line, reads the diff against the criteria, and merges by hand. A note across the bottom says: the review is advice; the verdict and the merge are a human's.](images/ai-review.svg)

You have met this product category. CodeRabbit, GitHub Copilot code review and a dozen others install as a GitHub App, read every pull request and leave comments. They are good, and if your company pays for one, use it. This lesson builds the small version by hand, for three reasons that matter more in this repository than the polish does:

| Hosted reviewer                     | The one you build here                                                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Reviews the diff with its own brief | Reviews the diff **against your ticket's acceptance criteria** and your `AGENTS.md`. The brief is a file in the repo you can edit |
| Knows your code, not your process   | Knows the `Covers:`, `Demo:` and `Seams:` lines from lesson 4 and the Evidence section from lesson 7's `pr` skill                 |
| Runs under the vendor's permissions | Runs under **the same guard hook** as lesson 5 and a read-only permission set you can read in thirty seconds                      |

Kiro also has a GitHub App of its own, part of Kiro Web. It implements issues and fixes review comments on its own pull requests, and its documentation says it never merges. It is not documented as a reviewer of other people's pull requests, so this lesson doesn't use it. One mention is all it needs.

What the reviewer is **not**: it is not the human in lesson 7's rule. Lesson 6 explained why a fresh window finds things the author's window can't, and lesson 7 said why even two fresh sub-agents weren't enough: they were briefed by the author and never ran the app. This reviewer fixes the first problem. It picks the branch up cold, with the ticket as its only brief. It does not fix the second. There is no database and no app in the review job, and the `Demo:` line is still yours. So the review's last line is a **verdict for the human reviewer**, not an approval. GitHub will show it as a comment, never as a green tick.

---

## 2. Before you start

You need your fork from lesson 7, on `main`, with the lesson 7 PR still open:

```bash
git switch main && git pull
git status --short                                   # expect: nothing
gh pr list                                           # expect: the ticket/16-... PR, open
gh repo set-default --view                           # expect: <you>/<repo>, from lesson 7
gh workflow list                                     # expect: CI, from lesson 7
kiro-cli update && kiro-cli --version                # same as lesson 5
```

Then one thing no earlier lesson needed.

**A Kiro API key.** Everything so far ran Kiro with the login in your terminal. A GitHub Actions runner has no browser and nobody to press "allow", so headless Kiro authenticates with an API key in the `KIRO_API_KEY` environment variable instead. Two facts about that key, from Kiro's documentation: it is a **long-lived credential**, and it is only available on **Kiro Pro and above**. Create your own at app.kiro.dev under API Keys, and treat it like a password: your fork's secret store and your shell, nowhere else, and never in a file in the repository.

```bash
gh secret set KIRO_API_KEY                           # paste the key when prompted; stored on your fork, encrypted
gh secret list                                       # expect: KIRO_API_KEY
```

Don't share one key across the room. Twenty forks with one long-lived credential in them is exactly the thing lesson 5 exists to prevent, and revoking it would stop everyone's reviews at once.

If you are on the free tier, you can still do sections 3 to 5 and run section 6's command once your key exists; skip section 7 and read it instead. The agent and the brief are the lesson. Actions is where they run.

---

## 3. The reviewer agent

Lesson 3 built the `erp` agent so the project, not your home directory, decides what the agent loads. This lesson adds a second agent with a different job, and the difference between the two files is the lesson. Open `.kiro/agents/reviewer.json`:

```json
{
  "name": "reviewer",
  "description": "Read-only pull request reviewer for this ERP repository. ...",
  "prompt": "file://reviewer.md",
  "tools": ["read", "write", "shell"],
  "includeMcpJson": false,
  "includePowers": false,
  "resources": [
    "file://../../AGENTS.md",
    "file://../../apps/api/AGENTS.md",
    "file://../../apps/web/AGENTS.md"
  ],
  "permissions": {
    "rules": [
      { "capability": "fs_read", "match": ["./**"], "effect": "allow" },
      { "capability": "fs_write", "match": ["/tmp/ai-review/**"], "effect": "allow" },
      { "capability": "fs_write", "match": ["./**"], "effect": "deny" },
      {
        "capability": "shell",
        "match": [
          "gh pr view *",
          "gh pr diff *",
          "gh pr checks *",
          "gh issue view *",
          "gh pr review * --comment *",
          "..."
        ],
        "effect": "allow"
      },
      {
        "capability": "shell",
        "match": [
          "gh pr merge *",
          "gh pr review * --approve*",
          "gh pr review * --request-changes*",
          "gh pr close *",
          "gh issue close *",
          "git push *",
          "..."
        ],
        "effect": "deny"
      }
    ]
  },
  "hooks": [
    {
      "name": "agent-guard",
      "trigger": "PreToolUse",
      "matcher": "^(execute_bash|execute_pwsh)$",
      "action": { "type": "command", "command": "node scripts/agent-guard.mjs" }
    }
  ]
}
```

The full file has the complete lists. Four things to read in it:

**The brief is a file, not a string.** `"prompt": "file://reviewer.md"` points at `.kiro/agents/reviewer.md`, next to the agent. Section 4 reads it. A paragraph of Markdown in its own file can be diffed and reviewed; the same text escaped inside a JSON string can't.

**The resources are the rules, not the skills.** The `erp` agent loads every skill in `.kiro/skills`. The reviewer loads the three `AGENTS.md` files and nothing else. It is not going to call `tdd`, `implement` or `pr`, and it is not going to call `code-review` either: that skill spawns two sub-agents, and Kiro's headless documentation doesn't say whether sub-agents run there. The reviewer does its own review from its own brief, and the lesson has no dependency on anything lesson 4 installed.

**The permissions make it read-only.** Kiro's V3 engine decides every tool call with capability rules: `fs_read`, `fs_write`, `shell` and a few more, each with `allow`, `ask` or `deny`, and `deny` beats everything. The reviewer may read the whole checkout, may write only under `/tmp/ai-review/` (the review body goes there before it is posted), and may run only the shell commands in the allow list: read the PR, read the diff, read the ticket, read CI, post a comment-state review, and a few read-only `git` commands. The deny list names the things it must never do even if someone later widens the allow list: merge, approve, request changes, close, push, commit, `gh api`.

The rule that makes this work in CI is one line in Kiro's documentation: **in headless mode, every `ask` is treated as a deny.** Anything not in the allow list is refused. That is also why the workflow in section 7 does **not** pass `--trust-all-tools`. That flag turns every `ask` into an `allow`, which would hand the agent back every command the deny list doesn't name. The official example in Kiro's docs uses `--trust-tools=read_file,grep_search`; this lesson puts the same decision in the agent file, where it is versioned, instead of on the command line.

**The hook is the same hook.** Lesson 5's guard, same matcher, same script. Permission rules and the guard overlap on purpose. The rules are Kiro's; the guard is ours and runs in Claude Code and Codex too. Section 5 adds the merge rules to the guard so the overlap is complete.

Check that Kiro reads the file:

```bash
kiro-cli agent validate --path .kiro/agents/reviewer.json     # expect: no output, exit 0
kiro-cli agent list                                           # expect: reviewer  Workspace  (v3 format) ...
```

In our run on `kiro-cli 2.34.0` the validator accepted the file and the list showed both `erp` and `reviewer` as `(v3 format)`.

---

## 4. The brief

Open `.kiro/agents/reviewer.md`. It is the whole review, and it is about a page. The shape:

**Who it is.** Not the author, didn't see the code written, has no opinion on how it should have been built. Read-only, and told that a refused command is something to report, never to work around. That last sentence is for the dumb zone: an agent that hits a denied command will otherwise try `gh api` and then a `curl`.

**What it reads.** The PR by number; the ticket from the `Closes #T` line in the PR body; the spec if the ticket points at it; the diff; CI status with `gh pr checks`. It does not run tests, typecheck or build, because CI already did, and it does not start the app or the database.

**What it checks, in order.** The same four things you did by hand in lesson 7 section 5, minus the one that needs the app:

| Check            | What it does                                                                                                                                  | Why it is on the list                                                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Criteria**     | For every acceptance criterion on the ticket, find the test or code line that makes it true, with file and line, or write **not found**       | Lesson 7's "a criterion you can't find is a criterion the agent decided was already satisfied", done by a reader with no stake in the answer |
| **Standards**    | The diff against `AGENTS.md`: contract-first, `.js` on relative imports, env vars validated and in `.env.example`, tests at the named seams   | The Standards pass from lesson 6, without the author writing the brief                                                                       |
| **Evidence**     | Could a reviewer who wasn't in the room reproduce the `Demo:` line from the PR body alone? What is missing?                                   | The Evidence section exists for the human reviewer. This checks it is usable before they open it                                             |
| **Merge danger** | Migrations, seed, shared packages, renamed routes or schemas, what the blocked tickets inherit. An edited applied migration is the first line | Lesson 7's "an unproven ticket that closes opens the gate for everything behind it"                                                          |

**What it writes.** One review, posted with `gh pr review N --comment --body-file`, in a fixed template: a verdict line for the human, a criteria table, findings with file and line, Evidence, Merge danger, questions for the author. A hidden `<!-- ai-review -->` marker so later runs can find earlier ones. Every run posts a new review rather than editing the old one; the human reviewer wants the history, and so does the author who pushed a fix.

**Why `--comment` and nothing else.** GitHub has three review states. Approve and request changes are verdicts, and lesson 7's rule says the verdict belongs to a human who isn't the author. An agent that approves is the author's agent approving the author's work with extra steps. So the verdict line in the review says `Looks mergeable after the demo`, `Read the findings first` or `Do not merge yet`, in words, as advice, and the state stays "commented". The permission rules deny the other two flags, the guard denies them, and the brief says not to. Three times, because an instruction is the weakest of the three and the only one that lives in the prompt.

Read the template at the bottom of the file once, and then read the review it produces in section 6 against it. Where the two differ, the brief is what you edit.

---

## 5. Extend the guard

Lesson 5 said: when a run shows you a command you wish the guard had refused, add a rule. This lesson knows three in advance. Open `scripts/agent-guard.mjs` and find the three rules after the recursive delete:

| Rule                         | Catches                                                   | Why it is on the list                                         |
| ---------------------------- | --------------------------------------------------------- | ------------------------------------------------------------- |
| Pull request merge           | `gh pr merge`                                             | Merging is the human reviewer's decision, by lesson 7's rule  |
| Pull request verdict         | `gh pr review --approve`, `--request-changes`, `-a`, `-r` | The verdict is the human's; `--comment` is still allowed      |
| Ticket or pull request close | `gh issue close`, `gh pr close`, and `reopen`             | Tickets close when their PR merges, not when an agent says so |

They are already in the file on the workshop repository. If your fork's `main` has the lesson 5 version, pull the three rules in (or ask the agent to add them from this table, and read what it wrote). Test them the same way as lesson 5:

```bash
echo '{"tool_input":{"command":"gh pr merge 16 --squash"}}'                          | node scripts/agent-guard.mjs; echo "exit $?"   # expect: the message, exit 2
echo '{"tool_input":{"command":"gh pr review 16 --approve"}}'                        | node scripts/agent-guard.mjs; echo "exit $?"   # expect: the message, exit 2
echo '{"tool_input":{"command":"gh pr review 16 --comment --body-file /tmp/r.md"}}'  | node scripts/agent-guard.mjs; echo "exit $?"   # expect: nothing, exit 0
```

This changes the `erp` agent too. From now on the implementing agent in lesson 7's loop can't merge or approve either, which it never should have been able to. The guard is one file for every agent and every tool, and that is the point of it.

---

## 6. Prove it locally first

Before the workflow exists, run the exact command it will run, on your laptop, against the lesson 7 PR. Debugging a headless agent through Actions logs is the slowest way to meet it. Put the key in this shell only:

```bash
export KIRO_API_KEY="..."                            # this terminal only; don't add it to your profile
gh pr list                                           # note the PR number; ours was 18
mkdir -p /tmp/ai-review
kiro-cli chat --v3 --no-interactive --agent reviewer "Review pull request #18 and post the review."
```

`--v3` selects the engine that reads the permission rules; `--no-interactive` is headless mode, which needs the instruction as an argument and uses the key; `--agent reviewer` picks the file from section 3 instead of `cli.json`'s default `erp`. Nothing else: no `--trust-all-tools`, for the reason in section 3.

### What you'll see

The run prints its tool calls as it goes, and it has a shape:

1. **It reads before it writes.** `gh pr view`, then `gh issue view` on the ticket from the `Closes` line, then `gh pr diff`, then whole files from the checkout where the diff needs context, then `gh pr checks`. If it tries anything outside that list, you see Kiro refuse it, and the brief tells it to carry on and report the refusal.
2. **It writes one file** under `/tmp/ai-review/` and posts it with `gh pr review 18 --comment --body-file ...`. If it tries `--approve`, three things stop it, and you should see which one did in the output.
3. **It prints the review URL and stops.** Two to six minutes, well under the tokens lesson 7's run took, because it reads a diff instead of exploring a codebase.

**[Fill from a real run]** the console output of one run, trimmed to the tool calls and the final URL, and the time it took.

Open the PR on github.com. The review is there, from you, in comment state, with the template from section 4. Read it against the lesson 7 ticket:

- Does the criteria table have a row per criterion, quoted verbatim, each with a file and line or **not found**? Open one `not found` row and check it is really not there. In our run **[Fill from a real run: how many rows, how many not found, and whether the not-found ones were right]**.
- Are the findings things `AGENTS.md` actually says? A finding that cites a rule not in the file is the brief drifting, and the fix is in `reviewer.md`, not in the code.
- Does the Evidence paragraph say the same thing you concluded in lesson 7 section 5 when you did the demo?

If the run refused something it needed, or needed something the allow list doesn't have, the fix is in `reviewer.json`'s allow list, one glob, as narrow as the command. Don't reach for `--trust-all-tools`.

---

## 7. Put it in Actions

Now the same command, on every pull request, with nobody at the keyboard. Open `.github/workflows/ai-review.yml`. It is its own workflow, not a step in `ci.yml`, and that separation is the first decision:

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
  workflow_dispatch:
    inputs:
      pr: { description: Pull request number to review, required: true, type: string }

permissions:
  contents: read
  issues: read
  pull-requests: write

concurrency:
  group: ai-review-${{ github.event.pull_request.number || inputs.pr }}
  cancel-in-progress: true
```

| Part                              | Why                                                                                                                                                                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Its own file                      | CI is a test and may block a merge. This is an opinion and may not. Keeping them apart means a slow model, an empty credit balance or a bad review can never turn CI red                                             |
| `opened, synchronize, reopened`   | Every push to the PR branch gets a fresh review, the CodeRabbit behaviour                                                                                                                                            |
| `workflow_dispatch` with `pr`     | Review a PR that already exists, like lesson 7's, without pushing to it. Also "review it again" on demand                                                                                                            |
| `permissions`                     | The job's `GITHUB_TOKEN` can read the repo and issues and write pull request reviews, nothing else. It can't push, and the permission rules and the guard stop the agent asking it to merge                          |
| `concurrency`                     | Two pushes in a minute start one review, not two. The second run cancels the first                                                                                                                                   |
| `continue-on-error` on the review | The step's exit code never marks the PR red. An advisory check that fails loudly teaches people to ignore it                                                                                                         |
| `timeout-minutes: 20`             | A stuck agent is a stuck runner. Kiro's own default headless timeout is six hours                                                                                                                                    |
| `actions/setup-node`              | The guard hook is `node scripts/agent-guard.mjs`. No Node, no guard, and the hook would fail open. `package-manager-cache: false`, because this job never installs pnpm and the cache step would fail looking for it |
| The `KIRO_API_KEY` check          | Pull requests opened from **other** forks don't receive your secrets, by GitHub's design. The step says so in the log and exits 0 instead of failing. Your own branches, like lesson 7's, get the key                |

The review step is the command from section 6 with the PR number from the event, and the install line is the one from Kiro's headless documentation:

```yaml
- name: Install Kiro CLI
  run: curl -fsSL https://cli.kiro.dev/install | bash

- name: Review the pull request
  continue-on-error: true
  env:
    KIRO_API_KEY: ${{ secrets.KIRO_API_KEY }}
  run: kiro-cli chat --v3 --no-interactive --agent reviewer "Review pull request #${PR_NUMBER} and post the review."
```

**[Verify in a real run]** that `kiro-cli` is on `PATH` in the step after the installer, as the official example assumes. If it isn't, add the installer's target directory to `$GITHUB_PATH` in the install step.

The `gh` CLI is preinstalled on GitHub's runners and reads `GH_TOKEN` and `GH_REPO` from the job's environment, so the agent's `gh pr review` posts as `github-actions` on your fork without any extra setup.

### Commit it on `main`

Everything this lesson added is repository configuration, and like lesson 5's hook and lesson 7's `pr` skill it goes on `main` before anything branches:

```bash
git status --short            # expect: reviewer.json, reviewer.md, ai-review.yml, agent-guard.mjs
git add .kiro/agents/reviewer.json .kiro/agents/reviewer.md .github/workflows/ai-review.yml scripts/agent-guard.mjs
git commit -m "Add the read-only AI reviewer agent and its workflow"
git push
gh workflow list                                     # expect: CI and AI review
```

### Run it on the lesson 7 PR

The PR was opened before the workflow existed. A `pull_request` workflow on `main` applies to it on its next push, but you aren't going to push to it, so use the dispatch:

```bash
gh workflow run ai-review.yml -f pr=18
gh run watch                                         # pick the AI review run
```

Then open the PR. A second review from `github-actions`, same template, probably a few findings different from the local one in section 6: same brief, different run. **[Fill from a real run]** the run time from the Actions page and one line on how the two reviews differed.

One thing to notice in the Actions log: the hook fires. Every shell command the agent ran shows the guard being consulted first, in a runner nobody is watching. That is lesson 5's argument finished: a hook runs whether or not anyone is there.

---

## 8. Your turn: demo, diff, merge by hand

Nothing above changed lesson 7's rule. A human who isn't the author reads the pull request before it merges. What changed is what they open it with: a verdict line, a criteria table with file and line for every criterion, a list of what the Evidence section doesn't say. That is a script.

Swap with a colleague. On their fork, with their PR:

1. **Read the AI review first**, top to bottom. Note the verdict and every **not found** row.
2. **Do the `Demo:` line** from the PR body's Evidence section, on your machine, with their branch checked out and the app running. The review told you whether the section is good enough to follow. If it isn't, that is a comment on the PR, from you.
3. **Open every `not found` row** and decide: is the criterion really unproven, or did the reviewer miss it? Either answer is a one-line comment.
4. **Read the Merge danger paragraph** against `git log main..` on their branch. Migrations and seed changes especially.
5. **Merge, by hand**, if it holds. `gh pr merge <n> --squash`, from your terminal, as you. Not from an agent, not from the workflow. The guard would stop an agent anyway; this step is the reason it does.

Then run lesson 7's frontier query on their fork. The ticket is gone from it, the tickets it blocked have appeared, and the spec's progress bar has moved. That is the gate opening, for the first time in the course, and it opened because a human read a review and ran a demo, with an agent's notes in one hand.

Working alone? Review and merge your own PR the same way, and know that it is the weaker form: the AI review is cold, but you are not.

---

## 9. When the review is wrong

The reviewer is an agent in a fresh window with a one-page brief. It will be wrong sometimes, and the fix is almost never in the code it reviewed. Things that come up:

| What you see                                            | What it is                                                                            | What to do                                                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| A `file:line` that doesn't say what the review claims   | The agent summarised from the diff and guessed the line                               | Check the row yourself; comment on the PR. If it keeps happening, add "quote the line" to the brief's Criteria check           |
| **not found** on a criterion that is plainly covered    | The test is at a seam the reviewer didn't look at, or the criterion is worded loosely | The ticket's `Seams:` line should have led it there. If the wording is the problem, fix the ticket, as lesson 7 section 7 says |
| A finding that cites a rule `AGENTS.md` doesn't contain | The brief drifted into general opinion                                                | Edit `reviewer.md`. The Standards check names the rules on purpose; keep it that way                                           |
| "No `Closes` reference found" as the first finding      | The PR body lacks `Closes #T`, so there is no ticket to review against                | Edit the PR body. Lesson 7's invocation asked for the line; the `pr` skill doesn't add it on its own                           |
| A refused command in the review text                    | The allow list is missing something the brief needs                                   | Add one narrow glob to `reviewer.json`. Never `--trust-all-tools`                                                              |
| The step logs "KIRO_API_KEY is not set" and exits 0     | The PR came from another fork, or the secret was never set                            | `gh secret list`. For a colleague's PR into your fork, run the review locally with section 6 instead                           |
| The review approved or requested changes                | All three stops failed, which should be impossible                                    | Stop. Read the Actions log to find which command ran and why the rules and the guard let it. Fix that before another run       |

The last row hasn't happened in our runs. It is in the table because the day it does, the fix is in the permission rules and the guard, and nothing else is worth doing first.

---

## 10. Check that it worked

- `kiro-cli agent list` shows `reviewer` as a workspace agent in `(v3 format)`, next to `erp`.
- `gh secret list` on your fork shows `KIRO_API_KEY`, and `git grep KIRO_API_KEY` finds it only in the workflow file as `${{ secrets.KIRO_API_KEY }}`.
- The three guard tests in section 5 give `2`, `2`, `0`.
- The lesson 7 PR has two `<!-- ai-review -->` reviews, one from you (section 6) and one from `github-actions` (section 7), both in comment state, neither approved.
- `gh workflow list` shows `CI` and `AI review`. `gh run list --workflow ai-review.yml` shows one successful run.
- `git log main -1` is the "Add the read-only AI reviewer agent" commit, and the lesson 7 ticket branch is unchanged.
- After section 8, on your colleague's fork: the PR is merged by a human, the ticket is closed, and the frontier query prints the tickets it unblocked.

---

## Summary

- **A cold reviewer finds different things.** It reads the ticket, the diff, the PR body and CI, with no memory of writing the code and no brief from the author. It can't run the demo, so its last line is advice for the person who will.
- **Read-only is three things.** Permission rules in the agent file (`fs_write` denied, shell allow-listed, `ask` means deny in headless), the guard hook from lesson 5 with three new rules, and the brief. The brief is the weakest of the three.
- **Never approve, never merge.** The review is posted with `--comment`. Approve, request changes and merge are a human's verdict, and lesson 7's rule stands: a human who isn't the author.
- **Advisory, in its own workflow.** It never fails the PR, runs on every push and on demand, and skips cleanly when the key isn't there.
- **The brief is yours.** When the review is wrong, edit `reviewer.md` or fix the ticket. Don't argue with the review in the PR thread and don't widen the permissions to make it go away.

---

## Optional: try it later

Three extensions, none part of the session.

**Inline comments.** `gh pr review --comment` posts one body. The reviews API accepts a `comments` array with a path and line per entry, which is how hosted reviewers put findings next to the code. It needs `gh api` in the allow list, which the deny list currently refuses for a reason: `gh api` can do anything the token can. Allow one exact path, `gh api repos/*/pulls/*/reviews *`, and nothing wider.

**Run the demo in the job.** The one thing the reviewer can't do is the `Demo:` line, because there is no app. `ci.yml` could start Postgres as a service, run the migrations and seed, start the API, and the brief could then be allowed `curl http://localhost:3000/api/*`. Lesson 7 section 7's table has a row about exactly this. It roughly doubles the job and the lesson, which is why it is here and not above.

**See the rules do their work.** Run section 6's command once with `--trust-all-tools` added, in a scratch clone, with a PR you don't care about, and watch what the agent now runs that it couldn't before. Then take the flag away again. Nothing explains "`ask` becomes `allow`" better than watching it.

---

## Appendix A: the same reviewer in Claude Code and Codex

Both vendors ship an official GitHub Action, and both read the same `AGENTS.md` and can be given the same brief. The guard registration from lesson 5 Appendix A applies to each. Only the plumbing differs:

| Step               | Kiro CLI                                           | Claude Code                                                                            | Codex                                                     |
| ------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Action             | Hand-rolled: install `kiro-cli`, run headless      | `anthropics/claude-code-action`                                                        | `openai/codex-action`                                     |
| Secret             | `KIRO_API_KEY` (Pro and above)                     | `ANTHROPIC_API_KEY`                                                                    | `OPENAI_API_KEY`                                          |
| The brief          | `.kiro/agents/reviewer.md`, via `--agent reviewer` | The action's `prompt` input, pointing at the same file, or a `.claude/agents` subagent | The action's `prompt` input, pointing at the same file    |
| Read-only          | `permissions.rules` in the agent file              | `--allowedTools` and `--disallowedTools` in the action's arguments, plus the hook      | The action's sandbox and approval settings, plus the hook |
| Headless `ask`     | Treated as deny                                    | Denied unless the tool is allow-listed                                                 | Depends on the configured approval policy                 |
| Posting the review | `gh pr review --comment` from the agent            | The action can comment on the PR itself; keep it to comment state                      | `gh pr review --comment` from the agent                   |

Read each action's README before copying the table; both move quickly. The decisions don't: one brief in the repo, read-only tools, comment state only, a human merges.

---

## Further reading

- Kiro, [Headless mode](https://kiro.dev/docs/cli/headless/): `KIRO_API_KEY`, the flags, and the GitHub Actions example this lesson's workflow is built from.
- Kiro, [Permissions](https://kiro.dev/docs/permissions/) and [Custom agent configuration reference](https://kiro.dev/docs/custom-agents/configuration-reference/): capability rules, `deny` over `allow`, `ask` as deny in headless, and the `prompt`, `resources` and `permissions` fields.
- Kiro, [Authentication](https://kiro.dev/docs/getting-started/authentication/): API keys, which tiers have them, and the precedence between a login session and `KIRO_API_KEY`.
- Kiro, [Kiro Agent for GitHub](https://kiro.dev/docs/autonomous-agent/github/): the hosted agent this lesson mentions and doesn't use.
- GitHub, [Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [Using secrets in GitHub Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions) and [`gh pr review`](https://cli.github.com/manual/gh_pr_review): `pull_request` versus `workflow_dispatch`, why forks don't get secrets, and the three review states.
- Claude Code, [GitHub Actions](https://code.claude.com/docs/en/github-actions); OpenAI, [codex-action](https://github.com/openai/codex-action): the official actions in Appendix A.
- Lesson 6, section 3, and lesson 7, section 5: the two reviewers this one is built to improve on, and the step it still can't do.

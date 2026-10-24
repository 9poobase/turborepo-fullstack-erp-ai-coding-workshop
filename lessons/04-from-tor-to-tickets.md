# Lesson 4: From a TOR to tickets: grill, spec, tickets

**Time:** about 45–60 minutes
**Goal:** turn the RetailOne Terms of Reference into a spec and a set of GitHub issues that an agent can implement one at a time, in the next lesson, using three skills and nothing you can't see in git.

By the end of this lesson you should be able to answer three questions:

1. Why don't we hand the TOR to the agent and say "build it"?
2. What does each of the three skills produce, and where does it land?
3. How do you tell a good spec and a good ticket breakdown from a bad one?

Lesson 2 showed that a skill is a recipe loaded on demand. Lesson 3 made sure every laptop in the room runs the same agent on the same repository. This lesson uses both: three skills, installed into the repository, that take a requirements document and turn it into work an agent can pick up.

---

## 1. Why not just paste the TOR in

The document we are working from is [`docs/tors/Retail_ERP_TOR_EN.pdf`](../docs/tors/Retail_ERP_TOR_EN.pdf), with a text copy at [`docs/tors/Retail_ERP_TOR_EN.md`](../docs/tors/Retail_ERP_TOR_EN.md) for agents that can't read PDFs. Read it once before the session. It is eight pages: four roles, master data, stock movements, purchase orders, goods receipts, sales, reports, six non-functional requirements, eight acceptance scenarios, five open questions and one change request.

It is a good TOR. It is also written for a contract, not for a build. Three things stand in the way of "build it":

- **It contains decisions nobody has made yet.** Section 10 lists five open questions. Section 2 says screens must be in Thai, and this app is in English. The TOR names four roles; our `User` model has none. An agent given the document will make all of these calls silently, and differently on every laptop.
- **It is too big for one context window.** Lesson 2 explained the dumb zone. An agent that reads the TOR, explores the codebase, and starts building purchase orders is deep in it before the first test runs. The work has to be cut into pieces that each fit a fresh window.
- **The pieces have an order.** You can't receive goods against a purchase order that doesn't exist, and you can't create one without a supplier. Hand an agent "sales" first and it invents products, stores and stock on the way.

The skills in this lesson take those three problems in order: an interview that forces the decisions out into the open, a spec that writes them down, and a ticket breakdown that cuts the spec into ordered, demoable pieces.

![Three steps in order, each run by one skill. Grill: the grill-me skill interviews you about the TOR in rounds of questions until every open decision is settled, and writes nothing. Spec: the to-spec skill turns that conversation into a spec with user stories and implementation decisions, published as one GitHub issue. Tickets: the to-tickets skill breaks the spec into vertical-slice tickets that each declare what blocks them, shows you the list to approve, then publishes them as sub-issues labelled ready-for-agent. A greyed fourth box, implement, belongs to the next lesson.](images/tor-to-tickets-flow.svg)

The three skills are from Matt Pocock's [skills collection](https://github.com/mattpocock/skills). The `grill-me` skill has been in this repository since lesson 2. The other two, and the setup skill they depend on, you install in section 3.

One rule for the whole session: **all three steps run in one conversation**. The spec step synthesises what the grill produced, and the ticket step works best with the grill still in view. Don't `/clear` between them. The one exception is `/compact`, and section 6 says when it is safe.

---

## 2. Before you start: a fork with issues switched on

The tickets are GitHub issues, and issues belong to a repository. If twenty people publish into the workshop repository, there are twenty copies of every ticket. So each person publishes into their own fork.

You already have a clone from lesson 1. From the repository root:

```bash
gh auth status                       # signed in to GitHub? if not: gh auth login
gh repo fork --remote                # creates the fork, makes it "origin", keeps the original as "upstream"
gh repo edit --enable-issues         # forks start with Issues switched off
gh repo view --json nameWithOwner,isFork,hasIssuesEnabled
```

The last command should show your own GitHub name, `"isFork": true` and `"hasIssuesEnabled": true`. If the name is `VaridenTech`, the fork step didn't repoint `origin`. Fix it with `git remote -v` and `git remote set-url origin <your fork url>` before going on.

Two facts worth knowing: `gh repo fork --remote` renames your existing `origin` to `upstream` rather than deleting it, so you can still pull the workshop's updates. And GitHub disables Issues on every fork by default, which is why the second command exists. Skipping it produces a confusing "Issues has been disabled" error ten minutes from now, in the middle of publishing.

Then open Kiro CLI in the repository root and accept the trust prompt when it asks. Everything below happens in that one session.

---

## 3. Install the skills

Skills are installed by the [skills.sh](https://skills.sh) installer, which copies `SKILL.md` folders from a GitHub repository into the right place for each agent. One command, run from the repository root:

```bash
npx skills@latest add mattpocock/skills
```

It asks two questions:

1. **Which skills?** The collection has about thirty. Pick these six:
   - `to-spec`, `to-tickets`, `setup-matt-pocock-skills`: used in this lesson.
   - `implement`, `tdd`, `code-review`: used in the next lesson. Installing them now saves a second run.

   Don't pick `grill-me` or `grilling`. They are already in `.agents/skills/`, with symlinks from `.kiro/skills/` and `.claude/skills/`, and a second copy makes two slash commands with the same name.

2. **Which agents?** The installer detects the tools on your laptop. Pick **Kiro CLI**. If you also use Claude Code or Codex, tick those too.

### What it wrote

```
.kiro/skills/to-spec/SKILL.md
.kiro/skills/to-tickets/SKILL.md
.kiro/skills/setup-matt-pocock-skills/SKILL.md      plus its template files
.kiro/skills/implement/SKILL.md
.kiro/skills/tdd/SKILL.md
.kiro/skills/code-review/SKILL.md
skills-lock.json                                     source and hash of each installed skill
```

For Kiro these are **copies**, not the symlinks lesson 2 described: the installer doesn't link into `.kiro/skills/`. For Claude Code and Codex it uses exactly lesson 2's layout, real files in `.agents/skills/` and a symlink from `.claude/skills/`. Either way `skills-lock.json` records where each skill came from so `npx skills@latest update` can refresh it. Kiro loads `.kiro/skills/` by default, and the `erp` agent from lesson 3 lists the same folder as a resource, so the new skills appear without any edit.

Check: start `kiro-cli chat`, type `/` and look at the completions. `to-spec`, `to-tickets` and `setup-matt-pocock-skills` should be there next to `grill-me`.

### If `grill-me` is missing

It shouldn't be, but if your fork lost it or you're doing this in another repository, the same installer adds it. The `grill-me` skill is a one-line wrapper that loads `grilling`, so take both:

```bash
npx skills@latest add mattpocock/skills --skill grill-me --skill grilling
```

### The other install route

Claude Code and Codex can also install the whole collection as a **plugin**: `claude plugin install mattpocock-skills@claude-plugins-official`, or `codex plugin marketplace add mattpocock/skills` then `codex plugin add mattpocock-skills@mattpocock`. A plugin updates itself, which is convenient in your own projects. It is also global configuration, exactly the layer lesson 3 reset, and installing both routes gives you every skill twice. For this workshop, the installer and committed files win.

---

## 4. Configure the tracker and the label

`to-spec` and `to-tickets` both "publish to the issue tracker" and refuse to guess which one. A short setup skill records the answer in the repository.

In Kiro CLI:

```
/setup-matt-pocock-skills
```

It explores the repo first, then asks one section at a time. Answer:

| It asks                               | Answer                                                                                                                                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Issue tracker                         | **GitHub.** It proposes this itself because `origin` points at github.com.                                                                                                                     |
| Domain docs layout                    | **Single-context.** It offers multi-context because it detects the pnpm workspace. One glossary at the root is enough for this app.                                                            |
| Where to put the "Agent skills" block | **`AGENTS.md`**, merged into the existing "Skills" section. Left alone it edits `CLAUDE.md`, which in this repo is one line that points at `AGENTS.md`, and Codex and Kiro would never see it. |

It won't ask about triage labels, because the `triage` skill isn't installed. Let it write. Afterwards you have:

- `docs/agents/issue-tracker.md`: the `gh` commands the skills use to create, read, label and link issues. Worth a skim: this is where "make it a sub-issue" and "blocked by" are defined.
- `docs/agents/domain.md`: where a glossary and decision records would go. Empty for now.
- A few lines added to the Skills section of `AGENTS.md` that point at the two files.

One more thing the setup doesn't do. Both skills apply a label called `ready-for-agent` to everything they publish, and a label has to exist before `gh issue create` can apply it. Create it once:

```bash
gh label create ready-for-agent --description "An agent can pick this up" --color 0E8A16
```

---

## 5. Step 1: grill

Start the interview. One prompt, in the same Kiro session:

```
/grill-me Read docs/tors/Retail_ERP_TOR_EN.md. We are the supplier and this repository is the product. Grill me on what the first release delivers, which rules in the TOR need a decision before we can build, and how we will prove each requirement, until we can write the spec.
```

The agent reads the TOR, explores the codebase, and comes back with a numbered **round** of questions. Each question has a recommended answer, and a plain "yes" accepts it. Answer the round, and it computes the next one: the questions that only became askable once the previous ones were settled. It stops when there is nothing left to ask.

You saw the skill from the inside in lesson 2's notes on progressive disclosure. From the outside, three things make it work:

- **Facts are the agent's job, decisions are yours.** If it asks you how many models are in the Prisma schema, push back: it can look. If it asks whether Thai screens are in scope, that is a decision, and it is waiting for you.
- **The recommendation is a proposal, not an answer.** Disagree where the class disagrees. The point of doing this in a room is that the answers are shared.
- **It writes nothing.** The output of a grill is a conversation in which every decision has been made out loud. That is deliberate: the next skill turns the conversation into the document.

Expect questions about the UI language, how the four TOR roles map onto the single `User` model, the five open questions in section 10, whether the damaged-goods change request is in, how the concurrency and idempotency rules will be tested, and how much of the TOR counts as the first release. [Appendix A](#appendix-a-the-decisions-we-made-in-class) lists the answers we settled on in class. Use it to check you haven't skipped a branch, not to pre-empt the questions.

The grill is done when the agent says the frontier is empty and asks you to confirm the shared understanding. Confirm it. Don't clear the session.

---

## 6. Step 2: spec

```
/to-spec
```

No interview this time. The skill synthesises the grill into a spec: problem statement, solution, a long list of user stories, implementation decisions, testing decisions, out of scope, notes. The only thing it stops to check is the **seams**: the places where the feature will be tested. It prefers seams that already exist and as few as possible.

The answer for this repository is the three seams the `write-tests` skill already describes, plus one new one:

- Contract schema tests in `packages/contracts`.
- Controller specs in `apps/api` that call the oRPC handlers through `call()` with a stubbed `PrismaService`.
- React component tests in `apps/web` with a `QueryClient` and a stubbed `fetch`.
- **New:** integration tests against the Docker Postgres for the posting paths. Idempotent receipts (GR-04), concurrent receipts (GR-05), the "never negative" rule (INV-03) and two sales racing for the same stock (INV-04, AC-07) cannot be proven with a stubbed database.

Say yes to that, and it publishes. Because the tracker is GitHub, the spec lands as **one issue**, labelled `ready-for-agent`, not as a markdown file. The flow diagram above says "a markdown file" because that is what the skill writes when the tracker is local files. Here, the issue is the file. Its number is the input to the next step, so note it:

```bash
gh issue list --label ready-for-agent      # the spec should be the only issue so far
gh issue view <number>                     # read it
```

Read it properly. A good spec has user stories that cover every role in the TOR, implementation decisions you recognise from the grill, and an "Out of Scope" section that lists what the TOR excludes plus what the class deferred. If a decision is wrong or missing, say so in the chat and have the agent `gh issue edit` the body. Don't move on with a spec you wouldn't sign.

### If the window is filling up

By now the agent has read the TOR, explored the codebase, and run several rounds of questions. Check how much of the window that cost:

```
/context show
```

Lesson 2's smart zone rule applies: past roughly half the window, the agent gets worse at exactly the judgement the ticket step needs. **This is the one safe moment to compact.** The spec is on GitHub, so nothing you still need lives only in the conversation, and `/to-tickets #<spec number>` fetches the issue regardless. Run `/compact` here and carry on. Don't compact during the grill or between the grill and the spec: `/to-spec` writes the spec from the conversation, and a summary of a hundred decisions is not the same as the decisions.

---

## 7. Step 3: tickets

```
/to-tickets #<spec number>
```

The skill reads the spec issue, explores the codebase again, and drafts tickets. Before it publishes anything, it shows you a numbered list, each with a title, what it delivers, and **blocked by**: the tickets that must close first. Then it asks whether the granularity is right, whether the edges are real, and what to merge or split. This is the step where you earn your keep.

### What a good ticket looks like

![Two issue cards side by side. Left, marked not a ticket: Products, Prisma model and migration. Only the schema layer is filled in the strip above it, its criteria Migration runs and Products page loads are flagged as passing today, and it has no Covers line and no TOR IDs. Right, marked a ticket: number 15, create and edit a product with SKU uniqueness enforced, parent number 12, covers MD-01 and MD-02, labelled ready-for-agent, every layer filled, criteria that fail against today's code and cite TOR IDs, blocked by number 14 stores and suppliers. Below, three checks: vertical, traceable, each criterion can fail today.](images/good-ticket.svg)

Every ticket is a **tracer bullet**: a narrow but complete path through schema, API, UI and tests, demoable on its own, sized for one fresh context window. Three checks for each one:

- **Vertical, not horizontal.** "Products: Prisma model and migration" is a layer, not a ticket. "Create and edit a product, with SKU uniqueness enforced" is a ticket. If a ticket is one layer wide, ask for it to be merged with the layers above and below it.
- **Traceable.** Ask for a `Covers:` line with the TOR requirement IDs the ticket implements, and acceptance criteria that cite the TOR's AC-xx scenarios where one exists. The TOR's section 7.2 demands traceability from every requirement to delivered functionality, and this is the cheapest moment to get it.
- **Each criterion can fail today.** The skill's own documentation warns that acceptance criteria sometimes pass before any work is done. "The products page loads" passes now. "A second product with SKU001 is rejected with a message naming the SKU" does not.

Across the set, two more:

- **Size.** Aim for 15 to 25 tickets. The skill tends to over-decompose; fewer than ten means the slices are too fat for one context window, more than thirty means someone will spend the next lesson managing issues instead of building.
- **Order.** The unblocked frontier should be the foundations: roles and seed data, then stores and suppliers, then products, then the stock view. Purchase orders, receipts, sales and reports hang off those. The load test for NFR-05 is last and blocked by everything.

Iterate until you'd hand the list to a colleague. Then approve it.

### What lands on GitHub

![One spec issue at the top. Below it, tickets as sub-issues in four columns. Arrows run from a blocker to the ticket it blocks. The left column, roles and seed data, has no blockers and is the frontier an agent can start on now. Later columns wait for the arrows into them to close. Every ticket carries the ready-for-agent label.](images/spec-and-ticket-tree.svg)

The skill publishes in dependency order, blockers first, so every ticket can reference real issue numbers. Each ticket becomes a **sub-issue** of the spec, and each blocking edge becomes a native GitHub **dependency** where the tracker doc's API calls succeed, or a `Blocked by: #n` line at the top of the body where they don't. Either way the information is on the issue, and GitHub shows native edges in the sidebar.

Check what happened:

```bash
gh issue list --label ready-for-agent --limit 50           # spec plus every ticket
gh issue view <spec number>                                 # sub-issues are listed under the body
gh issue view <first ticket> --json body --jq .body | head  # Covers line, criteria, Blocked by
```

Open the spec on github.com as well. The sub-issue list shows a progress bar, and each ticket's sidebar shows what blocks it. That page is what the next lesson starts from.

---

## 8. Commit what you made

Everything this lesson produced is configuration or documentation, and lesson 3's rule still applies: if it isn't in git, nobody else has it, including the agent you start tomorrow.

```bash
git status
git add .kiro/skills skills-lock.json docs/agents AGENTS.md
git commit -m "Install planning skills and configure the GitHub issue tracker"
git push
```

The issues themselves live on GitHub and need no commit. Don't commit `.scratch/` if the skill created one; it is working space.

---

## 9. Check that it worked

- `gh repo view` shows your fork, and `gh issue list --label ready-for-agent` lists the spec and 15 to 25 tickets.
- At least two tickets have no blockers. `gh issue view` on one of them shows a `Covers:` line and criteria that would fail against today's code.
- Every ticket is a sub-issue of the spec, visible on the spec's page on github.com.
- `git log -1 --stat` shows the skills, the lock file, `docs/agents/` and `AGENTS.md`, and nothing else.
- Kiro's `/context show` lists the new skills alongside the repo's own, and nothing from your home directory.

---

## Summary

- A TOR is **written for a contract**. It contains undecided questions, more than one window's worth of work, and pieces with an order. None of that is the agent's to resolve.
- **Grill** turns the document into decisions, out loud, in rounds. Facts are the agent's job; decisions are yours; nothing is written.
- **Spec** turns the conversation into one document the agent can build from, published as a GitHub issue because that is the tracker this repo configured.
- **Tickets** turns the spec into 15 to 25 vertical slices, each with the TOR requirements it covers and the tickets that block it, as sub-issues you approved before they were published.
- **One conversation**, and one safe place to `/compact`: after the spec is on GitHub, never before.
- All of it is **installed into the repository** and committed, so the next lesson starts from the same place on every laptop.

---

## Optional: try it later

This isn't part of the session. The TOR's section 10.3 describes a change request, CR-01, for recording damaged goods on receipt, and lists exactly what has to be decided before it can be approved. In a fresh session, run:

```
/grill-me Read section 10.3 of docs/tors/Retail_ERP_TOR_EN.md. RetailOne wants to approve CR-01. Grill me until we can write the change request.
```

Then `/to-spec` and `/to-tickets`. Compare the tickets with the ones from class: a change request that touches GR-02, GR-03 and GR-05 should be blocked by the receipt tickets you already have.

---

## Appendix A: the decisions we made in class

These are the answers the room settled on. Your grill will phrase its questions differently and may find branches that aren't here. Treat the list as a checklist of decisions that must exist somewhere in your spec, not as the only right answers.

| Topic                        | Decision                                                                                                                                                                                                                                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First release                | Everything in TOR sections 4 to 6: master data, stock, purchase orders, goods receipts, sales, reports. The section 3 exclusions stay excluded.                                                                                                                                               |
| UI language                  | English. The TOR's Thai screens and Thai error messages (section 2, NFR-04) are recorded as a deferred deviation in Out of Scope. Asia/Bangkok dates and two-decimal THB amounts stay, because they are cheap and the acceptance scenarios depend on them.                                    |
| Roles                        | A `role` on `User` with the four TOR roles, plus an assigned store for store employees. Every permission is enforced in the API (NFR-01). The seed gets the TOR's test users: `buyer01`, `staff_b01`, `staff_b02`, `manager01`, the two stores, the supplier, the three SKUs and PO-DEMO-001. |
| Q-01 approvals               | Single-manager approval, as PO-03 states. No thresholds or delegation.                                                                                                                                                                                                                        |
| Q-02 deactivated products    | A product deactivated after an order is approved **can still be received** against that order. MD-02 only forbids inactive products on new documents, and a receipt is not a new document.                                                                                                    |
| Q-03 backdated receiving     | Not required. Receipts use the system confirmation timestamp.                                                                                                                                                                                                                                 |
| Q-04 reversals               | Out of scope, as the TOR says.                                                                                                                                                                                                                                                                |
| Q-05 units and barcodes      | One base unit per SKU. No conversion, no scanning.                                                                                                                                                                                                                                            |
| CR-01 damaged goods          | Excluded from the baseline. It is the "try it later" exercise above.                                                                                                                                                                                                                          |
| NFR-01 to 04 and 06          | Acceptance criteria inside the functional tickets, not separate tickets. "Permission enforced in the API" belongs on every ticket that has a permission.                                                                                                                                      |
| NFR-05 load test             | One final ticket, blocked by everything: seed 1,000 products and 10,000 movements, measure p95 on search and stock view.                                                                                                                                                                      |
| Section 7.2 delivery package | Not ticketed. The README already covers install and run; handover documents are not part of the workshop.                                                                                                                                                                                     |
| Test seams                   | The three seams from the `write-tests` skill, plus Postgres integration tests for the posting paths. See section 6.                                                                                                                                                                           |
| Ticket shape                 | 15 to 25 vertical slices. Each has a `Covers:` line with TOR IDs and cites AC-xx scenarios where they exist. First frontier: roles and seed, stores and suppliers, products, stock view.                                                                                                      |

---

## Appendix B: the same steps in Claude Code and Codex

The skills are the same files; only the install target and the way you invoke them change.

| Step    | Kiro CLI                                                                                  | Claude Code                                                                                                            | Codex                                                                                  |
| ------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Install | `npx skills@latest add mattpocock/skills`, pick Kiro CLI. Copies land in `.kiro/skills/`. | Same command, pick Claude Code. Files land in `.agents/skills/` with a symlink from `.claude/skills/`, as in lesson 2. | Same command, pick Codex. Files land in `.agents/skills/`, which Codex reads directly. |
| Invoke  | `/to-spec`                                                                                | `/to-spec`                                                                                                             | `$to-spec`, or "use the to-spec skill" in plain words                                  |
| Verify  | `/context show`                                                                           | `/context`                                                                                                             | Type `$` and check the skill is in the list                                            |
| Window  | `/context show` to check usage, `/compact` after the spec is published                    | `/context` and `/compact`                                                                                              | `/status` and `/compact`                                                               |
| Commit  | `.kiro/skills` and `skills-lock.json`                                                     | `.agents/skills`, `.claude/skills` and `skills-lock.json`                                                              | `.agents/skills` and `skills-lock.json`                                                |

---

## Further reading

- Matt Pocock, [grill-me](https://www.aihero.dev/skills-grill-me), [to-tickets](https://www.aihero.dev/skills-to-tickets), and the [skills collection](https://github.com/mattpocock/skills) on GitHub: the skill sources, with the setup skill's tracker templates.
- [skills.sh](https://skills.sh): the installer, the agents it supports, and the `skills-lock.json` format.
- Kiro, [Skills](https://kiro.dev/docs/cli/skills/): where skills live and how they become slash commands.
- GitHub, [Sub-issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues) and [Issue dependencies](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-issue-dependencies): the native relationships the tickets use.
- Hunt and Thomas, _The Pragmatic Programmer_, "Tracer Bullets": the idea behind vertical-slice tickets.

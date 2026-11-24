# Judge Laugh Dev — "Make the AI Judge Laugh: Developer Excuses" (make.fun)

A deterministic excuse-writing program. It scores a pool of original
one-line developer excuses against a rubric mirroring the judge's brief —
a twist a developer recognises that reveals what really happened, spoken
like a developer would actually say it with the jargon used right, landing
fast in one line, and fresh (avoiding the worn excuses or turning one in a
way nobody has before) — and writes the winner to
`$MAKEFUN_OUTPUT_DIR/entry.txt`.

## What it does

`main.ts` (Node 22, zero dependencies, no network) scores 28 hand-written
original excuses and picks the winner by deterministic argmax: highest
score, then shortest, then lexicographic. Every candidate is validated
first: one sentence, 1–200 characters. The scorer rewards a late pivot
("which is how", "and now the ticket says", "never pushed", "was the bug"),
production jargon used right (prod, deploy, hotfix, rollback, pipeline,
cron, branch), short economical lines, and a turn that reframes a worn
excuse instead of repeating it; it penalises filler and explanations.

The winning line (82 characters):

> The hotfix is in production now, which is how we found out the hotfix was the bug.

## Run it locally

```sh
MAKEFUN_OUTPUT_DIR=/tmp/judge-out node main.ts
cat /tmp/judge-out/entry.txt
```

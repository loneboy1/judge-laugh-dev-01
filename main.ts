// One-line developer-excuse writer for make.fun's
// "Make the AI Judge Laugh: Developer Excuses".
// Writes a single funny excuse to $MAKEFUN_OUTPUT_DIR/entry.txt.
// Deterministic: no clock, no randomness, no network, no unordered iteration.
// Node 22, zero dependencies, erasable TypeScript only.
//
// The judge (a comedy writer who has shipped code and sat through
// production incidents) weighs, most important first:
//   1. a funny single-line excuse a developer gives when code breaks in
//      production, at most 200 characters;
//   2. a twist a developer recognises, revealing what really happened
//      rather than stating the obvious;
//   3. sounds like something a developer would actually say out loud,
//      with the jargon used right;
//   4. lands fast in one line, with every word earning its place and
//      nothing to trim;
//   5. feels fresh, either avoiding the worn excuses or turning one of
//      them in a way nobody has before.
// The scorer below mirrors that brief in the same order. Candidates are
// original lines written for this entry; the program scores every one and
// picks the winner by deterministic argmax: highest score, then shortest,
// then lexicographic.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------- candidates
// Every line is one sentence of at most 200 characters: the excuse a
// developer gives when code breaks in production. The strongest lines share
// one shape: a plausible excuse, then a pivot near the end that reveals what
// really happened. Several worn excuses appear in turned wordings so the
// scorer, not habit, picks the best turn.

const CANDIDATES: string[] = [
  // Temporary fix: the setup names a 2019 temp fix, the ending lets it expire.
  "The outage started when my 'temporary' fix from 2019 finally noticed it was temporary.",
  // Tests passed: the setup swears the tests passed, the ending names where.
  "I swear the tests passed — on the branch I never pushed.",
  // Bus factor: the setup names the one person who understood the service.
  "Production broke because the only person who understood that service left, and that person was me, yesterday.",
  // Hotfix: the setup ships the fix, the ending finds the fix was the bug.
  "The hotfix is in production now, which is how we found out the hotfix was the bug.",
  // Retry: the setup configures forever, the ending lets the server obey.
  "I told the server to retry forever, and it took me at my word.",
  // Works on my machine, turned: the setup quotes the worn excuse, the
  // ending ships the machine.
  "The deploy worked on my machine, which is why my machine is now in production.",
  // Not a bug, turned: the setup denies the bug, the ending indicts the author.
  "It wasn't a bug, it was the system faithfully doing exactly what I told it to, which is the problem.",
  // Only in prod: the setup limits the bug to production, the ending names why.
  "The bug only happens in production because that's the only place with users, data, and consequences.",
  // Friday deploy: the setup merges at 5 p.m., the ending leaves with the brain.
  "I merged it Friday at 5 p.m. because the sprint ended and my brain had already left the building.",
  // Urgent ticket: the setup edits prod config for urgency, the ending renames the ticket.
  "I changed one config value directly in prod because the ticket said urgent, and now the ticket says outage.",
  // Jinx: the setup tempts fate in the deploy channel, the ending collects.
  "The service went down right after I typed 'what could possibly go wrong' in the deploy channel.",
  // Feature not a bug, turned: the setup denies the bug, the ending ships the surprise.
  "We didn't ship a bug, we shipped a surprise feature with no changelog and no warning.",
  // 2 a.m. change: the setup names the hour, the ending names the confidence.
  "The root cause is a one-line change I made at 2 a.m. while fully confident and half asleep.",
  // Pipeline: the setup denies pushing, the ending blames the coffee break.
  "I didn't push to prod, the pipeline deployed it while I was getting coffee.",
  // Real data: the setup defends the code, the ending blames reality.
  "My code didn't break prod — prod broke my code by having real data in it.",
  // Trust issues: the setup clears the database, the ending blames the query.
  "The database is fine, it's the query I wrote at 2 a.m. that has trust issues.",
  // Wrong final: the setup names the branch, the ending merges the other one.
  "I fixed it in a branch called final-final-v2, then merged the wrong final.",
  // Cron: the setup says the job only fails unwatched, the ending picks 3 a.m.
  "The cron job only fails when nobody is watching, which is why it waited until 3 a.m.",
  // Real user: the setup passes every test, the ending adds the user.
  "It passed every test except the one where a real user touches it.",
  // Rollback: the setup needs the old deploy, the ending overwrote it.
  "The rollback failed because the deploy I need to roll back to is the one I just overwrote.",
  // Surprise release: the setup denies breaking prod, the ending renames it.
  "I didn't break production, I just gave it a surprise release nobody asked for.",
  // Standup: the setup owns the error, the ending names where it was written.
  "The error was in the code I wrote, but in my defence I wrote it during standup.",
  // Ship it: the setup says the words out loud, the ending watches prod fall.
  "Production went down the minute I said 'ship it, what could go wrong' out loud.",
  // Logging: the setup silences the logs for speed, the ending confirms it worked.
  "The logs say nothing because I removed the logging to make it faster, and it worked.",
  // Friday again: the setup ships because the sprint ended, the ending finds no one objecting.
  "I deployed on Friday because the calendar said the sprint ended and nobody stopped me.",
  // Nobody owns it: the setup names the unowned code, the ending takes ownership.
  "The bug is in the part of the codebase nobody owns, which is why I own it now.",
  // Ship the laptop: the setup limits the working machine to one, the ending ships it.
  "My laptop is the only machine it works on, so technically the fix is to ship my laptop.",
  // Undocumented: the setup admits no docs, the ending needs them now.
  "The incident started when the service I never documented finally needed documenting.",
];

// Production words: the excuse must live in production's world.
const PROD_WORDS: string[] = [
  "prod", "production", "deploy", "outage", "service", "server",
  "database", "incident", "rollback", "hotfix", "config",
  "pipeline", "cron", "branch", "merge", "test", "log",
  "release", "codebase", "code", "fix", "temporary",
];

// First-person excuse voice: a developer speaking, not a narrator.
const VOICE_MARKERS: string[] = [
  "I ", "my ", "we ", "I didn't", "I swear", "in my defence",
];

// Words that mark the pivot: the turn that reveals what really happened.
// The pivot must land late, so a marker early in the line scores less.
const TWIST_MARKERS: string[] = [
  "which is", "and now", "finally", "turns out", "because",
  "—", "but", "so technically", "which means", "right after",
  "the minute", "while", "until", "except", "now the",
  "never pushed", "on the branch", "was the bug",
  "took me at my word", "says outage", "finally noticed",
];

// Worn excuses the judge has heard a hundred times.
const WORN: string[] = [
  "works on my machine", "it worked yesterday", "must be the cache",
  "have you tried turning it off", "it's a feature", "not a bug",
  "tests passed", "someone changed something", "dns", "race condition",
  "merge conflict", "friday deploy", "ship it",
];

// A worn excuse turned by a reframing clause after it: the turn restores
// freshness, because the brief rewards turning a worn excuse.
const TURN_AFTER_WORN: string[] = [
  "never pushed", "on the branch", "which is why",
  "so technically", "now the ticket says", "was the bug",
  "is now in production",
];

// Filler that costs economy: words that explain instead of landing.
const FILLER: string[] = [
  "very", "really", "just", "actually", "basically", "literally",
  "quite", "in order to", "the fact that",
];

interface Scored {
  text: string;
  score: number;
  parts: [number, number, number, number, number];
}

// Score one candidate against the judge brief, weights in brief order:
// fit 25, twist 25, voice 20, economy 15, freshness 15.
function score(text: string): Scored {
  const low = text.toLowerCase();
  const n = text.length;

  // 1. fit (25): first-person excuse voice + production context.
  let fit = 10;
  if (VOICE_MARKERS.some((m) => text.includes(m))) fit += 7;
  const prodHits = PROD_WORDS.filter((w) => low.includes(w)).length;
  fit += Math.min(8, prodHits * 3);

  // 2. twist (25): a late pivot marker that reframes the setup.
  let twist = 6;
  let bestPos = -1;
  for (const m of TWIST_MARKERS) {
    const p = low.lastIndexOf(m);
    if (p > bestPos) bestPos = p;
  }
  if (bestPos >= 0) twist += 8 + Math.round((11 * bestPos) / Math.max(1, n));

  // 3. voice (20): dev jargon, used right, sounds said out loud.
  const voice = 8 + Math.min(12, prodHits * 4);

  // 4. economy (15): shorter lands faster; filler words cost.
  let economy = 15 - Math.max(0, Math.floor((n - 60) / 12));
  for (const f of FILLER) if (low.includes(f)) economy -= 2;
  economy = Math.max(1, economy);

  // 5. freshness (15): a worn phrase costs, unless a turn clause after it
  // reframes it.
  let fresh = 15;
  for (const w of WORN) {
    if (low.includes(w)) {
      fresh -= 8;
      const after = low.slice(low.indexOf(w));
      if (TURN_AFTER_WORN.some((t) => after.includes(t))) fresh += 8;
    }
  }
  fresh = Math.max(1, Math.min(15, fresh));

  return { text, score: fit + twist + voice + economy + fresh, parts: [fit, twist, voice, economy, fresh] };
}

// One sentence: no newline, 1-200 chars, ends with one terminal mark, and
// no sentence break inside (a.m. / p.m. are not breaks).
function isValid(text: string): boolean {
  if (text.length < 1 || text.length > 200) return false;
  if (text.includes("\n") || text.trim() !== text) return false;
  if (!/[.!?]$/.test(text)) return false;
  // Abbreviations are not sentence breaks: strip them from the whole line
  // first (a trailing "a.m." / "p.m." loses its period to the strip, which
  // is fine — the terminal mark was already checked above), then look for
  // any remaining sentence break in the body.
  const deabbrev = text.replace(/a\.m\./g, "am").replace(/p\.m\./g, "pm");
  const body = deabbrev.slice(0, -1);
  return !/[.!?]/.test(body);
}

function buildCandidates(): Scored[] {
  const out: Scored[] = [];
  for (const c of CANDIDATES) {
    if (!isValid(c)) throw new Error(`invalid candidate: ${c}`);
    out.push(score(c));
  }
  return out;
}

function pickBest(candidates: Scored[]): Scored {
  const sorted = [...candidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.text.length !== b.text.length) return a.text.length - b.text.length;
    return a.text < b.text ? -1 : a.text > b.text ? 1 : 0;
  });
  return sorted[0];
}

// --------------------------------------------------------------------- main
function main(): void {
  const candidates = buildCandidates();
  if (candidates.length === 0) throw new Error("no valid excuse candidate");
  const best = pickBest(candidates);
  if (process.env.JUDGE_DEBUG) {
    const ranked = [...candidates].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.text.length !== b.text.length) return a.text.length - b.text.length;
      return a.text < b.text ? -1 : a.text > b.text ? 1 : 0;
    });
    for (const c of ranked.slice(0, 5)) {
      console.log(`[${c.score}] (${c.text.length}) ${c.text}`);
    }
  }
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "entry.txt"), best.text, "utf8");
  console.log(best.text);
  console.log(
    `chars: ${best.text.length} score: ${best.score} candidates: ${candidates.length}`,
  );
}

main();

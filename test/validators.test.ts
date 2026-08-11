// Run: npm test  (uses tsx). Tests the deterministic quality gates.
import assert from "node:assert";
import {
  hasEmDash,
  sanitizeEmDashes,
  findBannedWords,
  readability,
  openingSimilarity,
  openingFingerprint,
  contentSimilarity,
  evaluatePage,
  stripHtml,
} from "../src/lib/validators";

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (e) {
    failed++;
    console.error(`FAIL  ${name}\n      ${(e as Error).message}`);
  }
}

// --- Em dashes ---
test("detects em dash", () => {
  assert.equal(hasEmDash("We fix roofs — fast."), true);
  assert.equal(hasEmDash("We fix roofs, fast."), false);
});
test("detects en dash used as break and double hyphen", () => {
  assert.equal(hasEmDash("Great work – every time."), true);
  assert.equal(hasEmDash("Great work -- every time."), true);
});
test("sanitizes em dashes to commas and leaves no dash", () => {
  const out = sanitizeEmDashes("We fix roofs — fast, and clean.");
  assert.equal(hasEmDash(out), false);
  assert.ok(out.includes("roofs, fast"));
});

// --- Banned words ---
test("finds banned AI-tell words", () => {
  const hits = findBannedWords("We unleash a seamless, world-class experience.");
  const phrases = hits.map((h) => h.phrase);
  assert.ok(phrases.includes("unleash"));
  assert.ok(phrases.includes("seamless"));
  assert.ok(phrases.includes("world-class"));
});
test("banned words respects word boundaries", () => {
  // "realm" is banned but should not match inside "realmonte"
  const hits = findBannedWords("The realmonte district is nice.");
  assert.equal(hits.length, 0);
});
test("banned words honors per-client extras", () => {
  const hits = findBannedWords("Our premier service.", ["premier"]);
  assert.ok(hits.some((h) => h.phrase === "premier"));
});

// --- Readability ---
test("simple text scores easy (high reading ease)", () => {
  const r = readability("We fix roofs. We are fast. You will be happy. Call us today.");
  assert.ok(r.fleschReadingEase > 70, `ease was ${r.fleschReadingEase}`);
});
test("dense text scores hard (low reading ease)", () => {
  const dense =
    "The multifaceted implementation necessitates comprehensive architectural reconfiguration alongside substantial infrastructural modernization initiatives.";
  const r = readability(dense);
  assert.ok(r.fleschReadingEase < 40, `ease was ${r.fleschReadingEase}`);
});

// --- Openings ---
test("identical openings are highly similar", () => {
  const a = "Looking for roof repair in Austin you can trust today right now";
  const b = "Looking for roof repair in Austin you can trust today right now";
  assert.ok(openingSimilarity(a, b) > 0.9);
});
test("different openings are dissimilar", () => {
  const a = "When a summer storm rolls through Round Rock, shingles take the hit.";
  const b = "Your flat commercial roof in Cedar Park needs a specialist, not a generalist.";
  assert.ok(openingSimilarity(a, b) < 0.4);
});
test("opening fingerprint is first ~15 words", () => {
  const fp = openingFingerprint("<p>We fix roofs fast and well for every home in town nearby around here today.</p>");
  assert.ok(fp.split(" ").length <= 15);
  assert.ok(fp.startsWith("we fix roofs"));
});

// --- Content similarity ---
test("near-duplicate bodies flag high similarity", () => {
  const a = "We repair roofs in Austin with fast friendly local service and fair honest pricing.";
  const b = "We repair roofs in Dallas with fast friendly local service and fair honest pricing.";
  assert.ok(contentSimilarity(a, b) > 0.4, `sim ${contentSimilarity(a, b)}`);
});
test("distinct bodies flag low similarity", () => {
  const a = "Hail season in Austin batters asphalt shingles every single spring without fail.";
  const b = "Cedar Park homeowners often deal with clay tile cracking under intense summer heat.";
  assert.ok(contentSimilarity(a, b) < 0.4);
});

// --- Full gate evaluator ---
test("evaluatePage fails a short page with an em dash and banned word", () => {
  const html = "<p>We unleash roofing — the best around.</p>";
  const res = evaluatePage(html);
  assert.equal(res.ok, false);
  assert.ok(res.hardFailures.some((f) => f.includes("word")));
  assert.ok(res.hardFailures.some((f) => f.toLowerCase().includes("min")));
});
test("stripHtml removes tags", () => {
  assert.equal(stripHtml("<h2>Hi</h2><p>There</p>"), "Hi There");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

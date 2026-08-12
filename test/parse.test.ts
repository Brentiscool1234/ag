// Tests the delimited output parser (and its JSON fallback).
import assert from "node:assert";
import { parsePage } from "../src/lib/providers";

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

const delimited = `===TITLE===
Web Design Dallas, TX | Sites That Generate Leads
===META===
Lead-generating web design for Dallas businesses. Fast, mobile, built to convert.
===H1===
Web Design Dallas, TX | Websites Built to Generate Leads
===BODY===
<h2>Web Design for Dallas Businesses</h2>
<p>Your website should turn visitors into calls. We build fast, mobile sites.</p>
<h2>Our Process</h2>
<p>Consultation, strategy, design, build, launch, support.</p>
===FAQ===
Q: How much does web design cost in Dallas?
A: Most projects start at a few thousand dollars depending on scope.
Q: Do you redesign existing sites?
A: Yes. We audit your current site and rebuild what is holding it back.
===END===`;

test("parses delimited title/meta/h1/body", () => {
  const p = parsePage(delimited);
  assert.equal(p.title, "Web Design Dallas, TX | Sites That Generate Leads");
  assert.ok(p.metaDescription.startsWith("Lead-generating"));
  assert.ok(p.h1.includes("Websites Built to Generate Leads"));
  assert.ok(p.html.includes("<h2>Web Design for Dallas Businesses</h2>"));
  assert.ok(p.html.includes("Consultation, strategy"));
  // BODY must not bleed into the FAQ section
  assert.ok(!p.html.includes("How much does web design cost"));
});

test("parses FAQ Q/A pairs", () => {
  const p = parsePage(delimited);
  assert.equal(p.faqs.length, 2);
  assert.equal(p.faqs[0].question, "How much does web design cost in Dallas?");
  assert.ok(p.faqs[0].answer.startsWith("Most projects start"));
  assert.ok(p.faqs[1].question.startsWith("Do you redesign"));
});

test("falls back to JSON when not delimited", () => {
  const json = JSON.stringify({
    title: "SEO Austin, TX",
    metaDescription: "SEO for Austin.",
    h1: "SEO Austin",
    html: "<h2>SEO in Austin</h2><p>We rank local businesses.</p>",
    faqs: [{ question: "Q?", answer: "A." }],
  });
  const p = parsePage(json);
  assert.equal(p.title, "SEO Austin, TX");
  assert.ok(p.html.includes("We rank local businesses"));
  assert.equal(p.faqs.length, 1);
});

test("falls back to JSON in code fences", () => {
  const fenced = "```json\n" + JSON.stringify({ title: "T", html: "<p>hi</p>" }) + "\n```";
  const p = parsePage(fenced);
  assert.equal(p.title, "T");
  assert.ok(p.html.includes("hi"));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

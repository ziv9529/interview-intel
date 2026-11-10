# Interview Intel IL

A personal knowledge base of how Israeli tech companies interview. Raw material is captured by hand, turned into structured claims, and summarised on demand before an interview.

## Capturing

**Capture** (לכידה):
One raw piece of material, saved exactly as received and never changed afterwards. Its kind is text, url or image.
_Avoid_: post, item, entry

**Source** (מקור):
The document or channel a Capture came from: a LinkedIn post, an article, a video, or an Interview Report. A comment is not a Source; the person who wrote it is a Speaker.
_Avoid_: origin, channel

**Interview Report** (דיווח ראיון):
A Source type: your own account of an interview you sat. The most credible Source.
_Avoid_: feedback, debrief

## Extracting

**Insight** (תובנה):
One structured claim about an interview process, extracted from a Capture: at most one Stage per Insight, so a post describing four Stages yields four Insights. An Insight with no company is valid: it is a claim about the market in general.
_Avoid_: record, row, fact

**Extraction Run** (ריצת חילוץ):
One attempt to turn a Capture into Insights with a given model and prompt version. It either succeeds or fails. Only the latest successful run of a Capture is current; Insights from older runs are kept but ignored.
_Avoid_: job, attempt

**Verdict** (שיפוט):
Your 👍 or 👎 on one Extraction Run. A 👎 makes its Capture a Golden Set candidate.
_Avoid_: feedback, rating

**Speaker** (דובר):
The person an Insight is attributed to, and their role: hiring manager, recruiter, candidate, journalist. One Capture can have several Speakers.
_Avoid_: author, user

**Credibility** (אמינות):
A 1–5 rating of an Insight, computed by fixed rule from its Source type, its Speaker's role, and whether it is first-hand. Never produced by the model.
_Avoid_: score, trust

## Interview process

**Stage** (שלב):
One step in a hiring process: CV screen, HR call, technical interview, system design, manager interview, offer.
_Avoid_: round, step

**Format** (פורמט):
How a Stage is run: live coding, AI-assisted, take-home, discussion of past work.
_Avoid_: type, style

**Role** (תפקיד):
The job family an Insight is about, from a fixed list (backend, frontend, fullstack, data, devops, mobile, qa, pm, other).
_Avoid_: position, title

**Seniority** (בכירות):
The level an Insight is about, from a fixed list (junior, mid, senior, staff, lead, manager).
_Avoid_: level, grade

## Using

**Brief** (תדריך):
A summary generated on demand for a company and/or Role, built from current Insights about that company plus recent market-wide Insights for the Role. Every claim in it points back to the Capture it came from. Each Brief is kept as a record but never reused.
_Avoid_: summary, report

**Golden Set** (סט זהב):
Captures labelled by hand with the Insights they should yield, used to measure extraction quality.
_Avoid_: test data, fixtures

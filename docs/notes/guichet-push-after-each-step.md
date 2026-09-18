---
name: guichet-push-after-each-step
description: "For the Guichet project, commit and push to GitHub (origin master) automatically after each completed step, without asking."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 8ecfdc15-a97a-41f6-a140-c3c9f48a4903
  modified: 2026-09-18T21:59:20.950Z
---

For C:\dev\guichet, after each completed step: commit, then `git push` to `origin master` (https://github.com/totostar1900/guichet.git). Do not ask for confirmation for the push.

**Why:** the user said "yes, push automatically after each step" (2026-09-14); the repo is their backup since the code lives outside OneDrive.
**How to apply:** end every work step with commit + push; mention the pushed commit hash in the summary. Credentials are already stored on the machine (push worked without prompting). See [[guichet-project]].

**Vercel gotcha (2026-09-19):** an *Instant Rollback* or *Redeploy* of an older deployment from the Vercel dashboard switches the project to *staged* promotion — later pushes build and read "Ready" but stay **Staged** (badge "Production · Staged", "Assigning Custom Domains: Skipped") and production keeps the old version. Fix: Deployments › the wanted deployment › *Promote*; auto-promotion resumes afterwards (verified: promoting `5087cc8` made the next push `4e77145` go live by itself). The user's Chrome is signed in to Vercel (project purpose-capital/guichet, user totostar1900) — use Claude in Chrome for that; the API token in %APPDATA% is dead. Check a deployment without the dashboard: `https://api.github.com/repos/totostar1900/guichet/commits/<sha>/status` (`pending` = not built yet) + `curl` the live page for a marker of the new markup. The Hobby build queue can lag 10–40 min after a push on busy evenings; Vercel may cancel a build superseded by a newer push.

The memory notes are also copied into the repo at `docs/notes/*.md` (user asked 2026-09-18 so the team can read them): after updating a memory file, copy it there and commit with the next push.

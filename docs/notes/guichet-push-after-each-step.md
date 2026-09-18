---
name: guichet-push-after-each-step
description: "For the Guichet project, commit and push to GitHub (origin master) automatically after each completed step, without asking."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 8ecfdc15-a97a-41f6-a140-c3c9f48a4903
  modified: 2026-09-14T11:20:27.948Z
---

For C:\dev\guichet, after each completed step: commit, then `git push` to `origin master` (https://github.com/totostar1900/guichet.git). Do not ask for confirmation for the push.

**Why:** the user said "yes, push automatically after each step" (2026-09-14); the repo is their backup since the code lives outside OneDrive.
**How to apply:** end every work step with commit + push; mention the pushed commit hash in the summary. Credentials are already stored on the machine (push worked without prompting). See [[guichet-project]].

The memory notes are also copied into the repo at `docs/notes/*.md` (user asked 2026-09-18 so the team can read them): after updating a memory file, copy it there and commit with the next push.

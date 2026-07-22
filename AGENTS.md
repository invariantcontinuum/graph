# AGENTS.md

Guidance for autonomous coding agents (Jules, Bolt, Palette, and others)
working on `@invariantcontinuum/graph`.

## Rule zero: do not duplicate in-flight work

This repo has had waves of duplicate agent PRs (same optimization or a11y fix
re-implemented on a dozen branches). Every duplicate wastes review time and
guarantees merge conflicts. Before writing **any** code:

1. **List open PRs first** —
   `gh pr list --repo invariantcontinuum/graph --state open --limit 100`.
   Read the titles *and* the touched-file lists. If an open PR already covers
   your intended change (same files, same goal), **stop**. Do not open a
   competing PR.
2. **Check what recently merged** —
   `git log --oneline origin/main -30`. If main already contains the change
   (e.g. an equivalent optimization landed via another PR), there is nothing
   to do. Verify with a real diff, not a guess:
   `git diff origin/main...HEAD -- <files you would touch>`.
3. **One change per PR, one PR per change.** If two of your ideas touch the
   same hot files (`react/Graph.tsx`, the overlay files, `engine/buffers.rs`,
   `spatial.rs`), ship them sequentially — the second branch must be created
   *after* the first PR merges, from fresh `origin/main`.
4. **Always branch from the latest main** — `git fetch origin && git switch -c <branch> origin/main`.
   Never build on top of a stale local main or another agent's branch.
5. **If your PR goes stale** (mergeable: CONFLICTING), resolve by rebasing or
   merging `origin/main` into your branch and pushing — do not close it and
   open a replacement PR with the same content.

If the only sensible action is a duplicate, the correct output is "no change
needed", not a new PR.

## Playbooks

- `.jules/bolt.md` — performance, Rust/WASM internals, refactors, SonarCloud
  code-quality findings.
- `.jules/palette.md` — accessibility, UX, design.
- `.jules/feature-roadmap.md` — prioritized feature backlog.
- `.jules/sonarqube.md` — SonarCloud triage notes.

Pick work from these playbooks. When you finish an item, update the playbook
in the same PR so the next agent does not pick the same task (this is the
second anti-duplication mechanism — keep it accurate).

## Validation (must pass before opening a PR)

- `cargo fmt --all --check`
- `cargo clippy --all-targets -- -D warnings -A clippy::chunks_exact_to_as_chunks`
- `cargo test -p graph-core -p graph-layout --all-features`
- `npm test` (vitest) for changes under `react/`
- `npx tsc --noEmit -p react/tsconfig.json` for TS/TSX changes

Every behavior change needs a focused test that fails before the change.
Preserve public React props and `GraphHandle` signatures unless a breaking
release was explicitly requested.

## Releases

Every merge to `main` auto-publishes a release (`.github/workflows/release.yml`
→ `publish.yml`), which fans out rebuilds to the showcase and docs sites.
Use conventional commits (`feat:`, `fix:`, `perf:`) — the bump level is
derived from them. Never hand-edit `package.json` version or push tags.

1. **Optimize Graph.tsx `search` function:**
   - The current `search` function calls `query.toLowerCase()` and repeatedly calls `node.name.toLowerCase()` in a loop over all node values.
   - For a large number of nodes, repeatedly allocating new lowercase strings inside the loop creates significant Garbage Collection (GC) overhead.
   - We will pre-compile a case-insensitive regular expression using `query` to perform the match directly on the existing `node.name` strings, avoiding `.toLowerCase()` string allocations.
   - *Modification:* Change the `search` function implementation in `react/Graph.tsx`. We will escape regex characters to prevent ReDoS, adhering to the code quality regex escaping pattern in `.jules/bolt.md`.
2. **Add critical learning to `.jules/bolt.md`:**
   - We will append a new entry to `.jules/bolt.md` using `cat << EOF >> .jules/bolt.md` to document the learning about replacing `.toLowerCase()` string allocation in hot loops with case-insensitive regular expressions.
3. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
4. **Create a Pull Request:**
   - Use `gh pr create` (or simply run `submit`) with the required PR title and description as specified in the persona constraints.

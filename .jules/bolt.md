## 2024-05-08 - [Optimized Barnes-Hut Tree Traversal]
**Learning:** Found a performance bottleneck specific to this codebase's architecture where pushing empty nodes onto the traversal stack in the quad tree resulted in unnecessary pop operations.
**Action:** Avoid pushing nodes with `mass == 0.0` directly into the stack during recursive tree traversal to reduce loop iterations.

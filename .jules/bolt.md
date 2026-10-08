## 2024-10-08 - Native string slicing vs manual concatenation in hot canvas layout loops
**Learning:** In V8, iterating character by character and building string chunks (`for(let i=0; i<mid; i++) chunk += chars[i]`) causes enormous GC thrash in hot paths like `ellipsize` or `fitChars`. Given we have an array of characters (`chars`), using `chars.slice(0, n).join("")` leverages native C++ implementations and executes significantly faster, even though it appears to create an intermediate array. This avoids the O(n²) string creation penalty in tight character measurement loops.
**Action:** Replace manual iterative string concatenation (e.g. `chunk += chars[i]`) with `chars.slice(start, end).join("")` throughout the `fitLabelInBox` layout engine.


## 2024-10-08 - Native string slicing vs manual concatenation in hot canvas layout loops
**Learning:** In V8, iterating character by character and building string chunks (`for(let i=0; i<mid; i++) chunk += chars[i]`) causes enormous GC thrash in hot paths like `ellipsize` or `fitChars`. Given we have an array of characters (`chars`), using `chars.slice(0, n).join("")` leverages native C++ implementations and executes significantly faster, even though it appears to create an intermediate array. This avoids the O(n²) string creation penalty in tight character measurement loops.
**Action:** Replace manual iterative string concatenation (e.g. `chunk += chars[i]`) with `chars.slice(start, end).join("")` throughout the `fitLabelInBox` layout engine.

const str = "test.*+?^${}()|[]\\";
console.log(str.replace(/[\\^$.*+?()[\]{}|\\\\]/g, "\\$&"));

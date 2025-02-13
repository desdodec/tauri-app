// src/test2.js (Simplified)
import * as state from './state.js';

console.log("test2.js: testVar before:", state.testVar);
state.testVar = "modified value"; // Try to modify it (still should cause error)
console.log("test2.js: testVar after:", state.testVar);
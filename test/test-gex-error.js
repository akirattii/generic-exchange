const GexError = require("../lib/gex-error.js");
const GERR = GexError.errors;

try {
  throw new GexError(GERR.INVALID_PARAM, "hogehoge");
} catch (e) {
  console.log("e:", e);
  console.log("typeof:", typeof e);
  console.log("instanceof GexError:", e instanceof GexError);
  console.log("instanceof Error:", e instanceof Error);
  console.log(" Yes! GexError is not a `Error` object!");
}

console.log("GERR:", GERR);
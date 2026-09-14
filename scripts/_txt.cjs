const fs = require("fs"); const pdfParse = require("pdf-parse/lib/pdf-parse.js");
(async () => { for (const f of process.argv.slice(2)) { const r = await pdfParse(fs.readFileSync(".uploads/issuers/" + f)); console.log("=== " + f + "\n" + r.text.replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n")); } })();

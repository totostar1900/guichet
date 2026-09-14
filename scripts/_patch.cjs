const fs = require("fs");
const rep = (file, a, b) => { let s = fs.readFileSync(file, "utf8"); if (!s.includes(a)) throw new Error(file + " missing: " + a.slice(0, 80)); s = s.replace(a, () => b); fs.writeFileSync(file, s); };
const P = "src/lib/market/boc-parse.ts";
rep(P, `  // Volumes are glued without separators; when the line traded (PEq) the value keeps its thousand
  // spaces and the trade count is the last digit(s): "…753 975 0002" → 753 975 000 FCFA, 2 trades.
  const traded = m[4] !== "NC" ? m[3].trim().match(/(\d{1,3}(?: \d{3})+)(\d{1,2})$/) : null;
  const valueTraded = traded ? num(traded[1]) : 0;
  const close = num(m[6]);`, `  // Volumes are glued without separators. When the line traded (PEq) the value keeps its thousand
  // spaces and the trade count is the last digit: "…41821818 748 0002" → the split is chosen so that
  // value / volume falls inside the session's price band (here 18 748 000 / 218 = 86 000).
  const low = num(m[8]);
  const high = num(m[7]);
  let valueTraded = 0;
  let volumeTraded = 0;
  let trades = 0;
  if (m[4] !== "NC") {
    const v = m[3].trim();
    const tr = v.match(/(\d)$/);
    const body = tr ? v.slice(0, -1) : v;
    outer: for (const lead of [1, 2, 3]) {
      const mv = body.match(new RegExp(\`(\\d{\${lead}}(?: \\d{3})+)$\`));
      if (!mv) continue;
      const value = num(mv[1]);
      const before = body.slice(0, -mv[1].length).replace(/\s/g, "");
      for (let len = 1; len <= Math.min(6, before.length); len++) {
        const vol = Number(before.slice(-len));
        if (vol > 0 && value / vol >= low * 0.98 && value / vol <= high * 1.02) {
          valueTraded = value;
          volumeTraded = vol;
          trades = tr ? Number(tr[1]) : 1;
          break outer;
        }
      }
    }
  }`);
rep(P, `    volumeBid: 0,
    volumeAsk: 0,
    volumeTraded: valueTraded && close ? Math.round(valueTraded / close) : 0,
    valueTraded,
    trades: traded ? Number(traded[2]) : 0,`, `    volumeBid: 0,
    volumeAsk: 0,
    volumeTraded,
    valueTraded,
    trades,`);
console.log("ok");

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A small Markdown renderer for the working notes: headings, paragraphs,
 * bullet and numbered lists, pipe tables, fenced code; inline code, bold,
 * links and [[wiki links]] (shown as plain text). No HTML passthrough.
 */
export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  const push = (n: ReactNode) => out.push(<div key={key++}>{n}</div>);
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++;
      push(
        <pre>
          <code>{buf.join("\n")}</code>
        </pre>,
      );
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      const level = h[1].length;
      const content = inline(h[2]);
      push(level <= 1 ? <h2>{content}</h2> : level === 2 ? <h3>{content}</h3> : <h4>{content}</h4>);
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ""));
      const list = items.map((it, k) => <li key={k}>{inline(it)}</li>);
      push(ordered ? <ol>{list}</ol> : <ul>{list}</ul>);
      continue;
    }
    if (line.trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      push(
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>{head.map((c, k) => <th key={k}>{inline(c)}</th>)}</tr>
            </thead>
            <tbody>
              {body.map((r, k) => (
                <tr key={k}>{r.map((c, m) => <td key={m}>{inline(c)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\s*[-*]\s|\s*\d+\.\s|\s*\|)/.test(lines[i])) buf.push(lines[i++]);
    push(<p>{inline(buf.join(" "))}</p>);
  }
  return <>{out}</>;
}

/** Inline marks: `code`, **bold**, [text](url), [[wiki]] → text, bare URLs. */
function inline(s: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[\[([^\]]+)\]\])|(\[([^\]]+)\]\(([^)\s]+)\))|(https?:\/\/[^\s)]+)|(\*[^*\s][^*]*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    if (m[1]) parts.push(<code key={k++}>{m[1].slice(1, -1)}</code>);
    else if (m[2]) parts.push(<b key={k++}>{m[2].slice(2, -2)}</b>);
    else if (m[3]) parts.push(<i key={k++}>{m[4]}</i>);
    else if (m[5]) {
      const href = m[7];
      parts.push(
        href.startsWith("/") || href.startsWith("#") ? (
          <Link key={k++} href={href}>
            {m[6]}
          </Link>
        ) : (
          <a key={k++} href={href} target="_blank" rel="noreferrer">
            {m[6]}
          </a>
        ),
      );
    } else if (m[8])
      parts.push(
        <a key={k++} href={m[8]} target="_blank" rel="noreferrer">
          {m[8]}
        </a>,
      );
    else if (m[9]) parts.push(<i key={k++}>{m[9].slice(1, -1)}</i>);
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts;
}

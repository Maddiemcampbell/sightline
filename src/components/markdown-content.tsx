import type { ReactNode } from "react";

export function MarkdownContent({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index]!.trim();
    if (!line) {
      index += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(
        <h4 key={index} className="mt-4 text-sm font-semibold">
          {inline(line.slice(4))}
        </h4>,
      );
      index += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h3 key={index} className="mt-4 text-base font-semibold">
          {inline(line.slice(3))}
        </h3>,
      );
      index += 1;
      continue;
    }
    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s/.test(lines[index]!.trim())) {
        items.push(lines[index]!.trim().replace(/^[-*]\s/, ""));
        index += 1;
      }
      blocks.push(
        <ul key={`list-${index}`} className="my-3 list-disc space-y-1 pl-5">
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{inline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    if (line.includes("|") && lines[index + 1]?.trim().match(/^\|?[\s:-]+\|/)) {
      const rows: string[][] = [];
      while (index < lines.length && lines[index]!.includes("|")) {
        const row = lines[index]!.split("|")
          .map((cell) => cell.trim())
          .filter(Boolean);
        if (!row.every((cell) => /^:?-+:?$/.test(cell))) rows.push(row);
        index += 1;
      }
      const [headings, ...body] = rows;
      blocks.push(
        <div key={`table-${index}`} className="my-3 overflow-x-auto">
          <table className="border-border w-full min-w-96 border text-left text-xs">
            <thead className="bg-background">
              <tr>
                {headings?.map((heading, cellIndex) => (
                  <th key={cellIndex} className="border-border border p-2">
                    {inline(heading)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border-border border p-2">
                      {inline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    blocks.push(
      <p key={index} className="my-2 leading-6">
        {inline(line)}
      </p>,
    );
    index += 1;
  }
  return <div className="text-sm">{blocks}</div>;
}

function inline(value: string): ReactNode {
  const parts = value.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index}>{part.slice(2, -2)}</strong>
    ) : (
      part
    ),
  );
}

"use client";

import { useCallback, useState, type ReactNode } from "react";

/** Static, hand-tokenized code block with a copy button. `display` is the
 *  highlighted JSX; `code` is the plain text put on the clipboard. */
export function CodeBlock({
  code,
  display,
  label,
}: {
  code: string;
  display: ReactNode;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  }, [code]);

  return (
    <figure className="code-block">
      <figcaption className="code-head">
        <span>{label}</span>
        <button type="button" className="code-copy" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </figcaption>
      <pre tabIndex={0}>
        <code>{display}</code>
      </pre>
    </figure>
  );
}

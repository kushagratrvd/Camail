import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  if (!content) return null;

  const lines = content.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];

  let currentListType: "ul" | "ol" | null = null;
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (currentListType && listItems.length > 0) {
      if (currentListType === "ol") {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal list-inside space-y-1.5 my-2">
            {listItems}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1.5 my-2">
            {listItems}
          </ul>
        );
      }
      currentListType = null;
      listItems = [];
    }
  };

  const parseInline = (text: string): React.ReactNode[] => {
    const tokens: React.ReactNode[] = [];
    let keyIdx = 0;

    // Pattern matching **bold**, __bold__, `code`, *italic*, _italic_, [link](url)
    const regex = /(\*\*(.*?)\*\*|__(.*?)__|`([^`]+)`|\*([^*]+)\*|_([^_]+)_|\[([^\]]+)\]\(([^)]+)\))/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        tokens.push(text.substring(lastIndex, match.index));
      }

      const [, , bold1, bold2, code, italic1, italic2, linkText, linkUrl] = match;

      if (bold1 !== undefined || bold2 !== undefined) {
        tokens.push(
          <strong key={keyIdx++} className="font-bold text-zinc-900 dark:text-zinc-100">
            {bold1 ?? bold2}
          </strong>
        );
      } else if (code !== undefined) {
        tokens.push(
          <code
            key={keyIdx++}
            className="bg-zinc-200/70 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded text-xs font-mono text-zinc-800 dark:text-zinc-200 border border-zinc-300/50 dark:border-zinc-700/50"
          >
            {code}
          </code>
        );
      } else if (italic1 !== undefined || italic2 !== undefined) {
        tokens.push(
          <em key={keyIdx++} className="italic">
            {italic1 ?? italic2}
          </em>
        );
      } else if (linkText !== undefined && linkUrl !== undefined) {
        tokens.push(
          <a
            key={keyIdx++}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline font-medium"
          >
            {linkText}
          </a>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      tokens.push(text.substring(lastIndex));
    }

    return tokens.length > 0 ? tokens : [text];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // Code block toggle
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${i}`}
            className="bg-zinc-900 text-zinc-100 p-3.5 rounded-2xl overflow-x-auto text-xs font-mono my-2 border border-zinc-800"
          >
            <code>{codeBlockBuffer.join("\n")}</code>
          </pre>
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    // Headers
    if (line.startsWith("# ")) {
      flushList();
      elements.push(
        <h1 key={`h1-${i}`} className="text-xl font-bold my-2 text-zinc-900 dark:text-zinc-100">
          {parseInline(line.slice(2))}
        </h1>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h2 key={`h2-${i}`} className="text-lg font-bold my-2 text-zinc-900 dark:text-zinc-100">
          {parseInline(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={`h3-${i}`} className="text-base font-bold my-1.5 text-zinc-900 dark:text-zinc-100">
          {parseInline(line.slice(4))}
        </h3>
      );
      continue;
    }

    // Horizontal Rule
    if (line.trim() === "---" || line.trim() === "***") {
      flushList();
      elements.push(<hr key={`hr-${i}`} className="border-zinc-200 dark:border-zinc-800 my-3" />);
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      flushList();
      elements.push(
        <blockquote key={`bq-${i}`} className="border-l-2 border-zinc-300 dark:border-zinc-700 pl-3 text-zinc-500 dark:text-zinc-400 italic my-1.5">
          {parseInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Ordered list: 1. , 2. 
    const olMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (olMatch) {
      if (currentListType !== "ol") {
        flushList();
        currentListType = "ol";
      }
      listItems.push(
        <li key={`li-${i}`} className="leading-relaxed">
          {parseInline(olMatch[2]!)}
        </li>
      );
      continue;
    }

    // Unordered list: - or *
    const ulMatch = line.match(/^[-*]\s+(.*)/);
    if (ulMatch) {
      if (currentListType !== "ul") {
        flushList();
        currentListType = "ul";
      }
      listItems.push(
        <li key={`li-${i}`} className="leading-relaxed">
          {parseInline(ulMatch[1]!)}
        </li>
      );
      continue;
    }

    // Regular paragraph or empty line
    flushList();
    if (line.trim() === "") {
      elements.push(<div key={`space-${i}`} className="h-1.5" />);
    } else {
      elements.push(
        <p key={`p-${i}`} className="leading-relaxed">
          {parseInline(line)}
        </p>
      );
    }
  }

  flushList();

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}

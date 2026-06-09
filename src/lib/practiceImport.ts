import { importBlogFile, parseMarkdownToHTML } from "@/lib/blogImport";

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function splitMarkdownSections(text: string): { question: string; answer: string } {
  const normalized = text.replace(/\r\n/g, "\n");
  const problemMatch = normalized.match(
    /(?:^|\n)#{1,3}\s*problem\s*\n([\s\S]*?)(?=(?:\n#{1,3}\s*answer\b)|$)/i
  );
  const answerMatch = normalized.match(/(?:^|\n)#{1,3}\s*answer\s*\n([\s\S]*?)$/i);

  if (problemMatch && answerMatch) {
    return {
      question: parseMarkdownToHTML(problemMatch[1].trim()),
      answer: parseMarkdownToHTML(answerMatch[1].trim()),
    };
  }

  const parts = normalized.split(/\n-{3,}\n|\n---\n/);
  if (parts.length >= 2) {
    return {
      question: parseMarkdownToHTML(parts[0].trim()),
      answer: parseMarkdownToHTML(parts.slice(1).join("\n---\n").trim()),
    };
  }

  throw new Error(
    'Use "## Problem" and "## Answer" sections, or separate content with "---".'
  );
}

function splitHtmlSections(html: string): { question: string; answer: string } {
  const marker = /<(h[1-3])[^>]*>\s*(problem|answer)\s*<\/\1>/gi;
  const matches = [...html.matchAll(marker)];
  if (matches.length < 2) {
    throw new Error(
      'Use "Problem" and "Answer" headings in the document (e.g. ## Problem / ## Answer).'
    );
  }

  const slices: { label: string; start: number; end: number }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const label = String(match[2]).toLowerCase();
    const start = (match.index ?? 0) + match[0].length;
    const end =
      i + 1 < matches.length ? (matches[i + 1].index ?? html.length) : html.length;
    slices.push({ label, start, end });
  }

  const questionPart = slices.find((s) => s.label === "problem");
  const answerPart = slices.find((s) => s.label === "answer");
  if (!questionPart || !answerPart) {
    throw new Error('Document must include both "Problem" and "Answer" sections.');
  }

  return {
    question: html.slice(questionPart.start, questionPart.end).trim(),
    answer: html.slice(answerPart.start, answerPart.end).trim(),
  };
}

export async function importPracticeFile(
  file: File
): Promise<{ question: string; answer: string; previewTitle: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "md" || ext === "markdown") {
    const text = await file.text();
    const { question, answer } = splitMarkdownSections(text);
    return {
      question,
      answer,
      previewTitle: stripTags(question).slice(0, 80) || file.name,
    };
  }

  if (ext === "docx") {
    const { html } = await importBlogFile(file);
    const { question, answer } = splitHtmlSections(html);
    return {
      question,
      answer,
      previewTitle: stripTags(question).slice(0, 80) || file.name,
    };
  }

  throw new Error("Please upload a .docx or .md file.");
}

/** Import a whole file into a single problem or solution field. */
export async function importPracticeFieldFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "md" || ext === "markdown") {
    const text = await file.text();
    const trimmed = text.trim();
    if (!trimmed) throw new Error("File is empty.");
    return parseMarkdownToHTML(trimmed);
  }

  if (ext === "docx") {
    const { html } = await importBlogFile(file);
    if (!html.trim()) throw new Error("File is empty.");
    return html;
  }

  throw new Error("Please upload a .docx or .md file.");
}

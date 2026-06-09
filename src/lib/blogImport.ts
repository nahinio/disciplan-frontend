import mammoth from "mammoth/mammoth.browser";

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function titleFromFileName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

export function extractTitleFromHtml(html: string, fileName: string): string {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const t = stripTags(h1[1]);
    if (t.length >= 3) return t.slice(0, 140);
  }
  const plain = stripTags(html);
  if (plain.length >= 3) return plain.slice(0, 140);
  return titleFromFileName(fileName);
}

export function parseMarkdownToHTML(md: string): string {
  let html = md;
  html = html.replace(/```([\s\S]*?)```/gm, (_, code) => {
    return `<div class="my-5 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 font-mono text-xs text-zinc-200"><div class="flex items-center justify-between bg-zinc-900 px-4 py-2 text-zinc-400 border-b border-zinc-800"><span>Imported Code</span></div><pre class="p-4 overflow-x-auto leading-relaxed"><code>${code.trim()}</code></pre></div>`;
  });
  html = html.replace(/^### (.*$)/gim, '<h3 class="font-display font-semibold text-lg mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="font-display font-semibold text-xl mt-5 mb-2 border-b border-border pb-1">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="font-display font-bold text-2xl mt-6 mb-3">$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-rose-600 underline">$1</a>');
  html = html.replace(/^\> (.*$)/gim, '<blockquote class="my-4 pl-4 border-l-4 border-rose-500 italic bg-muted/20 py-2 rounded-r-lg">$1</blockquote>');
  html = html.replace(/^---$/gim, '<hr class="my-6 border-t-2 border-dashed border-border" />');
  html = html.split(/\n{2,}/).map((p) => {
    const trimmed = p.trim();
    if (!trimmed) return "";
    if (
      trimmed.startsWith("<h") ||
      trimmed.startsWith("<div") ||
      trimmed.startsWith("<blockquote") ||
      trimmed.startsWith("<hr") ||
      trimmed.startsWith("<table") ||
      trimmed.startsWith("<p")
    ) {
      return trimmed;
    }
    return `<p class="leading-relaxed my-3">${trimmed.replace(/\n/g, "<br/>")}</p>`;
  }).join("\n");
  return html;
}

export function extractTitleFromMarkdown(md: string, fileName: string): string {
  const h1 = md.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim().slice(0, 140);
  const h2 = md.match(/^##\s+(.+)$/m);
  if (h2) return h2[1].trim().slice(0, 140);
  const first = md.split("\n").find((l) => l.trim() && !l.startsWith("#"));
  if (first && first.trim().length >= 3) return first.trim().slice(0, 140);
  return titleFromFileName(fileName);
}

export async function importBlogFile(file: File): Promise<{ html: string; title: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "docx") {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    let html = result.value
      .replace(/<table>/g, '<table class="my-5 w-full border-collapse border border-border text-sm">')
      .replace(/<td>/g, '<td class="border border-border p-2">')
      .replace(/<th>/g, '<th class="border border-border p-2 bg-muted font-semibold">');
    return { html, title: extractTitleFromHtml(html, file.name) };
  }

  if (ext === "md" || ext === "markdown") {
    const text = await file.text();
    const html = parseMarkdownToHTML(text);
    return { html, title: extractTitleFromMarkdown(text, file.name) };
  }

  throw new Error("Please upload a .docx or .md file.");
}

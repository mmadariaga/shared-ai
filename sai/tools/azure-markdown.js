'use strict';

const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function inline(text, tokens = []) {
  const hold = html => { tokens.push(html); return `\u0000${tokens.length - 1}\u0000`; };
  text = text.replace(/`([^`\n]+)`/g, (_, code) => hold(`<code>${escape(code)}</code>`));
  if (/\\/.test(text)) throw new Error('Unsupported Markdown escapes outside code');
  if (/!\[/.test(text)) throw new Error('Unsupported Markdown images');
  text = text.replace(/\[([^\]\n]+)\]\(([^\s()]+)\)/g, (_, label, url) => {
    if (!/^(https?:\/\/|mailto:)/i.test(url)) throw new Error('Unsupported Markdown link scheme');
    return hold(`<a href="${escape(url)}">${inline(label, tokens)}</a>`);
  });
  if (/<[^>]+>|[\[\]]|~~/.test(text)) throw new Error('Unsupported Markdown: HTML, images, references, task lists, footnotes or strikethrough');
  text = escape(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\b_([^_]+)_\b/g, '<em>$1</em>');
  if (/[`*]/.test(text)) throw new Error('Unsupported or unbalanced Markdown inline syntax');
  return text.replace(/\u0000(\d+)\u0000/g, (_, n) => tokens[Number(n)]);
}
function convert(markdown) {
  if (typeof markdown !== 'string' || /\x00/.test(markdown)) throw new Error('String Markdown required');
  const lines = markdown.replace(/\r\n/g, '\n').split('\n'), output = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^<!-- backlog-id-counters: E=\d+ I=\d+ Q=\d+ -->$/.test(line)) { output.push(line); i++; continue; }
    const fence = /^```([a-zA-Z0-9_-]*)\s*$/.exec(line);
    if (fence) {
      const code = []; i++;
      while (i < lines.length && lines[i] !== '```') code.push(lines[i++]);
      if (i === lines.length) throw new Error('Unclosed Markdown code fence');
      output.push(`<pre><code${fence[1] ? ` class="language-${fence[1]}"` : ''}>${escape(code.join('\n'))}</code></pre>`); i++; continue;
    }
    const heading = /^(#{1,6}) (.+)$/.exec(line);
    if (heading) { output.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`); i++; continue; }
    if (/^> ?/.test(line)) {
      const quote = []; while (i < lines.length && /^> ?/.test(lines[i])) quote.push(lines[i++].replace(/^> ?/, ''));
      output.push(`<blockquote>${convert(quote.join('\n'))}</blockquote>`); continue;
    }
    const list = /^([-+*]|\d+\.) (.+)$/.exec(line);
    if (list) {
      const ordered = /^\d/.test(list[1]), tag = ordered ? 'ol' : 'ul', items = [];
      while (i < lines.length) {
        const item = /^([-+*]|\d+\.) (.+)$/.exec(lines[i]);
        if (!item || /^\d/.test(item[1]) !== ordered) break;
        items.push(`<li>${inline(item[2])}</li>`); i++;
      }
      output.push(`<${tag}${ordered && list[1] !== '1.' ? ` start="${parseInt(list[1], 10)}"` : ''}>${items.join('')}</${tag}>`); continue;
    }
    const unsupportedBlock = line => /^\s{2,}\S|^\|.*\||^\s*[-=]{3,}\s*$|^\s*\[[^\]]+\]:/.test(line);
    if (unsupportedBlock(line)) throw new Error('Unsupported Markdown: nested/indented blocks, tables, setext headings or definitions');
    const paragraph = [line]; i++;
    while (i < lines.length && lines[i].trim() && !/^(#|>|```|[-+*] |\d+\. |<!--)/.test(lines[i])) {
      if (unsupportedBlock(lines[i]) || /^\|/.test(lines[i])) throw new Error('Unsupported Markdown block');
      paragraph.push(lines[i++]);
    }
    output.push(`<p>${paragraph.map(line => inline(line)).join('<br>')}</p>`);
  }
  return output.join('\n');
}
module.exports = { convert };

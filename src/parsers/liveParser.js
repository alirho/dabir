
import { parseInline } from './inlineParser.js';

/**
 * Parses a single line of text for block-level markdown that can be determined
 * from one line. Used for live parsing as the user types.
 * @param {string} line The text content of the current line.
 * @returns {string|null} The resulting HTML, or null if no match.
 */
export function parseLiveBlock(line) {
    // Headings
    const headingMatch = line.match(/^(#{1,4}) (.*)/);
    if (headingMatch) {
        const level = headingMatch[1].length;
        const content = parseInline(headingMatch[2].replace(/\s$/, '')) + (line.endsWith(' ') ? ' ' : '');
        return `<h${level}>${content}</h${level}>`;
    }

    // Horizontal Rule
    if (line.trim() === '---') {
        return '<hr>';
    }

    // Image
    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
        const alt = imageMatch[1];
        const src = imageMatch[2];
        const figcaption = alt ? `<figcaption>${alt}</figcaption>` : '';
        return `<figure><img src="${src}" alt="${alt}">${figcaption}</figure>`;
    }

    // Unified List & Checklist item processing
    const listMatch = line.match(/^(\s*)([-*]|[\d۰-۹]+\.) (.*)/);
    if (listMatch) {
        const type = /[-*]/.test(listMatch[2]) ? 'ul' : 'ol';
        const listContent = listMatch[3];

        const checklistInnerMatch = listContent.match(/^\[([xX ])\]\s?/);
        if (checklistInnerMatch) {
            const isChecked = checklistInnerMatch[1].toLowerCase() === 'x';
            const contentText = listContent.substring(checklistInnerMatch[0].length);
            const content = parseInline(contentText);
            return `<ul class="checklist"><li class="checklist-item${isChecked ? ' checked' : ''}"><div class="checklist-content-wrapper"><input type="checkbox"${isChecked ? ' checked' : ''}><span>${content}</span></div></li></ul>`;
        } else {
            const content = parseInline(listContent);
            return `<${type}><li>${content}</li></${type}>`;
        }
    }
    
    // Blockquote
    if (line.startsWith('> ')) {
        const content = parseInline(line.substring(2));
        return `<blockquote><div>${content || '<br>'}</div></blockquote>`;
    }

    // Code Block start
    const codeBlockMatch = line.trim().match(/^```(\w*)$/);
    if (codeBlockMatch) {
        const copyButton = `<button class="copy-code-btn" title="رونوشت کد"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg><span>رونوشت</span></button>`;
        return `<div class="code-block-wrapper">${copyButton}<pre><code>&#8203;</code></pre></div>`;
    }

    return null;
}

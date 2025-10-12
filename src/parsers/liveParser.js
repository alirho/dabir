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
            return `<ul class="checklist"><li class="checklist-item${isChecked ? ' checked' : ''}"><input type="checkbox"${isChecked ? ' checked' : ''}>${content}</li></ul>`;
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
        return `<pre><code>&#8203;</code></pre>`;
    }

    return null;
}
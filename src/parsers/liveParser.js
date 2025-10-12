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
    
    // Checklist item
    const checklistMatch = line.match(/^(\s*)\[([xX ])\] (.*)/);
    if (checklistMatch) {
        const isChecked = checklistMatch[2].toLowerCase() === 'x';
        const content = parseInline(checklistMatch[3]);
        // Wrap in a div to avoid nested list issues on single-line parse
        return `<ul class="checklist"><li class="checklist-item${isChecked ? ' checked' : ''}"><input type="checkbox"${isChecked ? ' checked' : ''}>${content}</li></ul>`;
    }

    // List item (simple version for live parsing)
    const listMatch = line.match(/^(\s*)([-*]|[\d۰-۹]+\.) (.*)/);
    if (listMatch) {
        const type = /[-*]/.test(listMatch[2]) ? 'ul' : 'ol';
        const content = listMatch[3];
        const checklistContentMatch = content.match(/^\[([xX ])\] (.*)/);

        if (checklistContentMatch) {
            const isChecked = checklistContentMatch[1].toLowerCase() === 'x';
            const checklistContent = parseInline(checklistContentMatch[2]);
            return `<ul class="checklist"><li class="checklist-item${isChecked ? ' checked' : ''}"><input type="checkbox"${isChecked ? ' checked' : ''}>${checklistContent}</li></ul>`;
        }
        
        const listContent = parseInline(content);
        return `<${type}><li>${listContent}</li></${type}>`;
    }
    
    // Blockquote
    if (line.startsWith('> ')) {
        const content = parseInline(line.substring(2));
        return `<blockquote><div>${content || '<br>'}</div></blockquote>`;
    }

    return null;
}
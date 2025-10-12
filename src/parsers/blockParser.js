
import { parseInline } from './inlineParser.js';

/**
 * Processes a block of lines into a list.
 * @param {string[]} lines
 * @param {number} startIndex
 * @returns {{html: string, lastIndex: number}}
 */
function processListBlock(lines, startIndex) {
    let html = '';
    let i = startIndex;
    const stack = [];

    const getIndent = (line) => line.match(/^\s*/)[0].length;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();
        const match = trimmed.match(/^([-*]|[\d۰-۹]+\.) (.*)/);

        if (!match) break;

        const indent = getIndent(line);

        while (stack.length > 0 && indent < stack[stack.length - 1].indent) {
            html += `</${stack.pop().type}>`;
        }

        const type = /[-*]/.test(match[1]) ? 'ul' : 'ol';
        let content = match[2];

        const isChecklist = content.startsWith('[ ] ') || content.startsWith('[x] ');

        if (stack.length === 0 || indent > stack[stack.length - 1].indent || type !== stack[stack.length - 1].type) {
            if (stack.length > 0 && type !== stack[stack.length - 1].type) {
                html += `</${stack.pop().type}>`;
            }
            const classAttr = isChecklist ? ' class="checklist"' : '';
            html += `<${type}${classAttr}>`;
            stack.push({ type, indent });
        }
        
        if (isChecklist) {
            const isChecked = content.startsWith('[x] ');
            content = content.substring(4);
            html += `<li class="checklist-item${isChecked ? ' checked' : ''}"><input type="checkbox"${isChecked ? ' checked' : ''}>${parseInline(content)}</li>`;
        } else {
            html += `<li>${parseInline(content)}</li>`;
        }

        i++;
    }

    while (stack.length > 0) {
        html += `</${stack.pop().type}>`;
    }

    return { html, lastIndex: i - 1 };
}


/**
 * Parses block-level markdown elements from an array of lines.
 * @param {string[]} lines
 * @returns {{html: string, lastIndex: number}|null}
 */
export function parseBlock(lines, currentIndex) {
    const line = lines[currentIndex];

    // Headings
    const headingMatch = line.match(/^(#{1,4}) (.*)/);
    if (headingMatch) {
        const level = headingMatch[1].length;
        const content = parseInline(headingMatch[2]);
        return { html: `<h${level}>${content}</h${level}>`, lastIndex: currentIndex };
    }
    
    // Horizontal Rule
    if (line.trim() === '---') {
        return { html: '<hr>', lastIndex: currentIndex };
    }
    
    // Blockquote
    if (line.startsWith('> ')) {
        let quoteHtml = '<blockquote>';
        let i = currentIndex;
        while (i < lines.length && lines[i].startsWith('> ')) {
            quoteHtml += `<div>${parseInline(lines[i].substring(2)) || '<br>'}</div>`;
            i++;
        }
        quoteHtml += '</blockquote>';
        return { html: quoteHtml, lastIndex: i - 1 };
    }

    // Image
    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
        const alt = imageMatch[1];
        const src = imageMatch[2];
        const figcaption = alt ? `<figcaption>${alt}</figcaption>` : '';
        return { html: `<figure><img src="${src}" alt="${alt}">${figcaption}</figure>`, lastIndex: currentIndex };
    }

    // List
    if (/^(\s*[-*]|\s*[\d۰-۹]+\.) /.test(line)) {
        return processListBlock(lines, currentIndex);
    }

    // Code Block
    if (line.trim().startsWith('```')) {
        let codeHtml = '<pre><code>';
        let i = currentIndex + 1;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
            codeHtml += lines[i].replace(/</g, "&lt;").replace(/>/g, "&gt;") + '\n';
            i++;
        }
        codeHtml += '</code></pre>';
        return { html: codeHtml, lastIndex: i };
    }

    return null;
}

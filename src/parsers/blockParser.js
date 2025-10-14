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
    const MAX_DEPTH = 5;

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

        if (stack.length === 0 || 
            (indent > stack[stack.length - 1].indent && stack.length < MAX_DEPTH) || 
            (stack.length > 0 && type !== stack[stack.length - 1].type)) {
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
            html += `<li class="checklist-item${isChecked ? ' checked' : ''}"><input type="checkbox"${isChecked ? ' checked' : ''}><span>${parseInline(content)}</span></li>`;
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
        let codeContent = '';
        let i = currentIndex + 1;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
            codeContent += lines[i] + '\n';
            i++;
        }
        const escapedCode = codeContent.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const copyButton = `<button class="copy-code-btn" title="رونوشت کد"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg><span>رونوشت</span></button>`;
        const html = `<div class="code-block-wrapper">${copyButton}<pre><code>${escapedCode}</code></pre></div>`;
        return { html, lastIndex: i };
    }

    return null;
}
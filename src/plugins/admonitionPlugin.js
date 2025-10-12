
import Plugin from './plugin.js';

const TYPES = {
    'توجه': 'note',
    'نکته': 'tip',
    'مهم': 'important',
    'هشدار': 'warning',
    'احتیاط': 'caution'
};
const PERSIAN_TYPES = Object.keys(TYPES);

export class AdmonitionPlugin extends Plugin {
    static install(editor) {
        return {
            markdownBlockParser: this.parseMarkdownBlock.bind(this),
        };
    }

    static parseMarkdownBlock(lines, currentIndex, parser) {
        const line = lines[currentIndex].trim();
        const startRegex = new RegExp(`^\\.\\.\\.(${PERSIAN_TYPES.join('|')})$`);
        const match = line.match(startRegex);

        if (!match) return null;

        const type = match[1];
        const typeClass = TYPES[type];

        const contentLines = [];
        let i = currentIndex + 1;
        while (i < lines.length && lines[i].trim() !== '...') {
            contentLines.push(lines[i]);
            i++;
        }

        const contentHtml = parser.parse(contentLines.join('\n'));

        let html = `<div class="dabir-admonition dabir-admonition--${typeClass}" data-admonition-type="${type}">`;
        html += `<p class="dabir-admonition-title">${type}</p>`;
        html += contentHtml || '<div><br></div>';
        html += `</div>`;

        return { html, lastIndex: i };
    }
}

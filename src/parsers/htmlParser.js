/**
 * Converts editor HTML content to Markdown.
 */
export class HtmlParser {
    /**
     * @param {import('../core/editor.js').DabirEditor} editor
     */
    constructor(editor) {
        this.editor = editor;
    }

    /**
     * Parses an HTML element into a Markdown string.
     * @param {HTMLElement} element The root element to parse.
     * @returns {string}
     */
    parse(element) {
        const rawMarkdown = this._convertNodeToMarkdown(element);
        // Collapse sequences of 3 or more newlines into exactly two.
        // This standardizes block spacing and removes extra blank lines
        // caused by the recursive parsing logic.
        return rawMarkdown.replace(/\n{3,}/g, '\n\n').trim();
    }

    _convertNodeToMarkdown(node, listState = {}) {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent;
        if (node.nodeType !== Node.ELEMENT_NODE) return '';

        const recurse = (n, ls) => this._convertNodeToMarkdown(n, ls);

        let childMarkdown = Array.from(node.childNodes)
            .map(child => recurse(child, listState))
            .join('');

        switch (node.tagName) {
            case 'H1': return `# ${childMarkdown}\n\n`;
            case 'H2': return `## ${childMarkdown}\n\n`;
            case 'H3': return `### ${childMarkdown}\n\n`;
            case 'H4': return `#### ${childMarkdown}\n\n`;
            case 'STRONG': return `**${childMarkdown}**`;
            case 'EM': return `*${childMarkdown}*`;
            case 'DEL': return `~~${childMarkdown}~~`;
            case 'MARK': return `==${childMarkdown}==`;
            case 'CODE': return node.closest('pre') ? childMarkdown : `\`${childMarkdown}\``;
            case 'A': return `[${childMarkdown}](${node.getAttribute('href')})`;
            case 'BR': return '\n';
            case 'HR': return '\n---\n\n';
            case 'DIV': case 'P': return `${childMarkdown}\n\n`;
            case 'BLOCKQUOTE': {
                const lines = Array.from(node.childNodes)
                    .map(child => recurse(child, listState).trim())
                    .flatMap(line => line.split('\n'));
                return lines.map(line => `> ${line || ''}`).join('\n') + '\n\n';
            }
            case 'FIGURE':
                const img = node.querySelector('img');
                const caption = node.querySelector('figcaption');
                const alt = caption ? caption.textContent : (img ? img.alt : '');
                return `![${alt}](${img ? img.src : ''})\n\n`;
            case 'PRE':
                return `\`\`\`\n${node.textContent}\n\`\`\`\n\n`;
            default:
                // Propagate markdown from plugins
                for(const plugin of this.editor.plugins.keys()){
                    if(this.editor.plugins.get(plugin).html2md){
                        const markdown = this.editor.plugins.get(plugin).html2md(node, childMarkdown, listState, recurse);
                        if(markdown) return markdown;
                    }
                }
                return childMarkdown;
        }
    }
}
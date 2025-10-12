
import { parseBlock } from './blockParser.js';
import { parseInline } from './inlineParser.js';

/**
 * Converts a Markdown string to an HTML string.
 */
export class MarkdownParser {
    /**
     * @param {import('../core/editor.js').DabirEditor} editor
     */
    constructor(editor) {
        this.editor = editor;
    }
    /**
     * Parses a markdown string into HTML.
     * @param {string} markdown
     * @returns {string}
     */
    parse(markdown) {
        const lines = markdown.split('\n');
        let html = '';
        let paragraphLines = [];

        const flushParagraph = () => {
            if (paragraphLines.length > 0) {
                html += `<div>${parseInline(paragraphLines.join('\n'))}</div>`;
                paragraphLines = [];
            }
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            let blockParsed = false;
            // Allow plugins to parse blocks first
            for (const pluginName of this.editor.plugins.keys()) {
                const plugin = this.editor.plugins.get(pluginName);
                if (plugin && plugin.markdownBlockParser) {
                    const result = plugin.markdownBlockParser(lines, i, this);
                    if (result) {
                        flushParagraph();
                        html += result.html;
                        i = result.lastIndex;
                        blockParsed = true;
                        break;
                    }
                }
            }
            if (blockParsed) continue;


            const blockResult = parseBlock(lines, i);
            if (blockResult) {
                flushParagraph();
                html += blockResult.html;
                i = blockResult.lastIndex;
            } else if (line.trim() === '') {
                flushParagraph();
                html += '<div><br></div>';
            } else {
                paragraphLines.push(line);
            }
        }

        flushParagraph();
        return html;
    }
}

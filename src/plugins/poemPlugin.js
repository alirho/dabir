import Plugin from './plugin.js';
import { parseInline } from '../parsers/inlineParser.js';

export class PoemPlugin extends Plugin {
    static install(editor) {
        return {
            markdownBlockParser: this.parseMarkdownBlock.bind(this),
            html2md: this.html2md.bind(this)
        };
    }

    static parseMarkdownBlock(lines, currentIndex, parser) {
        const line = lines[currentIndex].trim();
        if (line !== '...شعر') return null;

        const contentLines = [];
        let i = currentIndex + 1;
        while (i < lines.length && lines[i].trim() !== '...') {
            contentLines.push(lines[i]);
            i++;
        }

        // Filter out empty lines to correctly pair couplets
        const nonEmptyLines = contentLines.filter(line => line.trim() !== '');

        let contentHtml = '';
        for (let j = 0; j < nonEmptyLines.length; j += 2) {
            const misra1 = parseInline(nonEmptyLines[j]?.trim() || '');
            const misra2 = parseInline(nonEmptyLines[j + 1]?.trim() || '');
            
            // Only create a couplet if the first part exists.
            if (misra1) {
                contentHtml += `<p class="couplet"><span>${misra1}</span><span>${misra2}</span></p>`;
            }
        }

        const html = `<div class="poem-block">${contentHtml || '<div><br></div>'}</div>`;
        return { html, lastIndex: i };
    }
    
    static html2md(node, childMarkdown, listState, recurse) {
        if (node.tagName !== 'DIV' || !node.classList.contains('poem-block')) {
            return null;
        }

        const couplets = Array.from(node.querySelectorAll('.couplet'));
        const markdownLines = [];
        
        couplets.forEach((couplet, index) => {
            const spans = couplet.querySelectorAll('span');
            const misra1 = spans[0] ? recurse(spans[0], listState).trim() : '';
            const misra2 = spans[1] ? recurse(spans[1], listState).trim() : '';
            
            if(misra1) markdownLines.push(misra1);
            if(misra2) markdownLines.push(misra2);
            
            // Add a blank line between couplets, but not after the last one
            if ((misra1 || misra2) && index < couplets.length - 1) {
                markdownLines.push('');
            }
        });

        const markdownContent = markdownLines.join('\n');
        return `...شعر\n${markdownContent}\n...\n\n`;
    }
}

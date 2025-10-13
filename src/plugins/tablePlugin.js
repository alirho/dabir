import Plugin from './plugin.js';
import { moveCursorToEnd } from '../utils/dom.js';
import { parseInline } from '../parsers/inlineParser.js';

export class TablePlugin extends Plugin {
    /**
     * @param {import('../core/editor.js').DabirEditor} editor
     */
    static install(editor) {
        editor.keyboardHandler.register('Enter', [], (e) => this.handleEnter(e, editor));
        return {
            markdownBlockParser: this.parseMarkdownBlock.bind(this)
        };
    }
    
    static handleEnter(event, editor) {
        const cell = editor.selection.parentElement.closest('td, th');
        if (!cell) return false;

        const row = cell.parentElement;
        const table = row.closest('table');
        if (!table) return false;
        
        const body = table.querySelector('tbody');
        if (!body) return false;

        const newRow = body.insertRow();
        for (let i = 0; i < row.cells.length; i++) {
            const newCell = newRow.insertCell();
            newCell.appendChild(document.createElement('br'));
        }

        moveCursorToEnd(newRow.cells[0]);
        editor.saveContent();
        return true;
    }

    static parseMarkdownBlock(lines, currentIndex) {
        const headerLine = lines[currentIndex];
        const separatorLine = lines[currentIndex + 1];

        if (!headerLine?.includes('|') || !separatorLine?.match(/^\|(?:\s*:?-+:?\s*\|)+$/)) {
            return null;
        }

        const headers = headerLine.split('|').slice(1, -1).map(h => h.trim());
        let html = '<table><thead><tr>';
        headers.forEach(h => { html += `<th>${parseInline(h)}</th>`; });
        html += '</tr></thead><tbody>';
        
        let i = currentIndex + 2;
        while (i < lines.length && lines[i].includes('|')) {
            const cells = lines[i].split('|').slice(1, -1).map(c => c.trim());
            html += '<tr>';
            for (let j = 0; j < headers.length; j++) {
                html += `<td>${parseInline(cells[j] || '')}</td>`;
            }
            html += '</tr>';
            i++;
        }
        
        html += '</tbody></table>';
        return { html, lastIndex: i - 1 };
    }
}

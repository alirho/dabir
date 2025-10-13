import Plugin from './plugin.js';
import { moveCursorToEnd } from '../utils/dom.js';
import { parseInline } from '../parsers/inlineParser.js';

export class TablePlugin extends Plugin {
    /**
     * @param {import('../core/editor.js').DabirEditor} editor
     */
    static install(editor) {
        editor.keyboardHandler.register('Enter', [], (e) => this.handleEnter(e, editor));
        editor.keyboardHandler.register('ArrowUp', [], (e) => this.handleArrowKeys(e, editor));
        editor.keyboardHandler.register('ArrowDown', [], (e) => this.handleArrowKeys(e, editor));
        editor.keyboardHandler.register('ArrowLeft', [], (e) => this.handleArrowKeys(e, editor));
        editor.keyboardHandler.register('ArrowRight', [], (e) => this.handleArrowKeys(e, editor));
        editor.keyboardHandler.register('Tab', [], (e) => this.handleTab(e, editor));
        editor.keyboardHandler.register('Tab', ['shift'], (e) => this.handleShiftTab(e, editor));
        editor.keyboardHandler.register('Backspace', [], (e) => this.handleBackspace(e, editor));

        return {
            markdownBlockParser: this.parseMarkdownBlock.bind(this)
        };
    }

    static handleArrowKeys(event, editor) {
        const cell = editor.selection.parentElement.closest('td, th');
        if (!cell) return false;
    
        const sel = window.getSelection();
        if (!sel.rangeCount || !sel.isCollapsed) return false;
        const range = sel.getRangeAt(0);
    
        const table = cell.closest('table');
        const allRows = Array.from(table.querySelectorAll('thead tr, tbody tr'));
        const row = cell.parentElement;
        const rowIndex = allRows.findIndex(r => r === row);
        const cellIndex = cell.cellIndex;
    
        // Check if the cursor is at the very beginning or end of the cell's text content.
        const atStart = () => {
            const tempRange = document.createRange();
            tempRange.selectNodeContents(cell);
            tempRange.setEnd(range.startContainer, range.startOffset);
            return tempRange.toString().trim() === '';
        };
    
        const atEnd = () => {
            const tempRange = document.createRange();
            tempRange.selectNodeContents(cell);
            tempRange.setStart(range.endContainer, range.endOffset);
            return tempRange.toString().trim() === '';
        };
    
        let targetCell = null;
    
        switch (event.key) {
            case 'ArrowLeft':
                if (atStart()) {
                    targetCell = cell.previousElementSibling;
                    if (!targetCell && rowIndex > 0) {
                        const prevRow = allRows[rowIndex - 1];
                        targetCell = prevRow.cells[prevRow.cells.length - 1];
                    }
                }
                break;
            case 'ArrowRight':
                if (atEnd()) {
                    targetCell = cell.nextElementSibling;
                    if (!targetCell && rowIndex < allRows.length - 1) {
                        const nextRow = allRows[rowIndex + 1];
                        targetCell = nextRow.cells[0];
                    }
                }
                break;
            case 'ArrowUp':
                if (rowIndex > 0) {
                    const prevRow = allRows[rowIndex - 1];
                    targetCell = prevRow.cells[cellIndex];
                }
                break;
            case 'ArrowDown':
                if (rowIndex < allRows.length - 1) {
                    const nextRow = allRows[rowIndex + 1];
                    targetCell = nextRow.cells[cellIndex];
                }
                break;
        }
    
        if (targetCell) {
            moveCursorToEnd(targetCell);
            return true;
        }
    
        return false;
    }

    static _navigateTab(editor, isShift = false) {
        const cell = editor.selection.parentElement.closest('td, th');
        if (!cell) return false;

        const allCells = Array.from(cell.closest('table').querySelectorAll('th, td'));
        const currentIndex = allCells.indexOf(cell);
        const targetIndex = isShift ? currentIndex - 1 : currentIndex + 1;

        if (targetIndex >= 0 && targetIndex < allCells.length) {
            moveCursorToEnd(allCells[targetIndex]);
        }
        return true;
    }

    static handleTab(event, editor) {
        return this._navigateTab(editor, false);
    }

    static handleShiftTab(event, editor) {
        return this._navigateTab(editor, true);
    }
    
    static handleBackspace(event, editor) {
        const cell = editor.selection.parentElement.closest('td, th');
        if (!cell) return false;
        
        const range = editor.selection.range;
        if (!range || !range.collapsed || range.startOffset !== 0 || cell.textContent.trim() !== '') {
            return false;
        }

        const row = cell.parentElement;
        const table = row.closest('table');

        const allCells = Array.from(table.querySelectorAll('td, th'));
        if (allCells.every(c => c.textContent.trim() === '')) {
            const newBlock = document.createElement('div');
            newBlock.innerHTML = '<br>';
            table.replaceWith(newBlock);
            moveCursorToEnd(newBlock);
            editor.saveContent();
            return true;
        }

        if (cell.cellIndex === 0 && row.parentElement.tagName === 'TBODY' && row.parentElement.children.length > 1) {
             const prevRow = row.previousElementSibling;
             row.remove();

             const focusCell = prevRow ? prevRow.cells[prevRow.cells.length - 1] : table.querySelector('thead tr').cells[0];
             moveCursorToEnd(focusCell);

             editor.saveContent();
             return true;
        }

        return false;
    }

    static handleEnter(event, editor) {
        const cell = editor.selection.parentElement.closest('td, th');
        if (!cell) return false;
    
        const row = cell.parentElement;
        const table = row.closest('table');
        if (!table) return false;
        
        const body = table.querySelector('tbody');
        if (!body || !body.contains(row)) return false;
    
        const isLastRow = row === body.lastElementChild;
        const isRowEmpty = Array.from(row.cells).every(c => c.textContent.trim() === '');
    
        if (isLastRow && isRowEmpty) {
            const newBlock = document.createElement('div');
            newBlock.innerHTML = '<br>';
            table.after(newBlock);
            
            if (body.rows.length === 1) {
                table.remove();
            } else {
                row.remove();
            }
            
            moveCursorToEnd(newBlock);
            editor.saveContent();
            return true;
        }
    
        const rowIndexInBody = Array.from(body.rows).indexOf(row);
        const newRow = body.insertRow(rowIndexInBody + 1);
        for (let i = 0; i < row.cells.length; i++) {
            const newCell = newRow.insertCell();
            const align = row.cells[i].style.textAlign;
            if (align) {
                newCell.style.textAlign = align;
            }
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
        
        const alignTokens = separatorLine.split('|').slice(1, -1).map(s => s.trim());
        const alignments = alignTokens.map(token => {
            const startsWithColon = token.startsWith(':');
            const endsWithColon = token.endsWith(':');
            if (startsWithColon && endsWithColon) return 'center';
            if (startsWithColon) return 'left';
            if (endsWithColon) return 'right';
            return 'right'; // Default for RTL
        });
    
        let html = '<table><thead><tr>';
        headers.forEach((h, i) => {
            html += `<th style="text-align: ${alignments[i] || 'right'};">${parseInline(h)}</th>`;
        });
        html += '</tr></thead><tbody>';
        
        let i = currentIndex + 2;
        const dataRowsStartIndex = i;
    
        while (i < lines.length && lines[i].includes('|')) {
            const cells = lines[i].split('|').slice(1, -1).map(c => c.trim());
            html += '<tr>';
            for (let j = 0; j < headers.length; j++) {
                const alignStyle = `style="text-align: ${alignments[j] || 'right'};"`;
                html += `<td ${alignStyle}>${parseInline(cells[j] || '')}</td>`;
            }
            html += '</tr>';
            i++;
        }
        
        if (i === dataRowsStartIndex) {
            html += '<tr>';
            for (let j = 0; j < headers.length; j++) {
                const alignStyle = `style="text-align: ${alignments[j] || 'right'};"`;
                html += `<td ${alignStyle}><br></td>`;
            }
            html += '</tr>';
        }
        
        html += '</tbody></table>';
        return { html, lastIndex: i - 1 };
    }
}
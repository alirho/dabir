
import Plugin from './plugin.js';
import { moveCursorToEnd } from '../utils/dom.js';

export class ListPlugin extends Plugin {
    /**
     * @param {import('../core/editor.js').DabirEditor} editor
     */
    static install(editor) {
        editor.keyboardHandler.register('Tab', [], (e) => this.handleTab(e, editor));
        editor.keyboardHandler.register('Tab', ['Shift'], (e) => this.handleShiftTab(e, editor));
        return {
            name: 'ListPlugin',
            html2md: this.html2md.bind(this)
        };
    }

    static handleTab(event, editor) {
        const listItem = editor.selection.parentElement.closest('li');
        if (!listItem) return false;

        let depth = 0;
        let parent = listItem.parentElement;
        while (parent && parent !== editor.element) {
            if (parent.tagName === 'UL' || parent.tagName === 'OL') {
                depth++;
            }
            parent = parent.parentElement;
        }

        if (depth >= 5) {
            return false;
        }

        const prevLi = listItem.previousElementSibling;
        if (prevLi) {
            let sublist = prevLi.querySelector('ul, ol');
            if (!sublist) {
                sublist = document.createElement(listItem.parentElement.tagName);
                if (listItem.classList.contains('checklist-item')) {
                    sublist.classList.add('checklist');
                }
                prevLi.appendChild(sublist);
            }
            sublist.appendChild(listItem);

            const focusableElement = listItem.querySelector('span') || listItem;
            moveCursorToEnd(focusableElement);

            editor.saveContent();
            return true;
        }
        return false;
    }

    static handleShiftTab(event, editor) {
        const listItem = editor.selection.parentElement.closest('li');
        if (!listItem) return false;

        const parentList = listItem.parentElement;
        const parentLi = parentList?.parentElement?.closest('li');
        if (parentLi) {
            parentLi.after(listItem);
            if (parentList.children.length === 0) {
                parentList.remove();
            }
            
            const focusableElement = listItem.querySelector('span') || listItem;
            moveCursorToEnd(focusableElement);

            editor.saveContent();
            return true;
        }
        return false;
    }

    static html2md(node, childMarkdown, listState, recurse) {
        if (node.tagName !== 'UL' && node.tagName !== 'OL') return null;

        const isTopLevelCall = listState.indent === undefined;
        if (isTopLevelCall) {
            listState.indent = 0;
        } else {
            listState.indent++;
        }

        let markdown = '';
        const listItems = Array.from(node.children).filter(child => child.tagName === 'LI');

        listItems.forEach((li, index) => {
            const indentStr = '  '.repeat(listState.indent);
            const isChecklist = li.classList.contains('checklist-item');
            
            let prefix = (node.tagName === 'OL') ? `${index + 1}. ` : '- ';
            if (isChecklist) {
                const checkbox = li.querySelector('input[type="checkbox"]');
                prefix += (checkbox && checkbox.checked) ? '[x] ' : '[ ] ';
            }

            let contentNodes = [];
            let sublistNode = null;
            for (const child of li.childNodes) {
                if (child.tagName === 'UL' || child.tagName === 'OL') {
                    sublistNode = child;
                } else {
                    if (isChecklist) {
                        if (child.classList && child.classList.contains('checklist-content-wrapper')) {
                            const span = child.querySelector('span');
                            if (span) {
                                contentNodes.push(...span.childNodes);
                            }
                        }
                    } else {
                        contentNodes.push(child);
                    }
                }
            }
            
            const liContent = contentNodes.map(node => recurse(node, listState)).join('');
            markdown += `${indentStr}${prefix}${liContent.trim()}`;
            
            if (sublistNode) {
                markdown += '\n' + recurse(sublistNode, listState);
            }
            markdown += '\n';
        });

        if (isTopLevelCall) {
            delete listState.indent;
        } else {
            listState.indent--;
        }
        
        if (isTopLevelCall) {
            return markdown;
        }

        return markdown.trimEnd();
    }
}

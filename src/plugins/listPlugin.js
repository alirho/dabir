import Plugin from './plugin.js';
import { moveCursorToEnd } from '../utils/dom.js';

export class ListPlugin extends Plugin {
    /**
     * @param {import('../core/editor.js').DabirEditor} editor
     */
    static install(editor) {
        editor.keyboardHandler.register('Tab', [], (e) => this.handleTab(e, editor));
        editor.keyboardHandler.register('Tab', ['Shift'], (e) => this.handleShiftTab(e, editor));
        return { name: 'ListPlugin', handleShiftTab: this.handleShiftTab };
    }

    static handleTab(event, editor) {
        const listItem = editor.selection.parentElement.closest('li');
        if (!listItem) return false;

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
}

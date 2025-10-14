import Plugin from './plugin.js';
import { moveCursorToEnd } from '../utils/dom.js';

export class ShortcutPlugin extends Plugin {
    static install(editor) {
        // --- INLINE FORMATTING ---
        const applyInlineFormat = (prefix, suffix = prefix) => {
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount) return true;

            const range = sel.getRangeAt(0);
            const selectedText = range.toString();
            
            range.deleteContents();

            if (selectedText) {
                const textNode = document.createTextNode(`${prefix}${selectedText}${suffix}`);
                range.insertNode(textNode);
                
                range.selectNode(textNode);
                sel.removeAllRanges();
                sel.addRange(range);
            } else {
                const textNode = document.createTextNode(`${prefix}${suffix}`);
                range.insertNode(textNode);
                
                range.setStart(textNode, prefix.length);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }

            editor.saveContent();
            editor.events.emit('input');
            return true;
        };

        const createLink = () => {
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount) return true;

            const range = sel.getRangeAt(0);
            const selectedText = range.toString();
            const placeholderUrl = 'url';
            
            range.deleteContents();
            const fullText = `[${selectedText}](${placeholderUrl})`;
            const textNode = document.createTextNode(fullText);
            range.insertNode(textNode);

            const urlStartOffset = `[${selectedText}](`.length;
            const urlEndOffset = urlStartOffset + placeholderUrl.length;
            
            const newRange = document.createRange();
            newRange.setStart(textNode, urlStartOffset);
            newRange.setEnd(textNode, urlEndOffset);
            
            sel.removeAllRanges();
            sel.addRange(newRange);
            
            editor.saveContent();
            editor.events.emit('input');
            return true;
        };
        
        const inlineShortcuts = {
            'b': () => applyInlineFormat('**'), 'ذ': () => applyInlineFormat('**'),
            'i': () => applyInlineFormat('*'), 'ه': () => applyInlineFormat('*'),
            'u': () => applyInlineFormat('~~'), 'ع': () => applyInlineFormat('~~'),
            'k': createLink, 'ن': createLink,
            '`': () => applyInlineFormat('`'), 'پ': () => applyInlineFormat('`'),
        };

        for (const key in inlineShortcuts) {
            editor.keyboardHandler.register(key, ['ctrl'], () => {
                return inlineShortcuts[key]();
            });
        }

        // --- BLOCK FORMATTING ---
        const getSelectedBlocks = () => {
            const sel = window.getSelection();
            if (!sel?.rangeCount) return [];

            const getBlock = (node) => {
                if (!node || !editor.element.contains(node)) return null;
                let current = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
                while (current && current.parentElement !== editor.element) {
                    current = current.parentElement;
                }
                return current && current.parentElement === editor.element ? current : null;
            };

            const range = sel.getRangeAt(0);
            const startBlock = getBlock(range.startContainer);
            if (!startBlock) return [];
            if (range.collapsed) return [startBlock];

            const endBlock = getBlock(range.endContainer);
            const blocks = [startBlock];
            let current = startBlock;
            while (current && current !== endBlock) {
                current = current.nextElementSibling;
                if (current) blocks.push(current);
            }
            return blocks;
        };

        const toggleBlockFormat = (format) => {
            const headingMatch = format.match(/^h([1-4])$/);
            
            if (headingMatch) {
                const block = getSelectedBlocks()[0];
                if (!block) return true;

                if (block.tagName.toLowerCase() === format) {
                    document.execCommand('formatBlock', false, 'div');
                } else {
                    document.execCommand('formatBlock', false, format);
                }
            } else if (['ol', 'ul', 'checklist'].includes(format)) {
                document.execCommand(format === 'ol' ? 'insertOrderedList' : 'insertUnorderedList');
                
                if (format === 'checklist') {
                    // execCommand is async; we need to wait for the DOM to update.
                    setTimeout(() => {
                        const sel = window.getSelection();
                        if (!sel.rangeCount) return;
                        const list = sel.getRangeAt(0).startContainer.closest('ul, ol');

                        if (!list) return;

                        list.classList.add('checklist');
                        list.querySelectorAll('li').forEach(li => {
                            if (li.classList.contains('checklist-item')) return;
                            
                            li.classList.add('checklist-item');
                            const content = li.innerHTML;
                            li.innerHTML = '';
                            
                            const checkbox = document.createElement('input');
                            checkbox.type = 'checkbox';
                            const span = document.createElement('span');
                            span.innerHTML = content || '&#8203;'; // Zero-width space for cursor
                            
                            li.appendChild(checkbox);
                            li.appendChild(span);
                        });

                        const firstSpan = list.querySelector('li span');
                        if (firstSpan) moveCursorToEnd(firstSpan);
                        editor.saveContent();
                    }, 0);
                }
            }
            
            if (format !== 'checklist') {
                editor.saveContent();
            }
            return true;
        };

        // Register Heading Shortcuts (Ctrl + 1-4)
        ['1', '۱'].forEach(k => editor.keyboardHandler.register(k, ['ctrl'], () => toggleBlockFormat('h1')));
        ['2', '۲'].forEach(k => editor.keyboardHandler.register(k, ['ctrl'], () => toggleBlockFormat('h2')));
        ['3', '۳'].forEach(k => editor.keyboardHandler.register(k, ['ctrl'], () => toggleBlockFormat('h3')));
        ['4', '۴'].forEach(k => editor.keyboardHandler.register(k, ['ctrl'], () => toggleBlockFormat('h4')));

        // Register List Shortcuts (Ctrl + Alt + Key)
        ['l', 'م'].forEach(k => editor.keyboardHandler.register(k, ['ctrl', 'alt'], () => toggleBlockFormat('ol')));
        ['u', 'ع'].forEach(k => editor.keyboardHandler.register(k, ['ctrl', 'alt'], () => toggleBlockFormat('ul')));
        ['t', 'ف'].forEach(k => editor.keyboardHandler.register(k, ['ctrl', 'alt'], () => toggleBlockFormat('checklist')));
    }
}
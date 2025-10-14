
import Plugin from './plugin.js';
import { moveCursorToEnd } from '../utils/dom.js';

export class ShortcutPlugin extends Plugin {
    static install(editor) {
        // --- HELPER: INLINE FORMATTING ---
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
            const selectedText = range.toString() || 'متن پیوند';
            const placeholderUrl = 'نشانی وب';
            
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
        
        const insertImagePlaceholder = () => {
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount) return true;

            const range = sel.getRangeAt(0);
            const selectedText = range.toString() || 'متن جایگزین';
            
            range.deleteContents();
            const fullText = `![${selectedText}]()`;
            const textNode = document.createTextNode(fullText);
            range.insertNode(textNode);

            const newRange = document.createRange();
            newRange.setStart(textNode, `![`.length);
            newRange.setEnd(textNode, `![${selectedText}`.length);
            
            sel.removeAllRanges();
            sel.addRange(newRange);
            
            editor.saveContent();
            editor.events.emit('input');
            return true;
        };

        // --- HELPER: BLOCK FORMATTING ---
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
                            span.innerHTML = content || '&#8203;';
                            
                            const wrapper = document.createElement('div');
                            wrapper.className = 'checklist-content-wrapper';
                            wrapper.appendChild(checkbox);
                            wrapper.appendChild(span);
                            li.appendChild(wrapper);
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
        
        const applyQuote = () => {
            const block = getSelectedBlocks()[0];
            if (!block) return true;

            const range = document.createRange();
            range.selectNodeContents(block);
            range.collapse(true);
            
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            
            document.execCommand('insertText', false, '> ');

            editor.saveContent();
            editor.events.emit('input');
            return true;
        };
        
        const insertCodeBlock = () => {
             const block = getSelectedBlocks()[0];
             if (!block) return true;

             const copyButtonHtml = `<button class="copy-code-btn" title="رونوشت کد"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg><span>رونوشت</span></button>`;
             const codeBlockHtml = `<div class="code-block-wrapper">${copyButtonHtml}<pre><code>&#8203;</code></pre></div>`;
             
             const newElement = editor.renderer.createFromHTML(codeBlockHtml);
             editor.renderer.replace(block, newElement);
             
             const codeElement = newElement.querySelector('code');
             if (codeElement) moveCursorToEnd(codeElement);
             
             editor.saveContent();
             return true;
        };
        
        const insertTable = () => {
            const block = getSelectedBlocks()[0];
            if (!block) return true;
            
            const tableHtml = `<table><thead><tr><th style="text-align: right;">عنوان ۱</th><th style="text-align: right;">عنوان ۲</th></tr></thead><tbody><tr><td style="text-align: right;"><br></td><td style="text-align: right;"><br></td></tr></tbody></table>`;
            const newElement = editor.renderer.createFromHTML(tableHtml);
            
            if (block.textContent.trim() === '') {
                editor.renderer.replace(block, newElement);
            } else {
                block.after(newElement);
            }
            
            const firstCell = newElement.querySelector('td');
            if (firstCell) moveCursorToEnd(firstCell);
            
            editor.saveContent();
            return true;
        };

        // --- REGISTER SHORTCUTS ---
        
        // INLINE: Ctrl + Key
        ['b', 'ذ'].forEach(k => editor.keyboardHandler.register(k, ['ctrl'], () => applyInlineFormat('**')));
        ['i', 'ه'].forEach(k => editor.keyboardHandler.register(k, ['ctrl'], () => applyInlineFormat('*')));
        ['u', 'ع'].forEach(k => editor.keyboardHandler.register(k, ['ctrl'], () => applyInlineFormat('~~')));
        ['k', 'ن'].forEach(k => editor.keyboardHandler.register(k, ['ctrl'], createLink));
        ['`', 'پ'].forEach(k => editor.keyboardHandler.register(k, ['ctrl'], () => applyInlineFormat('`')));
        
        // INLINE: Ctrl + Alt + Key
        ['h', 'ا'].forEach(k => editor.keyboardHandler.register(k, ['ctrl', 'alt'], () => applyInlineFormat('==')));
        ['i', 'ه'].forEach(k => editor.keyboardHandler.register(k, ['ctrl', 'alt'], insertImagePlaceholder));

        // BLOCK: Ctrl + Number
        ['1', '۱'].forEach(k => editor.keyboardHandler.register(k, ['ctrl'], () => toggleBlockFormat('h1')));
        ['2', '۲'].forEach(k => editor.keyboardHandler.register(k, ['ctrl'], () => toggleBlockFormat('h2')));
        ['3', '۳'].forEach(k => editor.keyboardHandler.register(k, ['ctrl'], () => toggleBlockFormat('h3')));
        ['4', '۴'].forEach(k => editor.keyboardHandler.register(k, ['ctrl'], () => toggleBlockFormat('h4')));
        
        // BLOCK: Ctrl + Alt + Key
        ['l', 'م'].forEach(k => editor.keyboardHandler.register(k, ['ctrl', 'alt'], () => toggleBlockFormat('ol')));
        ['u', 'ع'].forEach(k => editor.keyboardHandler.register(k, ['ctrl', 'alt'], () => toggleBlockFormat('ul')));
        ['b', 'ذ'].forEach(k => editor.keyboardHandler.register(k, ['ctrl', 'alt'], () => toggleBlockFormat('checklist')));
        ['q', 'ض'].forEach(k => editor.keyboardHandler.register(k, ['ctrl', 'alt'], applyQuote));
        ['c', 'ز'].forEach(k => editor.keyboardHandler.register(k, ['ctrl', 'alt'], insertCodeBlock));
        ['t', 'ف'].forEach(k => editor.keyboardHandler.register(k, ['ctrl', 'alt'], insertTable));
    }
}

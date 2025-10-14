import { moveCursorToEnd } from '../utils/dom.js';
import { parseLiveBlock } from '../parsers/liveParser.js';
import { parseInline } from '../parsers/inlineParser.js';

const COPY_BUTTON_HTML = `<button class="copy-code-btn" title="رونوشت کد"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg><span>رونوشت</span></button>`;

/**
 * مدیریت‌کننده رویدادهای کیبورد و میانبرها.
 * @class KeyboardHandler
 */
export class KeyboardHandler {
    /**
     * @param {import('../core/editor.js').DabirEditor} editor - نمونه ویرایشگر.
     */
    constructor(editor) {
        this.editor = editor;
        this.shortcuts = new Map();
        this.element = editor.element;
        this.element.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.element.addEventListener('keyup', this.handleKeyUp.bind(this));
    }

    /**
     * یک میانبر کیبورد ثبت می‌کند.
     * @param {string} key - کلید اصلی (مانند 'Enter', 'Tab', 'b').
     * @param {string[]} [modifiers=[]] - آرایه‌ای از کلیدهای اصلاح‌کننده (مانند ['Shift', 'Ctrl']).
     * @param {Function} handler - تابعی که در زمان فشردن میانبر اجرا می‌شود.
     */
    register(key, modifiers = [], handler) {
        const keyString = `${modifiers.sort().join('+')}+${key}`.toLowerCase();
        if (!this.shortcuts.has(keyString)) {
            this.shortcuts.set(keyString, []);
        }
        this.shortcuts.get(keyString).push(handler);
    }

    /**
     * رویداد keydown را مدیریت می‌کند.
     * @param {KeyboardEvent} event - آبجکت رویداد.
     * @private
     */
    handleKeyDown(event) {
        const modifiers = [];
        if (event.ctrlKey) modifiers.push('ctrl');
        if (event.metaKey) modifiers.push('meta');
        if (event.altKey) modifiers.push('alt');
        if (event.shiftKey) modifiers.push('shift');

        const keyString = `${modifiers.sort().join('+')}+${event.key}`.toLowerCase();

        if (this.shortcuts.has(keyString)) {
            for (const handler of this.shortcuts.get(keyString)) {
                if (handler(event, this.editor) === true) {
                    event.preventDefault();
                    break;
                }
            }
            // After executing custom shortcuts, check for native-like behavior
            if (event.defaultPrevented) return;
        }

        if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
            if (this.handleEnter(event)) {
                event.preventDefault();
                return;
            }
        }

        if (event.key === 'Backspace' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
            if (this.handleBackspace(event)) {
                event.preventDefault();
                return;
            }
        }
    }

    /**
     * رویداد Backspace را برای موارد خاص مانند بازبینه‌ها مدیریت می‌کند.
     * @param {KeyboardEvent} event 
     * @returns {boolean}
     * @private
     */
    handleBackspace(event) {
        const { selection } = this.editor;
        const range = selection.range;

        if (range && range.collapsed && range.startOffset === 0) {
            const parentElement = selection.parentElement;
            const listItem = parentElement.closest('li.checklist-item');
            
            if (listItem) {
                const contentContainer = listItem.querySelector('.checklist-content-wrapper > span');
                if (contentContainer && contentContainer.contains(range.startContainer)) {
                    const preCursorRange = document.createRange();
                    preCursorRange.selectNodeContents(contentContainer);
                    preCursorRange.setEnd(range.startContainer, range.startOffset);
                    if (preCursorRange.toString().trim() === '') {
                        // At the start of the item, convert to normal list item.
                        const list = listItem.parentElement;
                        const wrapper = listItem.querySelector('.checklist-content-wrapper');
                        if (wrapper) {
                            const contentNodes = contentContainer ? Array.from(contentContainer.childNodes) : [];
                            wrapper.replaceWith(...contentNodes);
                        }

                        if (listItem.textContent.trim() === '') {
                            listItem.innerHTML = '<br>';
                        }

                        listItem.classList.remove('checklist-item', 'checked');

                        if (list && !list.querySelector('li.checklist-item')) {
                            list.classList.remove('checklist');
                        }
                        
                        const newRange = document.createRange();
                        newRange.selectNodeContents(listItem);
                        newRange.collapse(true);
                        selection.setRange(newRange);

                        this.editor.saveContent();
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * منطق فشردن کلید Enter را برای خروج از بلوک‌ها مدیریت می‌کند.
     * @param {KeyboardEvent} event 
     * @returns {boolean}
     * @private
     */
    handleEnter(event) {
        const { selection } = this.editor;
        const parentElement = selection.parentElement;
        if (!parentElement) return false;

        const codeBlockWrapper = parentElement.closest('.code-block-wrapper');
        if (codeBlockWrapper) {
            const range = selection.range;
            if (!range || !range.collapsed) return false;
        
            const codeElement = codeBlockWrapper.querySelector('code');
            if (!codeElement) return false;
        
            // Normalize the code content by replacing <br> and other elements with newlines
            // to reliably detect empty lines regardless of DOM structure.
            const getNormalizedTextAndCursor = () => {
                const tempDiv = document.createElement('div');
                const codeClone = codeElement.cloneNode(true);
        
                // Create a temporary container to correctly resolve innerHTML, including BRs
                const walker = document.createTreeWalker(codeClone, NodeFilter.SHOW_ALL);
                let normalizedHtml = '';
                while (walker.nextNode()) {
                    const node = walker.currentNode;
                    if (node.nodeType === Node.TEXT_NODE) {
                        normalizedHtml += node.textContent;
                    } else if (node.tagName === 'BR') {
                        normalizedHtml += '\n';
                    } else if (node.tagName === 'DIV' && node.parentNode === codeClone) {
                         if (normalizedHtml.length > 0 && !normalizedHtml.endsWith('\n')) {
                            normalizedHtml += '\n';
                        }
                        normalizedHtml += node.innerHTML.replace(/<br\s*\/?>/gi, '\n') + '\n';
                    }
                }
                
                tempDiv.innerHTML = codeClone.innerHTML.replace(/<br\s*\/?>/gi, '\n');
                const text = tempDiv.textContent;
        
                const preCursorRange = range.cloneRange();
                preCursorRange.selectNodeContents(codeElement);
                preCursorRange.setEnd(range.startContainer, range.startOffset);
                const preCursorFragment = preCursorRange.cloneContents();
                
                tempDiv.innerHTML = '';
                tempDiv.appendChild(preCursorFragment);
                tempDiv.innerHTML = tempDiv.innerHTML.replace(/<br\s*\/?>/gi, '\n');
                const cursorPos = tempDiv.textContent.length;
        
                return { text, cursorPos };
            };
        
            const { text, cursorPos } = getNormalizedTextAndCursor();
        
            if (text.replace(/\u200B/g, '').trim() === '') {
                const newBlock = document.createElement('div');
                newBlock.innerHTML = '<br>';
                codeBlockWrapper.replaceWith(newBlock);
                moveCursorToEnd(newBlock);
                this.editor.saveContent();
                return true;
            }
        
            const textBeforeCursor = text.substring(0, cursorPos);
            const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
            const lineStart = lastNewlineIndex + 1;
        
            const textAfterCursor = text.substring(cursorPos);
            const nextNewlineIndex = textAfterCursor.indexOf('\n');
            const lineEnd = cursorPos + (nextNewlineIndex === -1 ? textAfterCursor.length : nextNewlineIndex);
        
            const currentLineText = text.substring(lineStart, lineEnd);
        
            if (currentLineText.replace(/\u200B/g, '').trim() === '') {
                const textBefore = text.substring(0, lineStart > 0 ? lineStart - 1 : 0);
                const textAfter = text.substring(lineEnd + 1);
        
                const newBlock = document.createElement('div');
                newBlock.innerHTML = '<br>';
        
                if (textBefore.trim()) {
                    codeElement.textContent = textBefore.trimEnd();
                    codeBlockWrapper.after(newBlock);
                } else {
                    codeBlockWrapper.replaceWith(newBlock);
                }
        
                if (textAfter.trim()) {
                    const newWrapper = this.editor.renderer.createFromHTML(`<div class="code-block-wrapper">${COPY_BUTTON_HTML}<pre><code></code></pre></div>`);
                    newWrapper.querySelector('code').textContent = textAfter.trimStart();
                    newBlock.after(newWrapper);
                }
        
                moveCursorToEnd(newBlock);
                this.editor.saveContent();
                return true;
            }
        
            if (currentLineText.trim() === '```') {
                const newTextContent = (text.substring(0, lineStart) + text.substring(lineEnd + 1)).trim();
                const newBlock = document.createElement('div');
                newBlock.innerHTML = '<br>';
        
                if (newTextContent) {
                    codeElement.textContent = newTextContent;
                    codeBlockWrapper.after(newBlock);
                } else {
                    codeBlockWrapper.replaceWith(newBlock);
                }
        
                moveCursorToEnd(newBlock);
                this.editor.saveContent();
                return true;
            }
        
            return false; // Allow default behavior (inserting newline)
        }
    
        const listItem = parentElement.closest('li');
        if (listItem) {
            const isChecklistItem = listItem.classList.contains('checklist-item');
            const contentContainer = isChecklistItem ? listItem.querySelector('.checklist-content-wrapper > span') : listItem;

            const isItemEmpty = (() => {
                if (!contentContainer) return true;
                // An item is empty if it has no direct text content. The presence of a sublist (UL/OL)
                // does not count as content for this purpose.
                let hasText = false;
                for (const node of contentContainer.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '') {
                        hasText = true;
                        break;
                    }
                    if (node.nodeType === Node.ELEMENT_NODE && !['UL', 'OL', 'BR'].includes(node.tagName)) {
                        hasText = true; // e.g., an <img> or <a> tag
                        break;
                    }
                }
                return !hasText;
            })();

            if (isItemEmpty) {
                // Find the top-most list container
                let topList = listItem.parentElement;
                while (topList.parentElement.closest('li')) {
                    topList = topList.parentElement.closest('ul, ol');
                }

                const newBlock = document.createElement('div');
                newBlock.innerHTML = '<br>';
                
                // Place the new block after the entire list structure
                topList.after(newBlock);
                
                // Clean up: remove the now-empty item and traverse up, removing any parent lists that become empty
                let currentList = listItem.parentElement;
                listItem.remove();

                while (currentList && currentList !== topList && currentList.children.length === 0) {
                    const parentLi = currentList.parentElement;
                    currentList.remove();
                    currentList = parentLi ? parentLi.parentElement : null;
                }

                // If the top-level list itself is now empty, replace it completely.
                if (topList.children.length === 0) {
                    topList.replaceWith(newBlock);
                }

                moveCursorToEnd(newBlock);
                this.editor.saveContent();
                return true; // Prevent default Enter behavior
            }

            if (isChecklistItem) {
                const newLi = document.createElement('li');
                newLi.className = 'checklist-item';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                
                const newSpan = document.createElement('span');
                newSpan.innerHTML = '<br>';

                const wrapper = document.createElement('div');
                wrapper.className = 'checklist-content-wrapper';
                wrapper.appendChild(checkbox);
                wrapper.appendChild(newSpan);
                newLi.appendChild(wrapper);

                listItem.after(newLi);
                moveCursorToEnd(newSpan);
                this.editor.saveContent();
                return true;
            }

            return false;
        }

        const container = parentElement.closest('blockquote, .dabir-admonition');
        if (container) {
            const currentLine = parentElement.closest('div, p');
            
            if (!currentLine || currentLine.classList.contains('dabir-admonition-title') || currentLine.parentElement !== container) {
                return false;
            }
    
            const isLineEmpty = currentLine.textContent.trim().replace(/\u200B/g, '') === '';
            
            if (isLineEmpty) {
                const contentChildren = Array.from(container.children).filter(el => 
                    !el.classList.contains('dabir-admonition-title')
                );
                
                const newBlock = document.createElement('div');
                newBlock.innerHTML = '<br>';
    
                if (contentChildren.length === 1 && contentChildren[0] === currentLine) {
                    container.replaceWith(newBlock);
                } else {
                    container.after(newBlock);
                    currentLine.remove();
                }
                
                moveCursorToEnd(newBlock);
                this.editor.saveContent();
                return true;
            }
        }
    
        return false;
    }

    /**
     * رویداد keyup را برای پردازش زنده مارک‌داون مدیریت می‌کند.
     * @param {KeyboardEvent} event - آبجکت رویداد.
     * @private
     */
    handleKeyUp(event) {
        const currentBlock = this._findCurrentBlock();
        if (event.key === 'Enter') {
            if (currentBlock && currentBlock.previousElementSibling) {
                const targetBlock = currentBlock.previousElementSibling;
                if (this._tryToParseMultiLineBlock(targetBlock)) {
                    return;
                }
                if (this._tryToParseBlock(targetBlock, event.key, currentBlock)) {
                    return;
                }
            }
        } else if (event.key === ' ') {
            const parentElement = this.editor.selection.parentElement;
            const listItem = parentElement ? parentElement.closest('li') : null;
    
            if (listItem && !listItem.classList.contains('checklist-item')) {
                if (this._tryToUpdateListItem(listItem)) {
                    event.preventDefault();
                    return;
                }
            }
            
            if (currentBlock) {
                this._tryToParseBlock(currentBlock, event.key);
            }
        }
    }

    /**
     * تلاش می‌کند تا یک آیتم لیست معمولی را به بازبینه تبدیل کند.
     * @param {HTMLLIElement} listItem 
     * @returns {boolean}
     * @private
     */
    _tryToUpdateListItem(listItem) {
        const text = listItem.textContent;
        const match = text.match(/^\s*\[([xX ])\]\s/);
    
        if (!match) return false;
    
        const listElement = listItem.parentElement;
        if (!listElement || !['UL', 'OL'].includes(listElement.tagName)) {
            return false;
        }
        
        requestAnimationFrame(() => {
            const sublist = listItem.querySelector('ul, ol');
            if (sublist) sublist.remove();
            
            const mainText = listItem.textContent;
            const mainMatch = mainText.match(/^\s*\[([xX ])\]\s(.*)/s);
            
            if (!mainMatch) {
                if(sublist) listItem.appendChild(sublist);
                return;
            }
    
            const isChecked = mainMatch[1].toLowerCase() === 'x';
            const contentText = mainMatch[2] || '';
            const contentHTML = parseInline(contentText);
    
            listItem.innerHTML = '';
    
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = isChecked;
    
            const contentSpan = document.createElement('span');
            contentSpan.innerHTML = contentHTML || '<br>';
            
            const wrapper = document.createElement('div');
            wrapper.className = 'checklist-content-wrapper';
            wrapper.appendChild(checkbox);
            wrapper.appendChild(contentSpan);
            listItem.appendChild(wrapper);
    
            if (sublist) listItem.appendChild(sublist);
    
            listElement.classList.add('checklist');
            listItem.classList.add('checklist-item');
            listItem.classList.toggle('checked', isChecked);
            
            moveCursorToEnd(contentSpan);
    
            this.editor.saveContent();
        });
    
        return true;
    }
    
    /**
     * بلاک فعلی که مکان‌نما در آن قرار دارد را پیدا می‌کند.
     * @returns {HTMLElement|null}
     * @private
     */
    _findCurrentBlock() {
        const { selection } = this.editor;
        const anchor = selection.anchorNode;
        if (!anchor) return null;

        let currentBlock = anchor.nodeType === Node.TEXT_NODE ? anchor.parentElement : anchor;
        while (currentBlock && currentBlock.parentElement !== this.element) {
            currentBlock = currentBlock.parentElement;
        }
        return (currentBlock && currentBlock.parentElement === this.element) ? currentBlock : null;
    }

    /**
     * تلاش می‌کند تا بلاک‌های چندخطی (مانند جعبه‌های توضیحی) را پردازش کند.
     * @param {HTMLElement} endBlock 
     * @returns {boolean}
     * @private
     */
    _tryToParseMultiLineBlock(endBlock) {
        if (!endBlock || !['DIV', 'P'].includes(endBlock.tagName)) {
            return false;
        }

        const contextBlocks = [endBlock];
        let current = endBlock.previousElementSibling;
        for (let i = 0; i < 20 && current; i++) { // Look behind up to 20 lines
            if (!['DIV', 'P'].includes(current.tagName)) break;
            contextBlocks.unshift(current);
            current = current.previousElementSibling;
        }

        const lines = contextBlocks.map(b => b.textContent);

        for (let i = 0; i < lines.length; i++) {
            for (const pluginName of this.editor.plugins.keys()) {
                const plugin = this.editor.plugins.get(pluginName);
                if (plugin && plugin.markdownBlockParser) {
                    const result = plugin.markdownBlockParser(lines, i, this.editor.parser);
                    
                    if (result && result.lastIndex === lines.length - 1) {
                        const blocksToRemove = contextBlocks.slice(i, result.lastIndex + 1);
                        const newElement = this.editor.renderer.createFromHTML(result.html);
                        
                        if (newElement) {
                            requestAnimationFrame(() => {
                                this.editor.renderer.replace(blocksToRemove[0], newElement);
                                for (let j = 1; j < blocksToRemove.length; j++) {
                                    blocksToRemove[j].remove();
                                }

                                if (newElement.tagName === 'TABLE') {
                                    const firstCell = newElement.querySelector('td');
                                    if (firstCell) {
                                        moveCursorToEnd(firstCell);
                                    }
                                }

                                this.editor.saveContent();
                            });
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    /**
     * تلاش می‌کند تا یک بلاک تک‌خطی را پردازش کند.
     * @param {HTMLElement} block 
     * @param {string} triggerKey 
     * @param {HTMLElement|null} nextBlock 
     * @returns {boolean}
     * @private
     */
    _tryToParseBlock(block, triggerKey, nextBlock = null) {
        if (!block || !['DIV', 'P'].includes(block.tagName)) {
            return false;
        }

        const lineText = block.textContent;
        if (!lineText.trim()) return false;
        
        const newHtml = parseLiveBlock(lineText);

        if (newHtml) {
            const newElement = this.editor.renderer.createFromHTML(newHtml);
            if (newElement) {
                requestAnimationFrame(() => {
                    this.editor.renderer.replace(block, newElement);
                    
                    if (triggerKey === ' ') {
                        const focusElement = newElement.querySelector('div') || newElement.querySelector('li') || newElement;
                        moveCursorToEnd(focusElement);
                    } else if (triggerKey === 'Enter') {
                        if (newElement.classList.contains('code-block-wrapper')) {
                            if (nextBlock && nextBlock.textContent.trim() === '') {
                                nextBlock.remove();
                            }
                            const focusElement = newElement.querySelector('code') || newElement;
                            moveCursorToEnd(focusElement);
                        }
                    }
                    
                    this.editor.saveContent();
                });
                return true;
            }
        }
        return false;
    }
}
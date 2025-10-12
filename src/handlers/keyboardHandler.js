import { moveCursorToEnd } from '../utils/dom.js';
import { parseLiveBlock } from '../parsers/liveParser.js';
import { parseInline } from '../parsers/inlineParser.js';

/**
 * Handles keyboard events and shortcuts.
 */
export class KeyboardHandler {
    /**
     * @param {import('../core/editor.js').DabirEditor} editor
     */
    constructor(editor) {
        this.editor = editor;
        this.shortcuts = new Map();
        this.element = editor.element;
        this.element.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.element.addEventListener('keyup', this.handleKeyUp.bind(this));
    }

    /**
     * Registers a keyboard shortcut.
     * @param {string} key The key (e.g., 'Enter', 'Tab').
     * @param {string[]} modifiers An array of modifiers (e.g., ['Shift']).
     * @param {Function} handler The function to execute.
     */
    register(key, modifiers = [], handler) {
        const keyString = `${modifiers.sort().join('+')}+${key}`.toLowerCase();
        if (!this.shortcuts.has(keyString)) {
            this.shortcuts.set(keyString, []);
        }
        this.shortcuts.get(keyString).push(handler);
    }

    handleKeyDown(event) {
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
        }
    }

    handleBackspace(event) {
        const { selection } = this.editor;
        const range = selection.range;

        if (range && range.collapsed && range.startOffset === 0) {
            const parentElement = selection.parentElement;
            const listItem = parentElement.closest('li.checklist-item');
            
            if (listItem) {
                const contentContainer = listItem.querySelector('span');
                if (contentContainer && contentContainer.contains(range.startContainer)) {
                    const preCursorRange = document.createRange();
                    preCursorRange.selectNodeContents(contentContainer);
                    preCursorRange.setEnd(range.startContainer, range.startOffset);
                    if (preCursorRange.toString().trim() === '') {
                        // At the start of the item, convert to normal list item.
                        const list = listItem.parentElement;
                        const checkbox = listItem.querySelector('input[type="checkbox"]');
                        if (checkbox) checkbox.remove();

                        const contentNodes = contentContainer ? Array.from(contentContainer.childNodes) : [];
                        if (contentContainer) {
                            contentContainer.replaceWith(...contentNodes);
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

    handleEnter(event) {
        const { selection } = this.editor;
        const parentElement = selection.parentElement;
        if (!parentElement) return false;

        const preElement = parentElement.closest('pre');
        if (preElement) {
            const range = selection.range;
            if (!range || !range.collapsed) return false;
        
            const codeElement = preElement.querySelector('code');
            if (!codeElement) return false;
        
            // Normalize the code content by replacing <br> and other elements with newlines
            // to reliably detect empty lines regardless of DOM structure.
            const getNormalizedTextAndCursor = () => {
                const tempDiv = document.createElement('div');
                const codeClone = codeElement.cloneNode(true);
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
                preElement.replaceWith(newBlock);
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
                    preElement.after(newBlock);
                } else {
                    preElement.replaceWith(newBlock);
                }
        
                if (textAfter.trim()) {
                    const newPre = document.createElement('pre');
                    const newCode = document.createElement('code');
                    newCode.textContent = textAfter.trimStart();
                    newPre.appendChild(newCode);
                    newBlock.after(newPre);
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
                    preElement.after(newBlock);
                } else {
                    preElement.replaceWith(newBlock);
                }
        
                moveCursorToEnd(newBlock);
                this.editor.saveContent();
                return true;
            }
        
            return false; // Allow default behavior (inserting newline)
        }
    
        const checklistItem = parentElement.closest('li.checklist-item');
        if (checklistItem) {
            const contentSpan = checklistItem.querySelector('span');
            const isItemEmpty = !contentSpan || contentSpan.textContent.trim().replace(/\u200B/g, '') === '';

            if (isItemEmpty) {
                // Exit list functionality
                const list = checklistItem.parentElement;
                const listContainer = list.parentElement;
                const newBlock = document.createElement('div');
                newBlock.innerHTML = '<br>';

                if (listContainer.tagName === 'LI') { // Nested list -> outdent to a new line
                    listContainer.after(newBlock);
                    checklistItem.remove();
                    if (list.children.length === 0) {
                        list.remove();
                    }
                } else { // Top-level list -> exit
                    if (list.children.length === 1) { // It's the only item
                        list.replaceWith(newBlock);
                    } else {
                        list.after(newBlock);
                        checklistItem.remove();
                    }
                }
                moveCursorToEnd(newBlock);

            } else {
                // Create new checklist item
                const newLi = document.createElement('li');
                newLi.className = 'checklist-item';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                newLi.appendChild(checkbox);
                
                const newSpan = document.createElement('span');
                newSpan.innerHTML = '&#8203;'; // Zero-width space for cursor
                newLi.appendChild(newSpan);

                checklistItem.after(newLi);
                moveCursorToEnd(newSpan);
            }

            this.editor.saveContent();
            return true;
        }

        const container = parentElement.closest('blockquote, .dabir-admonition');
        if (container) {
            const currentLine = parentElement.closest('div, p');
            
            if (!currentLine || currentLine.classList.contains('dabir-admonition-title') || currentLine.parentElement !== container) {
                return false;
            }
    
            const isLineEmpty = currentLine.textContent.trim() === '';
            
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
                const blockParsed = this._tryToParseBlock(currentBlock, event.key);
                if (!blockParsed && currentBlock.tagName === 'DIV') {
                    this._tryToParseInline(currentBlock);
                }
            }
        }
    }

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
            listItem.appendChild(checkbox);
    
            const contentSpan = document.createElement('span');
            contentSpan.innerHTML = contentHTML || '&#8203;'; // Zero-width space
            listItem.appendChild(contentSpan);
    
            if (sublist) listItem.appendChild(sublist);
    
            listElement.classList.add('checklist');
            listItem.classList.add('checklist-item');
            listItem.classList.toggle('checked', isChecked);
            
            moveCursorToEnd(contentSpan);
    
            this.editor.saveContent();
        });
    
        return true;
    }
    
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
                        if (newElement.tagName === 'PRE') {
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

    _tryToParseInline(block) {
        const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
        const nodesToProcess = [];
    
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (node.parentElement.closest('code, pre, a, strong, em, del, mark')) {
                continue;
            }
            if (/(?:\*\*|\*|~~|==|`|\[)/.test(node.textContent)) {
                nodesToProcess.push(node);
            }
        }
    
        if (nodesToProcess.length === 0) {
            return false;
        }
    
        requestAnimationFrame(() => {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
    
            const range = selection.getRangeAt(0).cloneRange();
            const cursorMarker = document.createElement('span');
            range.insertNode(cursorMarker);
            
            let somethingChanged = false;
    
            nodesToProcess.forEach(node => {
                if (!node.isConnected) return;
                const text = node.textContent;
                const newHtml = parseInline(text);
    
                if (newHtml !== text) {
                    const fragment = document.createRange().createContextualFragment(newHtml);
                    node.replaceWith(fragment);
                    somethingChanged = true;
                }
            });
    
            // Restore cursor position and clean up
            if (block.contains(cursorMarker)) {
                const newRange = document.createRange();
                newRange.setStartBefore(cursorMarker);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
            cursorMarker.remove();
    
            if (somethingChanged) {
                this.editor.saveContent();
            }
        });
    
        return true;
    }
}
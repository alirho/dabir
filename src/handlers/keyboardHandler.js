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

    handleEnter(event) {
        const { selection } = this.editor;
        const parentElement = selection.parentElement;
        if (!parentElement) return false;
    
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
        if (event.key === 'Enter') {
            const currentBlock = this._findCurrentBlock();
            if (currentBlock && currentBlock.previousElementSibling) {
                const targetBlock = currentBlock.previousElementSibling;
                if (this._tryToParseMultiLineBlock(targetBlock)) {
                    return;
                }
                this._tryToParseBlock(targetBlock, event.key);
            }
        } else if (event.key === ' ') {
            const currentBlock = this._findCurrentBlock();
            if (currentBlock) {
                const blockParsed = this._tryToParseBlock(currentBlock, event.key);
                if (!blockParsed && currentBlock.tagName === 'DIV') {
                    this._tryToParseInline(currentBlock);
                }
            }
        }
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

    _tryToParseBlock(block, triggerKey) {
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
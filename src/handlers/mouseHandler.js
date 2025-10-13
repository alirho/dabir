import { parseInline } from '../parsers/inlineParser.js';
import { parseLiveBlock } from '../parsers/liveParser.js';
import { moveCursorToEnd } from '../utils/dom.js';
import { debounce } from '../utils/debounce.js';

/**
 * Handles mouse and selection events for smart, live editing.
 */
export class MouseHandler {
    constructor(editor) {
        this.editor = editor;
        this.element = editor.element;
        this.activeRawNode = null; // The node currently in "raw markdown" mode
        this.ignoreSelectionChange = false;

        // Debounced parser for newly typed inline markdown
        this.debouncedSmartParse = debounce(this._smartParseCurrentBlock.bind(this), 400);

        this.element.addEventListener('click', this.onClick.bind(this));
        this.element.addEventListener('blur', this.onBlur.bind(this));
        document.addEventListener('selectionchange', this.onSelectionChange.bind(this));
    }

    onBlur() {
        // When editor loses focus, revert any active raw node to its formatted state.
        if (this.activeRawNode) {
            this._revertActiveRawNode();
        }
        // Also, trigger one final parse on the last known block.
        const lastBlock = this._findCurrentBlock();
        if (lastBlock) {
             this._tryToParseInline(lastBlock);
        }
    }

    onClick(event) {
        const target = event.target;
        if (target.matches('li.checklist-item input[type="checkbox"]')) {
            const listItem = target.closest('li.checklist-item');
            if (listItem) {
                setTimeout(() => { // Allow checkbox state to update
                    const isChecked = target.checked;
                    listItem.classList.toggle('checked', isChecked);
                    const childCheckboxes = listItem.querySelectorAll('li.checklist-item input[type="checkbox"]');
                    childCheckboxes.forEach(checkbox => {
                        checkbox.checked = isChecked;
                        const childLi = checkbox.closest('li.checklist-item');
                        if (childLi) {
                            childLi.classList.toggle('checked', isChecked);
                        }
                    });
                    this.editor.saveContent();
                }, 0);
            }
        }
    }
    
    onSelectionChange() {
        if (this.ignoreSelectionChange) return;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || !this.editor.element.contains(selection.anchorNode)) {
            this.onBlur(); // Treat losing selection as a blur event
            return;
        }

        const anchorNode = selection.anchorNode;
        const range = selection.getRangeAt(0);

        // --- 1. Handle Active Raw Node ---
        // If cursor moves out of the active raw node, revert it to formatted HTML.
        if (this.activeRawNode && !this.activeRawNode.contains(anchorNode)) {
            this._revertActiveRawNode();
        }
        
        // --- 2. Handle Text Selection ---
        // If user is selecting a range of text, revert any raw node and do nothing else.
        if (!range.collapsed) {
            if (this.activeRawNode) this._revertActiveRawNode();
            return;
        }

        // --- 3. Enter Raw Mode ---
        // If cursor enters a formatted element, convert it to raw markdown for editing.
        if (!this.activeRawNode) {
            const parentElement = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;
            const formattingElement = parentElement.closest('strong, em, del, mark, a, code:not(pre *), h1, h2, h3, h4');
            
            if (formattingElement && formattingElement.closest('[contenteditable="true"]') === this.editor.element) {
                this._enterRawMode(formattingElement, range);
                return; // Stop further processing for this event
            }
        }
        
        // --- 4. Schedule Smart Parse ---
        // For all other cases (typing, moving cursor in plain text), schedule a parse.
        this.debouncedSmartParse();
    }

    _smartParseCurrentBlock() {
        // This is called after a delay. It parses the block where the cursor currently is.
        if (this.activeRawNode) return;
        const currentBlock = this._findCurrentBlock();
        if (currentBlock) {
            this._tryToParseInline(currentBlock);
        }
    }
    
    _enterRawMode(element, range) {
        const markdownInfo = this._htmlToRawMarkdown(element);
        if (!markdownInfo) return;

        this.ignoreSelectionChange = true;
        
        // Calculate cursor position before replacement
        let totalOffset = range.startOffset;
        let currentNode = range.startContainer;
        while (currentNode && currentNode !== element) {
            let prevSibling = currentNode.previousSibling;
            while (prevSibling) {
                totalOffset += (prevSibling.textContent || '').length;
                prevSibling = prevSibling.previousSibling;
            }
            currentNode = currentNode.parentNode;
        }
        const newOffset = Math.min(markdownInfo.prefixLength + totalOffset, markdownInfo.rawText.length);
        
        const isBlock = /^H[1-4]$/.test(element.tagName);
        let newNode;
        if (isBlock) {
            element.textContent = markdownInfo.rawText;
            this.activeRawNode = element;
            newNode = element.firstChild;
        } else {
            const rawTextNode = document.createTextNode(markdownInfo.rawText);
            element.replaceWith(rawTextNode);
            this.activeRawNode = rawTextNode;
            newNode = rawTextNode;
        }
        
        // Restore cursor position
        if (newNode) {
            const newRange = document.createRange();
            newRange.setStart(newNode, newOffset);
            newRange.collapse(true);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(newRange);
        }
        
        requestAnimationFrame(() => { this.ignoreSelectionChange = false; });
    }

    _revertActiveRawNode() {
        if (!this.activeRawNode || !this.activeRawNode.isConnected) {
            this.activeRawNode = null;
            return;
        }

        const nodeToRevert = this.activeRawNode;
        this.activeRawNode = null;
        this.ignoreSelectionChange = true;

        let newElement;
        const rawText = nodeToRevert.textContent;

        if (nodeToRevert.nodeType === Node.TEXT_NODE) { // Reverting an inline element
            const newHtml = parseInline(rawText);
            newElement = document.createRange().createContextualFragment(newHtml);
        } else { // Reverting a block element (H1-H4)
            const newHtml = parseLiveBlock(rawText.trim());
            if (newHtml) {
                newElement = this.editor.renderer.createFromHTML(newHtml);
            } else {
                newElement = document.createElement('div');
                newElement.textContent = rawText || '';
                if (newElement.innerHTML === '') newElement.innerHTML = '<br>';
            }
        }
        
        nodeToRevert.replaceWith(newElement);
        requestAnimationFrame(() => { this.ignoreSelectionChange = false; });
    }

    _tryToParseInline(block) {
        if (!block || !block.isConnected || this.activeRawNode) return false;
    
        const selection = window.getSelection();
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    
        if (!range || !range.collapsed || !block.contains(range.startContainer)) {
            return false;
        }

        const saveCursor = () => {
            const treeWalker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
            let charCount = 0;
            let savedPos = null;
            while (treeWalker.nextNode()) {
                const node = treeWalker.currentNode;
                if (node === range.startContainer) {
                    savedPos = charCount + range.startOffset;
                    break;
                }
                charCount += node.textContent.length;
            }
            return savedPos;
        };

        const restoreCursor = (pos) => {
            if (pos === null) return;
            const treeWalker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
            let charCount = 0;
            let newRange = null;
            while (treeWalker.nextNode()) {
                const node = treeWalker.currentNode;
                const nodeLength = node.textContent.length;
                if (charCount + nodeLength >= pos) {
                    newRange = document.createRange();
                    newRange.setStart(node, Math.min(pos - charCount, nodeLength));
                    newRange.collapse(true);
                    break;
                }
                charCount += nodeLength;
            }
            if (newRange) {
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
        };

        const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
        const nodesToProcess = [];
        
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (node.parentElement.closest('code, pre, a, strong, em, del, mark')) continue;
            if (/(?:\*\*|(?<!\*)\*(?!\*)|~~|==|`|\[)/.test(node.textContent)) {
                nodesToProcess.push(node);
            }
        }
    
        if (nodesToProcess.length === 0) return false;
        
        const cursorPos = saveCursor();
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

        if (somethingChanged) {
            this.ignoreSelectionChange = true;
            restoreCursor(cursorPos);
            this.editor.saveContent();
            requestAnimationFrame(() => { this.ignoreSelectionChange = false; });
        }
        
        return somethingChanged;
    }
    
    _htmlToRawMarkdown(element) {
        const text = element.textContent;
        let prefix = '', suffix = '';
        switch (element.tagName) {
            case 'STRONG': prefix = suffix = '**'; break;
            case 'EM': prefix = suffix = '*'; break;
            case 'DEL': prefix = suffix = '~~'; break;
            case 'MARK': prefix = suffix = '=='; break;
            case 'CODE': prefix = suffix = '`'; break;
            case 'A':
                prefix = '[';
                suffix = `](${element.getAttribute('href') || ''})`;
                break;
            case 'H1': prefix = '# '; break;
            case 'H2': prefix = '## '; break;
            case 'H3': prefix = '### '; break;
            case 'H4': prefix = '#### '; break;
            default: return null;
        }
        return { rawText: `${prefix}${text}${suffix}`, prefixLength: prefix.length };
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
}

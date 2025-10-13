import { parseInline } from '../parsers/inlineParser.js';
import { parseLiveBlock } from '../parsers/liveParser.js';
import { moveCursorToEnd } from '../utils/dom.js';

/**
 * Handles mouse and selection events.
 */
export class MouseHandler {
    /**
     * @param {import('../core/editor.js').DabirEditor} editor
     */
    constructor(editor) {
        this.editor = editor;
        this.element = editor.element;
        this.activeRawNode = null;
        this.ignoreSelectionChange = false;

        this.element.addEventListener('click', this.onClick.bind(this));
        this.element.addEventListener('blur', this.onBlur.bind(this));
        document.addEventListener('selectionchange', this.onSelectionChange.bind(this));
    }

    onBlur() {
        if (this.activeRawNode) {
            this._revertActiveRawNode();
        }
    }

    onClick(event) {
        const target = event.target;
        // Handle checklist item clicks
        if (target.matches('li.checklist-item input[type="checkbox"]')) {
            const listItem = target.closest('li.checklist-item');
            if (listItem) {
                setTimeout(() => { // Allow checkbox state to update
                    const isChecked = target.checked;
                    
                    // Update the clicked item itself
                    listItem.classList.toggle('checked', isChecked);

                    // Find all descendant checkboxes and update them to match the parent
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
    
    _revertActiveRawNode() {
        if (!this.activeRawNode || !this.activeRawNode.isConnected) {
            this.activeRawNode = null;
            return;
        }

        const nodeToRevert = this.activeRawNode;
        this.activeRawNode = null;

        // --- Logic for inline elements (reverted from a text node) ---
        if (nodeToRevert.nodeType === Node.TEXT_NODE) {
            const rawText = nodeToRevert.textContent;
            if (!rawText.trim()) {
                this.ignoreSelectionChange = true;
                nodeToRevert.remove();
                requestAnimationFrame(() => { this.ignoreSelectionChange = false; });
                return;
            }
            
            const newHtml = parseInline(rawText);
            if (newHtml === rawText) return;
            
            const fragment = document.createRange().createContextualFragment(newHtml);
            
            this.ignoreSelectionChange = true;
            nodeToRevert.replaceWith(fragment);
            requestAnimationFrame(() => { this.ignoreSelectionChange = false; });
            return;
        }

        // --- Logic for block elements (reverted from an element like H1) ---
        if (/^H[1-4]$/.test(nodeToRevert.tagName)) {
            const rawText = nodeToRevert.textContent;
            
            this.ignoreSelectionChange = true;

            const newHtml = parseLiveBlock(rawText.trim());
            let newElement;

            if (newHtml) {
                newElement = this.editor.renderer.createFromHTML(newHtml);
            } else {
                newElement = document.createElement('div');
                newElement.textContent = rawText || '';
                if (newElement.innerHTML === '') newElement.innerHTML = '<br>';
            }

            if (newElement) {
                nodeToRevert.replaceWith(newElement);
                moveCursorToEnd(newElement);
            }

            requestAnimationFrame(() => { this.ignoreSelectionChange = false; });
        }
    }

    onSelectionChange() {
        if (this.ignoreSelectionChange) return;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || !this.editor.element.contains(selection.anchorNode)) {
            if (this.activeRawNode) this._revertActiveRawNode();
            return;
        }

        const anchorNode = selection.anchorNode;

        if (this.activeRawNode && !this.activeRawNode.contains(anchorNode)) {
            this._revertActiveRawNode();
        }

        const range = selection.getRangeAt(0);

        if (!range.collapsed) {
            if (this.activeRawNode) this._revertActiveRawNode();
            return;
        }

        const parentElement = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;

        if (!this.activeRawNode) {
            const formattingElement = parentElement.closest('strong, em, del, mark, a, code:not(pre *), h1, h2, h3, h4');

            if (formattingElement && formattingElement.closest('[contenteditable="true"]') === this.editor.element) {
                const markdownInfo = this._htmlToRawMarkdown(formattingElement);
                
                if (markdownInfo) {
                    const isBlock = /^H[1-4]$/.test(formattingElement.tagName);
                    this.ignoreSelectionChange = true;
                    
                    let totalOffset = range.startOffset;
                    let currentNode = anchorNode;
                    while (currentNode && currentNode !== formattingElement) {
                        let prevSibling = currentNode.previousSibling;
                        while (prevSibling) {
                            totalOffset += (prevSibling.textContent || '').length;
                            prevSibling = prevSibling.previousSibling;
                        }
                        currentNode = currentNode.parentNode;
                    }
                    
                    const newOffset = Math.min(markdownInfo.prefixLength + totalOffset, markdownInfo.rawText.length);
                    
                    if (isBlock) {
                        formattingElement.textContent = markdownInfo.rawText;
                        this.activeRawNode = formattingElement;
                        const textNode = formattingElement.firstChild;
                        if (textNode) {
                            const newRange = document.createRange();
                            newRange.setStart(textNode, newOffset);
                            newRange.collapse(true);
                            selection.removeAllRanges();
                            selection.addRange(newRange);
                        }
                    } else {
                        const rawTextNode = document.createTextNode(markdownInfo.rawText);
                        formattingElement.replaceWith(rawTextNode);
                        this.activeRawNode = rawTextNode;
                        
                        const newRange = document.createRange();
                        newRange.setStart(rawTextNode, newOffset);
                        newRange.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                    }
                    
                    requestAnimationFrame(() => { this.ignoreSelectionChange = false; });
                }
            }
        }
    }
}
import { parseInline } from '../parsers/inlineParser.js';

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
            default: return null;
        }
        return { rawText: `${prefix}${text}${suffix}`, prefixLength: prefix.length };
    }
    
    _revertActiveRawNode() {
        if (!this.activeRawNode || !this.activeRawNode.isConnected) {
            this.activeRawNode = null;
            return;
        }

        const rawTextNode = this.activeRawNode;
        this.activeRawNode = null;

        const rawText = rawTextNode.textContent;
        if (!rawText.trim()) {
            this.ignoreSelectionChange = true;
            rawTextNode.remove();
            requestAnimationFrame(() => { this.ignoreSelectionChange = false; });
            return;
        }
        
        const newHtml = parseInline(rawText);
        
        if (newHtml === rawText) {
            return;
        }
        
        const fragment = document.createRange().createContextualFragment(newHtml);
        
        this.ignoreSelectionChange = true;
        rawTextNode.replaceWith(fragment);
        requestAnimationFrame(() => { this.ignoreSelectionChange = false; });
    }

    onSelectionChange() {
        if (this.ignoreSelectionChange) return;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || !this.editor.element.contains(selection.anchorNode)) {
            if (this.activeRawNode) this._revertActiveRawNode();
            return;
        }

        const range = selection.getRangeAt(0);
        const anchorNode = selection.anchorNode;

        if (this.activeRawNode && anchorNode !== this.activeRawNode) {
            this._revertActiveRawNode();
        }

        if (!range.collapsed) {
            if (this.activeRawNode) this._revertActiveRawNode();
            return;
        }

        if (!this.activeRawNode) {
            const parentElement = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;
            const formattingElement = parentElement.closest('strong, em, del, mark, a, code:not(pre *)');

            if (formattingElement && formattingElement.closest('[contenteditable="true"]') === this.editor.element) {
                const markdownInfo = this._htmlToRawMarkdown(formattingElement);
                
                if (markdownInfo) {
                    this.ignoreSelectionChange = true;
                    
                    const offsetInNode = range.startOffset;
                    let totalOffset = offsetInNode;
                    let currentNode = anchorNode;

                    while (currentNode && currentNode !== formattingElement) {
                        let prevSibling = currentNode.previousSibling;
                        while (prevSibling) {
                            totalOffset += (prevSibling.textContent || '').length;
                            prevSibling = prevSibling.previousSibling;
                        }
                        currentNode = currentNode.parentNode;
                    }
                    
                    const rawTextNode = document.createTextNode(markdownInfo.rawText);
                    formattingElement.replaceWith(rawTextNode);
                    this.activeRawNode = rawTextNode;
                    
                    const newRange = document.createRange();
                    const newOffset = Math.min(
                        markdownInfo.prefixLength + totalOffset,
                        rawTextNode.length
                    );
                    newRange.setStart(rawTextNode, newOffset);
                    newRange.collapse(true);
                    
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                    
                    requestAnimationFrame(() => { this.ignoreSelectionChange = false; });
                }
            }
        }
    }
}
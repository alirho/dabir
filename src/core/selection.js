
/**
 * Manages editor selection and range.
 */
export default class Selection {
    /**
     * @param {import('./editor.js').DabirEditor} editor The editor instance.
     */
    constructor(editor) {
        this.editor = editor;
        this.element = editor.element;
    }

    /**
     * Gets the current window selection object.
     * @returns {globalThis.Selection|null}
     */
    get selection() {
        return window.getSelection();
    }

    /**
     * Gets the current selection range.
     * @returns {Range|null}
     */
    get range() {
        const sel = this.selection;
        return sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    }

    /**
     * Sets the selection to a specific range.
     * @param {Range} range
     */
    setRange(range) {
        const sel = this.selection;
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }

    /**
     * Gets the current active node in the selection.
     * @returns {Node|null}
     */
    get anchorNode() {
        const sel = this.selection;
        return sel ? sel.anchorNode : null;
    }

    /**
     * Gets the parent element of the current selection anchor.
     * @returns {HTMLElement|null}
     */
    get parentElement() {
        const node = this.anchorNode;
        if (!node) return null;
        return node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    }
}

/**
 * کلاس مدیریت انتخاب متن (Selection) و محدوده (Range) در ویرایشگر.
 * @class Selection
 */
export default class Selection {
    /**
     * @param {import('./editor.js').DabirEditor} editor - نمونه ویرایشگر.
     */
    constructor(editor) {
        /**
         * @private
         * @type {import('./editor.js').DabirEditor}
         */
        this.editor = editor;
        /**
         * @private
         * @type {HTMLElement}
         */
        this.element = editor.element;
    }

    /**
     * آبجکت Selection فعلی پنجره را برمی‌گرداند.
     * @returns {globalThis.Selection|null}
     */
    get selection() {
        return window.getSelection();
    }

    /**
     * محدوده (Range) فعلی انتخاب را برمی‌گرداند.
     * @returns {Range|null}
     */
    get range() {
        const sel = this.selection;
        return sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    }

    /**
     * انتخاب متن را روی یک محدوده مشخص تنظیم می‌کند.
     * @param {Range} range - محدوده‌ای که باید انتخاب شود.
     */
    setRange(range) {
        const sel = this.selection;
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }

    /**
     * گره (Node) فعال فعلی در انتخاب را برمی‌گرداند.
     * @returns {Node|null}
     */
    get anchorNode() {
        const sel = this.selection;
        return sel ? sel.anchorNode : null;
    }

    /**
     * المان والد لنگر (anchor) انتخاب فعلی را برمی‌گرداند.
     * @returns {HTMLElement|null}
     */
    get parentElement() {
        const node = this.anchorNode;
        if (!node) return null;
        return node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    }
}
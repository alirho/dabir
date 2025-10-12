
/**
 * Handles clipboard events (copy, paste).
 */
export class ClipboardHandler {
    /**
     * @param {import('../core/editor.js').DabirEditor} editor
     */
    constructor(editor) {
        this.editor = editor;
        this.element = editor.element;
        this.element.addEventListener('paste', this.onPaste.bind(this));
        this.element.addEventListener('copy', this.onCopy.bind(this));
    }

    onPaste(event) {
        event.preventDefault();
        const text = (event.clipboardData || window.clipboardData).getData('text/plain');
        if (text) {
            const html = this.editor.parser.parse(text);
            document.execCommand('insertHTML', false, html);
            this.editor.events.emit('paste', { text, html });
        }
    }

    onCopy(event) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const container = document.createElement('div');
        container.appendChild(range.cloneContents());

        const markdown = this.editor.htmlParser.parse(container);
        if (markdown) {
            event.preventDefault();
            event.clipboardData.setData('text/plain', markdown);
            this.editor.events.emit('copy', { markdown });
        }
    }
}

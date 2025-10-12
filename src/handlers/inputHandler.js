
import { debounce } from '../utils/debounce.js';

/**
 * Handles the 'input' event on the editor.
 */
export class InputHandler {
    /**
     * @param {import('../core/editor.js').DabirEditor} editor
     */
    constructor(editor) {
        this.editor = editor;
        this.element = editor.element;

        this.debouncedSave = debounce(() => this.editor.saveContent(), 250);
        this.element.addEventListener('input', this.handle.bind(this));
    }

    handle() {
        this.debouncedSave();
        this.editor.events.emit('input');
    }
}

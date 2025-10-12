
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
        document.addEventListener('selectionchange', this.onSelectionChange.bind(this));
    }

    onClick(event) {
        const target = event.target;
        // Handle checklist item clicks
        if (target.matches('li.checklist-item input[type="checkbox"]')) {
            const listItem = target.closest('li.checklist-item');
            if (listItem) {
                setTimeout(() => { // Allow checkbox state to update
                    listItem.classList.toggle('checked', target.checked);
                    this.editor.saveContent();
                }, 0);
            }
        }
    }

    onSelectionChange() {
        // The "reveal markdown" feature will be implemented here or in a dedicated plugin.
        // For now, this is a placeholder for that logic.
    }
}


/**
 * Handles rendering and DOM updates.
 * This is a basic implementation and can be extended for more complex rendering strategies.
 */
export class Renderer {
    /**
     * @param {import('../core/editor.js').DabirEditor} editor
     */
    constructor(editor) {
        this.editor = editor;
    }

    /**
     * Replaces an element with a new node.
     * @param {Node} oldNode The node to be replaced.
     * @param {Node} newNode The new node.
     */
    replace(oldNode, newNode) {
        oldNode.parentNode.replaceChild(newNode, oldNode);
        this.editor.events.emit('render:replace', { oldNode, newNode });
    }

    /**
     * Creates an HTML element from a string.
     * @param {string} htmlString
     * @returns {Node|null}
     */
    createFromHTML(htmlString) {
        const template = document.createElement('template');
        template.innerHTML = htmlString.trim();
        return template.content.firstChild;
    }
}

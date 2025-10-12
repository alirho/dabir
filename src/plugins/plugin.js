
/**
 * Base class for all plugins.
 */
export default class Plugin {
    /**
     * Installs the plugin on the editor instance.
     * This method must be implemented by subclasses.
     * @param {import('../core/editor.js').DabirEditor} editor The editor instance.
     * @param {object} options Plugin-specific options.
     */
    static install(editor, options) {
        throw new Error('Plugin must implement the static install method.');
    }
}

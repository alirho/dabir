
/**
 * Manages saving and loading content from localStorage.
 */
export default class Storage {
    /**
     * @param {object} options
     * @param {boolean} options.enabled
     * @param {string} options.key
     */
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.key = options.key || 'dabir-content';
    }

    /**
     * Saves content to storage.
     * @param {string} content
     */
    save(content) {
        if (this.enabled) {
            try {
                localStorage.setItem(this.key, content);
            } catch (error) {
                console.error('Dabir.js: Could not save content to localStorage.', error);
            }
        }
    }

    /**
     * Loads content from storage.
     * @returns {string|null}
     */
    load() {
        if (this.enabled) {
            try {
                return localStorage.getItem(this.key);
            } catch (error) {
                console.error('Dabir.js: Could not load content from localStorage.', error);
                return null;
            }
        }
        return null;
    }
}

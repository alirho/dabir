/**
 * @typedef {object} StorageOptions
 * @property {boolean} [enabled=true] - فعال یا غیرفعال بودن ذخیره‌سازی.
 * @property {string} [key='dabir-content'] - کلید مورد استفاده در localStorage.
 */

/**
 * کلاس مدیریت ذخیره و بارگذاری محتوا از localStorage.
 * @class Storage
 */
export default class Storage {
    /**
     * @param {StorageOptions} [options={}] - گزینه‌های پیکربندی ذخیره‌سازی.
     */
    constructor(options = {}) {
        /**
         * @private
         * @type {boolean}
         */
        this.enabled = options.enabled !== false;
        /**
         * @private
         * @type {string}
         */
        this.key = options.key || 'dabir-content';
    }

    /**
     * محتوا را در حافظه محلی ذخیره می‌کند.
     * @param {string} content - محتوایی که باید ذخیره شود.
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
     * محتوا را از حافظه محلی بارگذاری می‌کند.
     * @returns {string|null} محتوای ذخیره‌شده یا null در صورت عدم وجود.
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
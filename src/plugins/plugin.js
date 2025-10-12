/**
 * کلاس پایه برای تمام پلاگین‌ها.
 * پلاگین‌ها باید این کلاس را extend کرده و متد استاتیک `install` را پیاده‌سازی کنند.
 * @class Plugin
 */
export default class Plugin {
    /**
     * پلاگین را بر روی نمونه ویرایشگر نصب می‌کند.
     * این متد باید توسط کلاس‌های فرزند پیاده‌سازی شود.
     * @static
     * @param {import('../core/editor.js').DabirEditor} editor - نمونه ویرایشگر.
     * @param {object} [options] - گزینه‌های مخصوص پلاگین.
     * @returns {object|void} یک API اختیاری که توسط پلاگین ارائه می‌شود.
     */
    static install(editor, options) {
        throw new Error('Plugin must implement the static install method.');
    }
}
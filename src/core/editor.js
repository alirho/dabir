import EventEmitter from './eventEmitter.js';
import Storage from './storage.js';
import Selection from './selection.js';
import { MarkdownParser } from '../parsers/markdownParser.js';
import { HtmlParser } from '../parsers/htmlParser.js';
import { KeyboardHandler } from '../handlers/keyboardHandler.js';
import { MouseHandler } from '../handlers/mouseHandler.js';
import { ClipboardHandler } from '../handlers/clipboardHandler.js';
import { InputHandler } from '../handlers/inputHandler.js';
import { Renderer } from '../renderers/renderer.js';

/**
 * @typedef {object} DabirOptions
 * @property {string} [placeholder='اینجا بنویسید...'] - متنی که در هنگام خالی بودن ویرایشگر نمایش داده می‌شود.
 * @property {object} [storage] - تنظیمات مربوط به ذخیره‌سازی محلی.
 * @property {boolean} [storage.enabled=true] - فعال یا غیرفعال کردن ذخیره‌سازی خودکار.
 * @property {string} [storage.key='dabir-content'] - کلید منحصر به فرد برای ذخیره‌سازی در localStorage.
 * @property {Array<import('../plugins/plugin.js').Plugin>} [plugins=[]] - آرایه‌ای از کلاس‌های پلاگین برای فعال‌سازی.
 */

/**
 * کلاس اصلی ویرایشگر دبیر.
 * @class DabirEditor
 */
export class DabirEditor {
    /**
     * یک نمونه جدید از ویرایشگر دبیر ایجاد می‌کند.
     * @param {string} selector - سلکتور CSS برای المان ویرایشگر.
     * @param {DabirOptions} [options={}] - گزینه‌های پیکربندی برای ویرایشگر.
     */
    constructor(selector, options = {}) {
        /**
         * المان اصلی ویرایشگر.
         * @type {HTMLElement}
         */
        this.element = document.querySelector(selector);
        if (!this.element) {
            throw new Error(`Dabir.js: Element with selector "${selector}" not found.`);
        }

        /**
         * گزینه‌های پیکربندی ویرایشگر.
         * @type {DabirOptions}
         */
        this.options = {
            placeholder: 'اینجا بنویسید...',
            storage: { enabled: true, key: 'dabir-content' },
            plugins: [],
            ...options
        };

        /**
         * سیستم مدیریت رویدادها.
         * @type {EventEmitter}
         */
        this.events = new EventEmitter();

        /**
         * ماژول مدیریت ذخیره‌سازی محلی.
         * @type {Storage}
         */
        this.storage = new Storage(this.options.storage);

        /**
         * ماژول مدیریت انتخاب متن (Selection).
         * @type {Selection}
         */
        this.selection = new Selection(this);

        /**
         * ماژول رندر و به‌روزرسانی DOM.
         * @type {Renderer}
         */
        this.renderer = new Renderer(this);
        
        /**
         * پارسر مارک‌داون به HTML.
         * @type {MarkdownParser}
         */
        this.parser = new MarkdownParser(this);

        /**
         * پارسر HTML به مارک‌داون.
         * @type {HtmlParser}
         */
        this.htmlParser = new HtmlParser(this);

        /**
         * مدیریت‌کننده رویدادهای ورودی.
         * @type {InputHandler}
         */
        this.inputHandler = new InputHandler(this);

        /**
         * مدیریت‌کننده رویدادهای کیبورد.
         * @type {KeyboardHandler}
         */
        this.keyboardHandler = new KeyboardHandler(this);

        /**
         * مدیریت‌کننده رویدادهای ماوس.
         * @type {MouseHandler}
         */
        this.mouseHandler = new MouseHandler(this);

        /**
         * مدیریت‌کننده رویدادهای کلیپ‌بورد.
         * @type {ClipboardHandler}
         */
        this.clipboardHandler = new ClipboardHandler(this);

        /**
         * مجموعه‌ای از پلاگین‌های نصب‌شده.
         * @type {Map<string, object>}
         */
        this.plugins = new Map();
        
        this._init();
    }

    /**
     * ویرایشگر را راه‌اندازی می‌کند.
     * @private
     */
    _init() {
        this.element.classList.add('dabir-editor');
        this.element.setAttribute('contenteditable', 'true');
        this.element.setAttribute('data-placeholder', this.options.placeholder);
        
        this._loadContent();
        this._initPlugins();
        
        this.events.emit('ready');
    }

    /**
     * محتوای ذخیره‌شده را بارگذاری می‌کند.
     * @private
     */
    _loadContent() {
        const savedContent = this.storage.load();
        if (savedContent) {
            this.element.innerHTML = savedContent;
        } else {
            this.element.innerHTML = '<div><br></div>';
        }
        this.events.emit('load', this);
    }
    
    /**
     * محتوای فعلی ویرایشگر را در حافظه محلی ذخیره می‌کند.
     */
    saveContent() {
        const html = this.element.innerHTML;
        this.storage.save(html);
        this.events.emit('change', { html, markdown: this.getMarkdown() });
    }
    
    /**
     * پلاگین‌های مشخص‌شده در تنظیمات را راه‌اندازی می‌کند.
     * @private
     */
    _initPlugins() {
        this.options.plugins.forEach(Plugin => this.use(Plugin));
    }

    /**
     * یک پلاگین را ثبت و نصب می‌کند.
     * @param {import('../plugins/plugin.js').Plugin} Plugin - کلاس پلاگین برای نصب.
     * @param {object} [options={}] - گزینه‌های پیکربندی برای پلاگین.
     */
    use(Plugin, options = {}) {
        if (this.plugins.has(Plugin.name)) return;
        const pluginApi = Plugin.install(this, options);
        this.plugins.set(Plugin.name, pluginApi || {});
    }
    
    /**
     * یک شنونده برای یک رویداد ثبت می‌کند.
     * @param {string} event - نام رویداد (مانند 'change', 'ready').
     * @param {Function} listener - تابع callback که در زمان وقوع رویداد فراخوانی می‌شود.
     */
    on(event, listener) {
        this.events.on(event, listener);
    }

    /**
     * محتوای ویرایشگر را به صورت مارک‌داون دریافت می‌کند.
     * @returns {string} محتوای ویرایشگر به فرمت مارک‌داون.
     */
    getMarkdown() {
        return this.htmlParser.parse(this.element);
    }

    /**
     * محتوای ویرایشگر را به صورت HTML دریافت می‌کند.
     * @returns {string} محتوای ویرایشگر به فرمت HTML.
     */
    getHTML() {
        return this.element.innerHTML;
    }

    /**
     * محتوای ویرایشگر را تنظیم می‌کند.
     * @param {string} content - محتوایی که باید تنظیم شود.
     * @param {'markdown'|'html'} [format='markdown'] - فرمت محتوای ورودی.
     */
    setContent(content, format = 'markdown') {
        const html = format === 'markdown' ? this.parser.parse(content) : content;
        this.element.innerHTML = html;
        this.events.emit('contentSet');
    }
}
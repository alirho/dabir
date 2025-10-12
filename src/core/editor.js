
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
 * The main class for the Dabir editor.
 */
export class DabirEditor {
    /**
     * @param {string} selector The CSS selector for the editor element.
     * @param {object} options Configuration options for the editor.
     */
    constructor(selector, options = {}) {
        this.element = document.querySelector(selector);
        if (!this.element) {
            throw new Error(`Dabir.js: Element with selector "${selector}" not found.`);
        }

        this.options = {
            placeholder: 'اینجا بنویسید...',
            storage: { enabled: true, key: 'dabir-content' },
            plugins: [],
            ...options
        };

        this.events = new EventEmitter();
        this.storage = new Storage(this.options.storage);
        this.selection = new Selection(this);
        this.renderer = new Renderer(this);
        
        this.parser = new MarkdownParser(this);
        this.htmlParser = new HtmlParser(this);

        this.inputHandler = new InputHandler(this);
        this.keyboardHandler = new KeyboardHandler(this);
        this.mouseHandler = new MouseHandler(this);
        this.clipboardHandler = new ClipboardHandler(this);

        this.plugins = new Map();
        
        this._init();
    }

    _init() {
        this.element.classList.add('dabir-editor');
        this.element.setAttribute('contenteditable', 'true');
        this.element.setAttribute('data-placeholder', this.options.placeholder);
        
        this._loadContent();
        this._initPlugins();
        
        this.events.emit('ready');
    }

    _loadContent() {
        const savedContent = this.storage.load();
        if (savedContent) {
            this.element.innerHTML = savedContent;
        } else {
            this.element.innerHTML = '<div><br></div>';
        }
        this.events.emit('load', this);
    }
    
    saveContent() {
        const html = this.element.innerHTML;
        this.storage.save(html);
        this.events.emit('change', { html, markdown: this.getMarkdown() });
    }
    
    _initPlugins() {
        this.options.plugins.forEach(Plugin => this.use(Plugin));
    }

    /**
     * Registers and installs a plugin.
     * @param {import('../plugins/plugin.js').Plugin} Plugin The plugin class to install.
     * @param {object} options Options for the plugin.
     */
    use(Plugin, options = {}) {
        if (this.plugins.has(Plugin.name)) return;
        const pluginApi = Plugin.install(this, options);
        this.plugins.set(Plugin.name, pluginApi || {});
    }
    
    /**
     * Registers a listener for an event.
     * @param {string} event The event name.
     * @param {Function} listener The callback function.
     */
    on(event, listener) {
        this.events.on(event, listener);
    }

    /**
     * Gets the content of the editor as Markdown.
     * @returns {string}
     */
    getMarkdown() {
        return this.htmlParser.parse(this.element);
    }

    /**
     * Gets the content of the editor as HTML.
     * @returns {string}
     */
    getHTML() {
        return this.element.innerHTML;
    }

    /**
     * Sets the content of the editor.
     * @param {string} content The content to set.
     * @param {'markdown'|'html'} format The format of the content.
     */
    setContent(content, format = 'markdown') {
        const html = format === 'markdown' ? this.parser.parse(content) : content;
        this.element.innerHTML = html;
        this.events.emit('contentSet');
    }
}

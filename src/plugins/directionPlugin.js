
import Plugin from './plugin.js';

/**
 * Automatically sets the text direction (RTL/LTR) for elements.
 */
export class DirectionPlugin extends Plugin {
    /**
     * @param {import('../core/editor.js').DabirEditor} editor
     */
    static install(editor) {
        const updateAll = () => this.updateAllDirections(editor.element);
        editor.on('load', updateAll);
        editor.on('input', updateAll);
        editor.on('contentSet', updateAll);
    }

    /**
     * @param {HTMLElement} rootElement
     */
    static updateAllDirections(rootElement) {
        const elements = rootElement.querySelectorAll('div, h1, h2, h3, h4, li, th, td, blockquote, figcaption');
        elements.forEach(this.setDirection);
    }
    
    /**
     * @param {HTMLElement} element
     */
    static setDirection(element) {
        const text = element.textContent || '';
        const firstLetterMatch = text.match(/[a-zA-Z\u0600-\u06FF]/);

        if (firstLetterMatch) {
            element.dir = /[\u0600-\u06FF]/.test(firstLetterMatch[0]) ? 'rtl' : 'ltr';
        } else {
            element.dir = 'rtl'; // Default
        }
    }
}

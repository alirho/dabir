import Plugin from './plugin.js';

export class ShortcutPlugin extends Plugin {
    static install(editor) {
        const applyFormat = (prefix, suffix = prefix) => {
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount) return true;

            const range = sel.getRangeAt(0);
            const selectedText = range.toString();
            
            range.deleteContents();

            if (selectedText) {
                const textNode = document.createTextNode(`${prefix}${selectedText}${suffix}`);
                range.insertNode(textNode);
                
                // After inserting, re-select the whole new content to allow chaining formats
                range.selectNode(textNode);
                sel.removeAllRanges();
                sel.addRange(range);
            } else {
                const textNode = document.createTextNode(`${prefix}${suffix}`);
                range.insertNode(textNode);
                
                // Place cursor in the middle
                range.setStart(textNode, prefix.length);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }

            editor.saveContent();
            editor.events.emit('input');
            return true;
        };

        const createLink = () => {
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount) return true;

            const range = sel.getRangeAt(0);
            const selectedText = range.toString();
            const placeholderUrl = 'url';
            
            range.deleteContents();
            const fullText = `[${selectedText}](${placeholderUrl})`;
            const textNode = document.createTextNode(fullText);
            range.insertNode(textNode);

            const urlStartOffset = `[${selectedText}](`.length;
            const urlEndOffset = urlStartOffset + placeholderUrl.length;
            
            const newRange = document.createRange();
            newRange.setStart(textNode, urlStartOffset);
            newRange.setEnd(textNode, urlEndOffset);
            
            sel.removeAllRanges();
            sel.addRange(newRange);
            
            editor.saveContent();
            editor.events.emit('input');
            return true;
        };
        
        const shortcuts = {
            'b': () => applyFormat('**'),
            'ذ': () => applyFormat('**'),
            'i': () => applyFormat('*'),
            'ه': () => applyFormat('*'),
            'u': () => applyFormat('~~'),
            'ع': () => applyFormat('~~'),
            'k': createLink,
            'ن': createLink,
            '`': () => applyFormat('`'),
            'پ': () => applyFormat('`'),
        };

        for (const key in shortcuts) {
            editor.keyboardHandler.register(key, ['ctrl'], () => {
                return shortcuts[key]();
            });
        }
    }
}

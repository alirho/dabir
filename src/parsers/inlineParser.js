/**
 * Parses inline markdown within a string.
 * @param {string} text The text to parse.
 * @returns {string} HTML string.
 */
export function parseInline(text) {
    if (!text) return '';

    const codeBlocks = [];
    // 1. Extract, escape, and replace code blocks with placeholders to prevent
    //    parsing markdown inside them.
    let processedText = text.replace(/`([^`]+?)`/g, (match, codeContent) => {
        const placeholder = `__DABIR_CODE_PLACEHOLDER_${codeBlocks.length}__`;
        
        // Escape HTML special characters to display them as literals.
        const escapedContent = codeContent
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
            
        codeBlocks.push(escapedContent);
        return placeholder;
    });

    // 2. Process other inline elements on the remaining text.
    processedText = processedText
        // Link
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/(?<!\*)\*(.+?)\*(?!\*)/g, '<em>$1</em>')
        // Strikethrough
        .replace(/~~(.+?)~~/g, '<del>$1</del>')
        // Highlight
        .replace(/==(.+?)==/g, '<mark>$1</mark>');

    // 3. Restore the code blocks.
    processedText = processedText.replace(/__DABIR_CODE_PLACEHOLDER_(\d+)__/g, (match, index) => {
        return `<code>${codeBlocks[parseInt(index, 10)]}</code>`;
    });

    return processedText;
}

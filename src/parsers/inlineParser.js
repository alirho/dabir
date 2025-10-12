/**
 * Parses inline markdown within a string.
 * @param {string} text The text to parse.
 * @returns {string} HTML string.
 */
export function parseInline(text) {
    if (!text) return '';

    return text
        // Link
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        // Bold
        .replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/(?<!\*)\*([^\*]+)\*(?!\*)/g, '<em>$1</em>')
        // Strikethrough
        .replace(/~~([^~]+)~~/g, '<del>$1</del>')
        // Highlight
        .replace(/==([^=]+)==/g, '<mark>$1</mark>')
        // Inline Code
        .replace(/`([^`]+)`/g, '<code>$1</code>');
}
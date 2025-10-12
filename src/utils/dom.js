
/**
 * Moves the cursor to the end of a given element.
 * @param {HTMLElement} element
 */
export function moveCursorToEnd(element) {
    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false); // false means to the end

    selection.removeAllRanges();
    selection.addRange(range);
    element.focus();
}

/**
 * Gets the closest ancestor of an element matching a selector, including the element itself.
 * @param {Node} node
 * @param {string} selector
 * @returns {HTMLElement|null}
 */
export function getClosest(node, selector) {
    if (!node) return null;
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return element ? element.closest(selector) : null;
}

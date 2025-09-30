class DabirEditor {
    constructor(selector, options = {}) {
        this.element = document.querySelector(selector);
        if (!this.element) {
            throw new Error(`Dabir.js: Element with selector "${selector}" not found.`);
        }

        this.options = {
            placeholder: 'اینجا بنویسید...',
            storageKey: 'dabir-content',
            ...options
        };

        this.activeRawNode = null;
        this.ignoreSelectionChange = false;
        this.lastRange = null;

        this._init();
    }

    _init() {
        this.element.classList.add('dabir-editor');
        this.element.setAttribute('contenteditable', 'true');
        this.element.setAttribute('data-placeholder', this.options.placeholder);

        this._loadContent();
        this._attachEventListeners();
    }

    _loadContent() {
        const savedContent = localStorage.getItem(this.options.storageKey);
        if (savedContent) {
            this.element.innerHTML = savedContent;
        }
        this.updateAllDirections();
    }

    _saveContent() {
        if (!this.activeRawNode) {
            localStorage.setItem(this.options.storageKey, this.element.innerHTML);
        }
    }

    _detectAndSetDirection(element) {
        const text = element.textContent;
        const firstLetterMatch = text.match(/[a-zA-Z\u0600-\u06FF]/);

        if (firstLetterMatch) {
            if (/[\u0600-\u06FF]/.test(firstLetterMatch[0])) {
                element.dir = 'rtl';
            } else {
                element.dir = 'ltr';
            }
        } else {
            element.dir = 'rtl';
        }
    }

    updateAllDirections() {
        const lineElements = this.element.querySelectorAll('div, h1, h2, h3, h4, li, th, td, blockquote, figcaption');
        lineElements.forEach(this._detectAndSetDirection);
    }

    _elementToRawMarkdown(el) {
        const text = el.textContent;
        switch (el.tagName) {
            case 'STRONG': return `**${text}**`;
            case 'EM':     return `*${text}*`;
            case 'DEL':    return `~~${text}~~`;
            case 'CODE':   return `\`${text}\``;
            case 'A':      return `[${text}](${el.getAttribute('href')})`;
            case 'H1':     return `# ${text}`;
            case 'H2':     return `## ${text}`;
            case 'H3':     return `### ${text}`;
            case 'H4':     return `#### ${text}`;
            case 'FIGURE': {
                const img = el.querySelector('img');
                const figcaption = el.querySelector('figcaption');
                const alt = figcaption ? figcaption.textContent : (img ? img.alt : '');
                const src = img ? img.src : '';
                return `![${alt}](${src})`;
            }
            case 'BLOCKQUOTE': {
                return Array.from(el.children)
                            .map(child => `> ${child.textContent}`)
                            .join('\n');
            }
            default:       return text;
        }
    }

    _parseInlineMarkdown(text) {
        if (!text) return '';
        let escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        escapedText = escapedText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        escapedText = escapedText.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
        escapedText = escapedText.replace(/~~([^~]+)~~/g, '<del>$1</del>');
        escapedText = escapedText.replace(/`([^`]+)`/g, '<code>$1</code>');
        escapedText = escapedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
            return `<a href="${url.replace(/"/g, '&quot;')}" target="_blank">${linkText}</a>`;
        });
        
        return escapedText;
    }

    _renderRawMarkdownNode(textNode, moveCursor = true) {
        if (!textNode || textNode.nodeType !== Node.TEXT_NODE || !textNode.parentElement) return null;

        const text = textNode.textContent;
        const parent = textNode.parentElement;
        let match;
        let newNode = null;
        let isBlock = false;

        const isTopLevelBlock = (parent.tagName === 'DIV' && parent.parentElement === this.element) || parent === this.element;
        if (isTopLevelBlock) {
            if ((match = text.match(/^(#{1,4}) ([^\n]+?)$/))) {
                const level = match[1].length;
                newNode = document.createElement(`h${level}`);
                newNode.textContent = match[2];
                isBlock = true;
            } else if ((match = text.match(/^!\[([^\]]*)\]\(([^)]+)\)$/))) {
                const altText = match[1];
                const imageUrl = match[2];
                newNode = document.createElement('figure');
                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = altText;
                newNode.appendChild(img);
                if (altText) {
                    const figcaption = document.createElement('figcaption');
                    figcaption.textContent = altText;
                    newNode.appendChild(figcaption);
                }
                isBlock = true;
            } else if (text.startsWith('> ')) {
                const lines = text.split('\n').filter(line => line.startsWith('> '));
                if (lines.length > 0 && lines.every(line => line.startsWith('> '))) {
                    newNode = document.createElement('blockquote');
                    lines.forEach(line => {
                        const lineDiv = document.createElement('div');
                        const content = line.substring(2);
                        if (content) {
                            lineDiv.innerHTML = this._parseInlineMarkdown(content);
                        } else {
                            lineDiv.appendChild(document.createElement('br'));
                        }
                        newNode.appendChild(lineDiv);
                    });
                    isBlock = true;
                }
            }
        }
        
        if (!isBlock) {
            if ((match = text.match(/^\*\*([^*]+)\*\*$/))) {
                newNode = document.createElement('strong');
                newNode.textContent = match[1];
            } else if ((match = text.match(/^\*([^*]+)\*$/))) {
                newNode = document.createElement('em');
                newNode.textContent = match[1];
            } else if ((match = text.match(/^~~([^~]+)~~$/))) {
                newNode = document.createElement('del');
                newNode.textContent = match[1];
            } else if ((match = text.match(/^`([^`]+)`$/))) {
                newNode = document.createElement('code');
                newNode.textContent = match[1];
            } else if ((match = text.match(/^\[([^\]]+)\]\(([^)]+)\)$/))) {
                newNode = document.createElement('a');
                newNode.textContent = match[1];
                newNode.href = match[2];
                newNode.target = '_blank';
            }
        }

        if (newNode) {
            const elementToReplace = isBlock ? (parent === this.element ? textNode : parent) : textNode;
            elementToReplace.replaceWith(newNode);

            if (moveCursor) {
                const selection = window.getSelection();
                if (isBlock) {
                    this._moveCursorToEnd(newNode, selection);
                } else {
                    const range = document.createRange();
                    range.setStartAfter(newNode);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
            
            this._saveContent();
            return newNode;
        }
        return null;
    }

    _revealMarkdown(element) {
        if (this.activeRawNode) {
            this._renderActiveNode();
        }

        const rawText = this._elementToRawMarkdown(element);
        const textNode = document.createTextNode(rawText);
        
        const isBlock = ['H1', 'H2', 'H3', 'H4', 'FIGURE', 'BLOCKQUOTE'].includes(element.tagName);
        if (isBlock) {
            const newDiv = document.createElement('div');
            newDiv.appendChild(textNode);
            element.replaceWith(newDiv);
        } else {
            element.replaceWith(textNode);
        }
        this.activeRawNode = textNode;

        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(textNode);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    _renderActiveNode() {
        if (!this.activeRawNode) return;
        
        this.ignoreSelectionChange = true;
        
        const nodeToRender = this.activeRawNode;
        this.activeRawNode = null; 
        this._renderRawMarkdownNode(nodeToRender);

        setTimeout(() => { this.ignoreSelectionChange = false; }, 0);
    }
    
    _scanAndRenderAllInlineMarkdown(textNode) {
        if (!textNode || textNode.nodeType !== Node.TEXT_NODE || !textNode.parentElement) return;
        if (textNode.parentElement.closest('a, strong, em, del, code, pre, h1, h2, h3, h4')) return;

        const text = textNode.textContent;

        const patterns = [
            { 
                regex: /(?<!`|!\[[^\]]*\]\([^)]*\))\[([^\]]+)\]\(([^)]+)\)/, 
                createFn: (m) => { const a = document.createElement('a'); a.href = m[2]; a.textContent = m[1]; a.target = '_blank'; return a; }
            },
            { 
                regex: /\*\*([^\*]+)\*\*/, 
                createFn: (m) => { const strong = document.createElement('strong'); strong.textContent = m[1]; return strong; }
            },
            { 
                regex: /(?<!\*)\*([^\*]+)\*(?!\*)/, 
                createFn: (m) => { const em = document.createElement('em'); em.textContent = m[1]; return em; }
            },
            { 
                regex: /~~([^~]+)~~/, 
                createFn: (m) => { const del = document.createElement('del'); del.textContent = m[1]; return del; }
            },
            { 
                regex: /`([^`]+)`/, 
                createFn: (m) => { const code = document.createElement('code'); code.textContent = m[1]; return code; }
            },
        ];

        for (const { regex, createFn } of patterns) {
            const match = text.match(regex);
            if (match) {
                const newElement = createFn(match);
                const selection = window.getSelection();
                const currentRange = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;

                const range = document.createRange();
                range.setStart(textNode, match.index);
                range.setEnd(textNode, match.index + match[0].length);
                range.deleteContents();
                range.insertNode(newElement);

                if (currentRange && currentRange.startContainer === textNode) {
                    const offset = currentRange.startOffset;
                    if (offset > match.index) {
                        const newOffset = offset - match[0].length + 1;
                        const newRange = document.createRange();
                        newRange.setStart(newElement.firstChild || newElement, Math.max(0, newOffset));
                        newRange.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                    }
                }

                this._scanAndRenderAllInlineMarkdown(textNode);
                if (newElement.nextSibling && newElement.nextSibling.nodeType === Node.TEXT_NODE) {
                    this._scanAndRenderAllInlineMarkdown(newElement.nextSibling);
                }
                
                return;
            }
        }
    }

    _handleEnterKeyMarkdown(e, selection, parentElement) {
        const parentOfParent = parentElement.parentElement;
        if (parentOfParent !== this.element && parentOfParent.tagName !== 'BLOCKQUOTE') {
            return false;
        }
        
        const text = parentElement.textContent;
        let match;

        if (text.trim() === '---') {
            e.preventDefault();
            const hr = document.createElement('hr');
            parentElement.replaceWith(hr);
            
            const newPara = document.createElement('div');
            newPara.innerHTML = '<br>';
            hr.after(newPara);
            this._moveCursorToEnd(newPara, selection);
            return true;
        }

        if ((match = text.match(/^(#{1,4}) ([^\n]+?)$/))) {
            e.preventDefault();
            const level = match[1].length;
            const content = match[2];
            const newHeading = document.createElement(`h${level}`);
            newHeading.textContent = content;
            parentElement.replaceWith(newHeading);
            
            const newPara = document.createElement('div');
            newPara.innerHTML = '<br>';
            newHeading.after(newPara);
            this._moveCursorToEnd(newPara, selection);
            return true;
        }
        
        if ((match = text.match(/^> ([^\n]*?)$/))) {
            e.preventDefault();
            const content = match[1];
            const newQuote = document.createElement('blockquote');
            const line = document.createElement('div');
            if (content === '') {
                line.appendChild(document.createElement('br'));
            } else {
                line.innerHTML = this._parseInlineMarkdown(content);
            }
            newQuote.appendChild(line);
            parentElement.replaceWith(newQuote);
            
            const newPara = document.createElement('div');
            newPara.innerHTML = '<br>';
            newQuote.after(newPara);
            this._moveCursorToEnd(newPara, selection);
            return true;
        }

        if ((match = text.match(/^(\d+)\.\s([^\n]*?)$/))) {
            e.preventDefault();
            const content = match[2];
            const ol = document.createElement('ol');
            const li = document.createElement('li');
            const startNum = parseInt(match[1], 10);
            if (startNum > 1) {
                ol.setAttribute('start', startNum);
            }
            li.textContent = content || '';
            ol.appendChild(li);
            parentElement.replaceWith(ol);
            this._moveCursorToEnd(li, selection);
            return true;
        }

        if ((match = text.match(/^([*-])\s([^\n]*?)$/))) {
            e.preventDefault();
            const content = match[2];
            const ul = document.createElement('ul');
            const li = document.createElement('li');
            li.textContent = content || '';
            ul.appendChild(li);
            parentElement.replaceWith(ul);
            this._moveCursorToEnd(li, selection);
            return true;
        }

        const textNode = parentElement.lastChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            const nodeText = textNode.textContent;

            const replaceAndBreak = (regex, createFn) => {
                const match = nodeText.match(regex);
                if (match) {
                    e.preventDefault();
                    const range = document.createRange();
                    range.setStart(textNode, match.index);
                    range.setEnd(textNode, match.index + match[0].length);
                    range.deleteContents();
                    const newElement = createFn(match);
                    if (!newElement) return false;
                    range.insertNode(newElement);

                    const newPara = document.createElement('div');
                    newPara.innerHTML = '<br>';
                    parentElement.after(newPara);
                    this._moveCursorToEnd(newPara, selection);
                    return true;
                }
                return false;
            };

            if (replaceAndBreak(/`([^`]+)`$/, (m) => { const code = document.createElement('code'); code.textContent = m[1]; return code; })) {
                return true;
            } else if (replaceAndBreak(/\[([^\]]+)\]\(([^)]+)\)$/, (m) => {
                const fullText = textNode.textContent;
                const matchIndex = fullText.lastIndexOf(m[0]);
                if (matchIndex === -1 || fullText.charAt(matchIndex - 1) === '!') {
                    return null;
                }
                const a = document.createElement('a'); a.href = m[2]; a.textContent = m[1]; a.target = '_blank'; return a;
            })) {
                return true;
            } else if (replaceAndBreak(/\*\*([^*]+)\*\*$/, (m) => { const strong = document.createElement('strong'); strong.textContent = m[1]; return strong; })) {
                return true;
            } else if (replaceAndBreak(/\*([^*]+)\*$/, (m) => { const em = document.createElement('em'); em.textContent = m[1]; return em; })) {
                return true;
            } else if (replaceAndBreak(/~~([^~]+)~~$/, (m) => { const del = document.createElement('del'); del.textContent = m[1]; return del; })) {
                return true;
            }
        }

        return false;
    }

    _createChecklistItem(content, isChecked) {
        const li = document.createElement('li');
        li.className = 'checklist-item';
        if (isChecked) {
            li.classList.add('checked');
        }
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isChecked;
        li.appendChild(checkbox);
        const textNode = document.createTextNode(content || '');
        li.appendChild(textNode);
        if (content === '') {
            li.appendChild(document.createElement('br'));
        }
        return li;
    }

    _moveCursorToEnd(element, selection) {
        const range = document.createRange();
        if (element.firstChild && element.firstChild.nodeName === 'BR' && element.childNodes.length === 1) {
            range.setStart(element, 0);
        } else {
            range.selectNodeContents(element);
            range.collapse(false);
        }
        selection.removeAllRanges();
        selection.addRange(range);
        element.focus();
    }

    _replaceMarkdown(textNode, match, createFn) {
        if (textNode.parentElement.closest('a, strong, em, del, h1, h2, h3, h4, code, pre')) return;
        const range = document.createRange();
        range.setStart(textNode, match.index);
        range.setEnd(textNode, match.index + match[0].length - 1);
        range.deleteContents();
        const newElement = createFn(match);
        range.insertNode(newElement);
        range.setStartAfter(newElement);
        range.collapse(true);
        const spaceNode = document.createTextNode('\u00A0');
        range.insertNode(spaceNode);
        range.setStartAfter(spaceNode);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        this._saveContent();
    }
    
    _processTableBlock(lines, startIndex, parseInline) {
        const headerLine = lines[startIndex];
        if (!headerLine.includes('|')) return null;

        const separatorLine = lines[startIndex + 1];
        if (!separatorLine || !separatorLine.match(/^\|(?:\s*:?-+:?\s*\|)+$/)) return null;
        
        const headers = headerLine.split('|').slice(1, -1).map(h => h.trim());
        if (headers.length === 0) return null;

        const aligners = separatorLine.split('|').slice(1, -1).map(s => s.trim());
        const alignments = aligners.map(aligner => {
            const startsWithColon = aligner.startsWith(':');
            const endsWithColon = aligner.endsWith(':');
            if (startsWithColon && endsWithColon) return 'center';
            if (endsWithColon) return 'left';
            if (startsWithColon) return 'right';
            return '';
        });

        let html = `<table data-alignments='${JSON.stringify(alignments)}'>`;
        html += '<thead><tr>';
        headers.forEach((headerText, index) => {
            const alignStyle = alignments[index] ? ` style="text-align: ${alignments[index]}"` : '';
            html += `<th${alignStyle}>${parseInline(headerText)}</th>`;
        });
        html += '</tr></thead>';

        html += '<tbody>';
        let i = startIndex + 2;
        while(i < lines.length && lines[i].includes('|')) {
            const cells = lines[i].split('|').slice(1, -1);
            html += '<tr>';
            for (let j = 0; j < headers.length; j++) {
                const cellText = (cells[j] || '').trim();
                const alignStyle = alignments[j] ? ` style="text-align: ${alignments[j]}"` : '';
                html += `<td${alignStyle}>${parseInline(cellText) || '<br>'}</td>`;
            }
            html += '</tr>';
            i++;
        }
        html += '</tbody></table>';

        return { html, lastIndex: i - 1 };
    }

    _processListBlock(lines, startIndex, parseInline) {
        let html = '';
        let i = startIndex;
        const listStack = []; // { type: 'ul'/'ol', indent: number }

        const getIndent = (line) => line.match(/^\s*/)[0].length;
        
        while(i < lines.length) {
            const line = lines[i];
            const trimmedLine = line.trim();
            const match = trimmedLine.match(/^([-*]|\d+\.) (.*)/);

            if (!match) break;
            
            const indent = getIndent(line);
            
            while (listStack.length > 0 && indent < listStack[listStack.length - 1].indent) {
                html += `</${listStack.pop().type}>`;
            }
            
            const listMarker = match[1];
            let itemContent = match[2];
            const type = (listMarker === '-' || listMarker === '*') ? 'ul' : 'ol';
            
            const isChecklist = itemContent.startsWith('[ ] ') || itemContent.startsWith('[x] ') || itemContent.startsWith('[X] ');

            if (listStack.length === 0 || indent > listStack[listStack.length - 1].indent) {
                html += `<${type}${isChecklist && type === 'ul' ? ' class="checklist"' : ''}>`;
                listStack.push({ type, indent });
            } else if (type !== listStack[listStack.length - 1].type) {
                html += `</${listStack.pop().type}>`;
                html += `<${type}${isChecklist && type === 'ul' ? ' class="checklist"' : ''}>`;
                listStack.push({ type, indent });
            }
            
            if (isChecklist) {
                const isChecked = itemContent[1].toLowerCase() === 'x';
                itemContent = itemContent.substring(4);
                html += `<li class="checklist-item ${isChecked ? 'checked' : ''}"><input type="checkbox" ${isChecked ? 'checked' : ''}>${parseInline(itemContent)}</li>`;
            } else {
                html += `<li>${parseInline(itemContent)}</li>`;
            }
            
            i++;
        }

        while(listStack.length > 0) {
            html += `</${listStack.pop().type}>`;
        }
        
        return { html, lastIndex: i - 1 };
    }

    _markdownToHtml(markdown) {
        const lines = markdown.split('\n');
        let html = '';
        let inCodeBlock = false;
        let codeLang = '';
        let currentParagraphLines = [];

        const parseInline = (text) => {
            let escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            
            escapedText = escapedText.replace(/(!?)\[([^\]]+)\]\(([^)]+)\)/g, (match, prefix, linkText, url) => {
                if (prefix === '!') {
                    return match; 
                }
                return `<a href="${url.replace(/"/g, '&quot;')}" target="_blank">${linkText}</a>`;
            });

            return escapedText
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                .replace(/~~([^~]+)~~/g, '<del>$1</del>')
                .replace(/`([^`]+)`/g, '<code>$1</code>');
        };

        const flushParagraph = () => {
            if (currentParagraphLines.length > 0) {
                html += currentParagraphLines.map(p_line => `<div>${parseInline(p_line)}</div>`).join('');
                currentParagraphLines = [];
            }
        };
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];

            if (inCodeBlock) {
                if (line.trim() === '```') {
                    html += '</code></pre>';
                    inCodeBlock = false;
                } else {
                    html += line.replace(/</g, "&lt;").replace(/>/g, "&gt;") + '\n';
                }
                continue;
            }

            if (line.trim().startsWith('```')) {
                flushParagraph();
                inCodeBlock = true;
                codeLang = line.trim().substring(3);
                html += `<pre><code class="language-${codeLang}">`;
                continue;
            }

            if (line.trim() === '---') {
                flushParagraph();
                html += '<hr>';
                continue;
            }
            
            let match = line.match(/^(#{1,4}) (.*)/);
            if (match) {
                flushParagraph();
                const level = match[1].length;
                const content = parseInline(match[2]);
                html += `<h${level}>${content}</h${level}>`;
                continue;
            }

            if (line.startsWith('> ')) {
                flushParagraph();
                html += '<blockquote>';
                while (i < lines.length && lines[i].startsWith('> ')) {
                    const content = parseInline(lines[i].substring(2));
                    html += `<div>${content || '<br>'}</div>`;
                    i++;
                }
                html += '</blockquote>';
                i--;
                continue;
            }
            
            if (/^(\s*[-*]|\s*\d+\.) /.test(line)) {
                flushParagraph();
                const listResult = this._processListBlock(lines, i, parseInline);
                html += listResult.html;
                i = listResult.lastIndex;
                continue;
            }
            
            if (line.includes('|') && i + 1 < lines.length && lines[i+1].includes('|')) {
                const tableResult = this._processTableBlock(lines, i, parseInline);
                if (tableResult) {
                    flushParagraph();
                    html += tableResult.html;
                    i = tableResult.lastIndex;
                    continue;
                }
            }
            
            match = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
            if (match) {
                flushParagraph();
                const alt = match[1];
                const src = match[2];
                html += `<figure><img src="${src}" alt="${alt}"><figcaption>${alt}</figcaption></figure>`;
                continue;
            }

            if (line.trim() === '') {
                flushParagraph();
                html += '<div><br></div>';
            } else {
                currentParagraphLines.push(line);
            }
        }
        
        flushParagraph();
        return html;
    }

    _getMarkdownFromSelection() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return '';

        const range = selection.getRangeAt(0);
        const container = document.createElement('div');
        container.appendChild(range.cloneContents());

        function convertNode(node, listState = {}) {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent;
            }

            if (node.nodeType !== Node.ELEMENT_NODE) {
                return '';
            }

            let childMarkdown = Array.from(node.childNodes)
                                    .map(child => convertNode(child, listState))
                                    .join('');
            
            switch (node.tagName) {
                case 'HR': return '\n---\n\n';
                case 'H1': return `# ${childMarkdown}\n\n`;
                case 'H2': return `## ${childMarkdown}\n\n`;
                case 'H3': return `### ${childMarkdown}\n\n`;
                case 'H4': return `#### ${childMarkdown}\n\n`;
                case 'STRONG': return `**${childMarkdown}**`;
                case 'EM': return `*${childMarkdown}*`;
                case 'DEL': return `~~${childMarkdown}~~`;
                case 'CODE': return node.closest('pre') ? childMarkdown : `\`${childMarkdown}\``;
                case 'A': return `[${childMarkdown}](${node.href})`;
                case 'BR': return '\n';
                case 'DIV': 
                case 'P':
                    return `${childMarkdown}${node.parentElement === container ? '\n\n' : ''}`;
                case 'FIGURE': {
                    const img = node.querySelector('img');
                    const figcaption = node.querySelector('figcaption');
                    const alt = figcaption ? figcaption.textContent : (img ? img.alt : '');
                    const src = img ? img.src : '';
                    return `![${alt}](${src})\n\n`;
                }
                case 'BLOCKQUOTE': {
                    const lines = childMarkdown.trim().split('\n');
                    return lines.map(line => `> ${line}`).join('\n') + '\n\n';
                }
                case 'PRE': {
                    const codeNode = node.querySelector('code');
                    const langMatch = codeNode ? codeNode.className.match(/language-(\w+)/) : null;
                    const lang = langMatch ? langMatch[1] : '';
                    const code = codeNode ? codeNode.innerText : node.innerText;
                    return `\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
                }
                case 'TABLE': {
                    let tableMd = '';
                    const headRows = Array.from(node.querySelectorAll('thead tr'));
                    const bodyRows = Array.from(node.querySelectorAll('tbody tr'));
                    const colCount = headRows.length > 0 ? headRows[0].cells.length : (bodyRows.length > 0 ? bodyRows[0].cells.length : 0);

                    if (colCount > 0 && headRows.length > 0) {
                        const headers = Array.from(headRows[0].cells).map(cell => cell.textContent.trim());
                        tableMd += `| ${headers.join(' | ')} |\n`;
                        const alignments = JSON.parse(node.dataset.alignments || '[]');
                        const separator = Array.from({ length: colCount }).map((_, i) => {
                            const align = alignments[i] || '';
                            if (align === 'center') return ':---:';
                            if (align === 'right') return '---:';
                            if (align === 'left') return ':---';
                            return '---';
                        });
                        tableMd += `| ${separator.join(' | ')} |\n`;
                    }

                    bodyRows.forEach(row => {
                        const cells = Array.from(row.cells).map(cell => cell.textContent.trim());
                        tableMd += `| ${cells.join(' | ')} |\n`;
                    });
                    return tableMd ? tableMd + '\n' : '';
                }
                case 'UL':
                case 'OL': {
                    const level = (listState.level || 0) + 1;
                    let counter = node.tagName === 'OL' ? (parseInt(node.getAttribute('start'), 10) || 1) : 0;
                    return Array.from(node.children).map(li => {
                        const md = convertNode(li, { type: node.tagName, level, counter });
                        if (counter > 0) counter++;
                        return md;
                    }).join('');
                }
                case 'LI': {
                    const indent = '    '.repeat((listState.level || 1) - 1);
                    let prefix;
                    if (node.classList.contains('checklist-item')) {
                        const isChecked = node.classList.contains('checked');
                        prefix = `${indent}- [${isChecked ? 'x' : ' '}] `;
                    } else if (listState.type === 'OL') {
                        prefix = `${indent}${listState.counter}. `;
                    } else {
                        prefix = `${indent}- `;
                    }
                    let content = '', nestedListContent = '';
                    node.childNodes.forEach(child => {
                        if (child.nodeName === 'UL' || child.nodeName === 'OL') {
                            nestedListContent += convertNode(child, listState);
                        } else {
                            content += convertNode(child, listState);
                        }
                    });
                    return `${prefix}${content.trim()}\n${nestedListContent}`;
                }
                default: return childMarkdown;
            }
        }

        let markdown = convertNode(container);
        markdown = markdown.split('\n').map(line => line.trimEnd()).join('\n');
        return markdown.trim();
    }
    
    _attachEventListeners() {
        this.element.addEventListener('input', () => {
            this._saveContent();
            this.updateAllDirections();
        });

        document.addEventListener('selectionchange', () => {
            if (this.ignoreSelectionChange) return;

            const selection = window.getSelection();
            if (!selection.rangeCount) return;

            const newRange = selection.getRangeAt(0);
            const container = newRange.startContainer;

            const previousRange = this.lastRange;
            if (previousRange &&
                previousRange.startContainer !== container &&
                previousRange.startContainer.nodeType === Node.TEXT_NODE &&
                this.element.contains(previousRange.startContainer)) {

                const nodeToScan = previousRange.startContainer;
                if (nodeToScan && document.body.contains(nodeToScan)) {
                    this._scanAndRenderAllInlineMarkdown(nodeToScan);
                }
            }
            
            if (newRange.isCollapsed && container.nodeType === Node.TEXT_NODE && this.element.contains(container)) {
                if (!container.parentElement.closest('a, strong, em, del, code')) {
                    const text = container.textContent;
                    const offset = newRange.startOffset;
                    const allPatternsRegex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(~~([^~]+)~~)|(`([^`]+)`)|(?!`|!\[[^\]]*\]\([^)]*\))\[([^\]]+)\]\(([^)]+)\)/g;

                    let match;
                    let cursorIsInAPattern = false;
                    while ((match = allPatternsRegex.exec(text)) !== null) {
                        const startIndex = match.index;
                        const endIndex = match.index + match[0].length;
                        if (offset > startIndex && offset < endIndex) {
                            cursorIsInAPattern = true;
                            break;
                        }
                    }

                    if (!cursorIsInAPattern) {
                        // We must check if there is a pattern to prevent re-rendering on every cursor move in plain text
                        const hasPattern = allPatternsRegex.test(text);
                        allPatternsRegex.lastIndex = 0; // Reset regex state after test()
                        if(hasPattern) {
                            this._scanAndRenderAllInlineMarkdown(container);
                        }
                    }
                }
            }

            if (this.activeRawNode && container !== this.activeRawNode) {
                this._renderActiveNode();
            } else if (selection.isCollapsed && !this.activeRawNode) {
                const parentElement = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
                const elementToReveal = parentElement.closest('strong, em, del, code, a, h1, h2, h3, h4, figure, blockquote');
                if (elementToReveal && !elementToReveal.closest('pre, table, li')) {
                    this.ignoreSelectionChange = true;
                    this._revealMarkdown(elementToReveal);
                    setTimeout(() => { this.ignoreSelectionChange = false; }, 0);
                }
            }

            this.lastRange = newRange.cloneRange();
        });


        this.element.addEventListener('click', (e) => {
            const target = e.target;
            
            const link = target.closest('a');
            if (link && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                window.open(link.href, '_blank');
                return;
            }
            
            if (target.tagName === 'INPUT' && target.type === 'checkbox') {
                const checklistItem = target.closest('li.checklist-item');
                if (checklistItem) {
                    setTimeout(() => {
                        const isChecked = target.checked;
                        checklistItem.classList.toggle('checked', isChecked);

                        const childItems = checklistItem.querySelectorAll('li.checklist-item');
                        childItems.forEach(item => {
                            item.classList.toggle('checked', isChecked);
                            const childCheckbox = item.querySelector('input[type="checkbox"]');
                            if (childCheckbox) {
                                childCheckbox.checked = isChecked;
                            }
                        });

                        this._saveContent();
                    }, 0);
                }
            }
        });

        this.element.addEventListener('keydown', (e) => {
            if (this.activeRawNode && e.key === 'Escape') {
                e.preventDefault();
                this._renderActiveNode();
                return;
            }
            
            const selection = window.getSelection();
            if (!selection.rangeCount) return;

            const range = selection.getRangeAt(0);
            const parentElement = selection.anchorNode.nodeType === 3 ?
                selection.anchorNode.parentElement :
                selection.anchorNode;

            const listItem = parentElement.closest('li');
            if (listItem && e.key === 'Tab') {
                e.preventDefault();
                if (e.shiftKey) {
                    const parentList = listItem.parentElement;
                    const parentLi = parentList.parentElement.closest('li');
                    if (parentLi) {
                        parentLi.after(listItem);
                        if (parentList.children.length === 0) {
                            parentList.remove();
                        }
                        this._moveCursorToEnd(listItem, selection);
                        this._saveContent();
                    }
                } else {
                    const previousLi = listItem.previousElementSibling;
                    if (previousLi) {
                        let depth = 0;
                        let el = listItem;
                        while ((el = el.closest('ul, ol')?.parentElement?.closest('li'))) {
                            depth++;
                        }
                        
                        const parentListTag = listItem.parentElement.tagName;
                        const maxDepth = parentListTag === 'OL' ? 3 : 4;

                        if (depth < maxDepth) {
                            let sublist = previousLi.querySelector('ul, ol');
                            if (!sublist) {
                                sublist = document.createElement(parentListTag);
                                if (listItem.classList.contains('checklist-item')) {
                                    sublist.classList.add('checklist');
                                }
                                previousLi.appendChild(sublist);
                            }
                            sublist.appendChild(listItem);
                            this._moveCursorToEnd(listItem, selection);
                            this._saveContent();
                        }
                    }
                }
                return;
            }
            
            const checklistItem = parentElement.closest('li.checklist-item');
            if (e.key === 'Backspace' && selection.isCollapsed && checklistItem && checklistItem.textContent.trim() === '') {
                if ((range.startContainer === checklistItem && range.startOffset <= 1) || (range.startContainer.parentElement === checklistItem && range.startOffset === 0)) {
                    e.preventDefault();
                    
                    const parentList = checklistItem.parentElement;
                    const previousItem = checklistItem.previousElementSibling;

                    if (previousItem) {
                        checklistItem.remove();
                        this._moveCursorToEnd(previousItem, selection);
                    } else {
                        const newPara = document.createElement('div');
                        newPara.innerHTML = '<br>';
                        
                        const parentLi = parentList.parentElement.closest('li');
                        if(parentLi) {
                            parentList.remove();
                            this._moveCursorToEnd(parentLi, selection);
                        } else {
                            parentList.before(newPara);
                             if (parentList.children.length === 1) {
                                parentList.remove();
                            }
                            checklistItem.remove();
                            this._moveCursorToEnd(newPara, selection);
                        }
                    }
                    
                    this._saveContent();
                    return;
                }
            }

            const tableCell = parentElement.closest('th, td');
            if (tableCell) {
                const currentRow = tableCell.parentElement;

                if (e.key === 'Backspace' &&
                    selection.isCollapsed &&
                    range.startOffset === 0 &&
                    tableCell === currentRow.cells[0]) {

                    const isRowEmpty = Array.from(currentRow.cells).every(cell => cell.textContent.trim() === '');

                    if (isRowEmpty) {
                        e.preventDefault();
                        
                        const table = tableCell.closest('table');
                        const isHeaderRow = currentRow.parentElement.tagName === 'THEAD';

                        const previousRow = currentRow.previousElementSibling;
                        const nextRow = currentRow.nextElementSibling;
                        const firstBodyRow = table.tBodies[0]?.rows[0];
                        const lastHeaderRow = table.tHead?.rows[table.tHead.rows.length - 1];

                        const parentContainer = currentRow.parentElement;
                        currentRow.remove();
                        if (parentContainer.rows.length === 0) {
                            parentContainer.remove();
                        }

                        if (table.rows.length === 0) {
                            const newPara = document.createElement('div');
                            newPara.innerHTML = '<br>';
                            table.after(newPara);
                            table.remove();
                            this._moveCursorToEnd(newPara, selection);
                        } else if (isHeaderRow) {
                            if (firstBodyRow) {
                                this._moveCursorToEnd(firstBodyRow.cells[0], selection);
                            }
                        } else { 
                            if (previousRow) {
                                this._moveCursorToEnd(previousRow.cells[previousRow.cells.length - 1], selection);
                            } else if (nextRow) {
                                this._moveCursorToEnd(nextRow.cells[0], selection);
                            } else if (lastHeaderRow) {
                                this._moveCursorToEnd(lastHeaderRow.cells[lastHeaderRow.cells.length - 1], selection);
                            }
                        }
                        
                        this._saveContent();
                        return;
                    }
                }

                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (currentRow.parentElement.tagName === 'TBODY' &&
                        !currentRow.nextElementSibling &&
                        Array.from(currentRow.cells).every(cell => cell.textContent.trim() === '')) {
                        const table = tableCell.closest('table');
                        const newPara = document.createElement('div');
                        newPara.innerHTML = '<br>';
                        table.after(newPara);
                        currentRow.remove();
                        this._moveCursorToEnd(newPara, selection);
                    } else {
                        const table = tableCell.closest('table');
                        const alignments = JSON.parse(table.dataset.alignments || '[]');
                        const newRow = currentRow.parentElement.insertRow(currentRow.rowIndex);
                        for (let i = 0; i < currentRow.cells.length; i++) {
                            const cell = newRow.insertCell(i);
                            cell.appendChild(document.createElement('br'));
                            if (alignments[i]) {
                                cell.style.textAlign = alignments[i];
                            }
                        }
                        this._moveCursorToEnd(newRow.cells[0], selection);
                    }
                    this._saveContent();
                    return;
                }

                if (e.key === 'Tab') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        let prevCell = tableCell.previousElementSibling;
                        if (prevCell) {
                            this._moveCursorToEnd(prevCell, selection);
                        } else {
                            const prevRow = currentRow.previousElementSibling;
                            if (prevRow) {
                                this._moveCursorToEnd(prevRow.cells[prevRow.cells.length - 1], selection);
                            }
                        }
                    } else {
                        let nextCell = tableCell.nextElementSibling;
                        if (nextCell) {
                            this._moveCursorToEnd(nextCell, selection);
                        } else {
                            const table = tableCell.closest('table');
                            const alignments = JSON.parse(table.dataset.alignments || '[]');
                            
                            const lastAlignment = alignments.length > 0 ? alignments[alignments.length - 1] : '';
                            alignments.push(lastAlignment);
                            table.dataset.alignments = JSON.stringify(alignments);

                            const newColumnIndex = alignments.length - 1;
                            const newAlignment = alignments[newColumnIndex];
                            let newCellToFocus;

                            if (table.tHead) {
                                for (const row of table.tHead.rows) {
                                    const newTh = document.createElement('th');
                                    newTh.appendChild(document.createElement('br'));
                                    if (newAlignment) {
                                        newTh.style.textAlign = newAlignment;
                                    }
                                    row.appendChild(newTh);
                                    if (row === currentRow) {
                                        newCellToFocus = newTh;
                                    }
                                }
                            }

                            if (table.tBodies.length > 0) {
                                for (const row of table.tBodies[0].rows) {
                                    const newTd = document.createElement('td');
                                    newTd.appendChild(document.createElement('br'));
                                    if (newAlignment) {
                                        newTd.style.textAlign = newAlignment;
                                    }
                                    row.appendChild(newTd);
                                    if (row === currentRow) {
                                        newCellToFocus = newTd;
                                    }
                                }
                            }

                            if (newCellToFocus) {
                                this._moveCursorToEnd(newCellToFocus, selection);
                            }
                            this._saveContent();
                        }
                    }
                    return;
                }
            }

            if (e.key === 'Enter') {
                const handled = this._handleEnterKeyMarkdown(e, selection, parentElement);
                if (handled) {
                    this._saveContent();
                    return;
                }

                const pre = parentElement.closest('pre');
                if (pre) {
                    if (selection.isCollapsed) {
                        const range = selection.getRangeAt(0);
                        const testRange = range.cloneRange();
                        testRange.selectNodeContents(pre);
                        testRange.setStart(range.endContainer, range.endOffset);
                        const isAtEnd = testRange.toString().trim() === '';

                        const text = pre.innerText;

                        if (isAtEnd && text.endsWith('\n')) {
                            e.preventDefault();

                            const code = pre.querySelector('code');
                            if (code) {
                                const lastChild = code.lastChild;
                                if (lastChild) {
                                    if (lastChild.nodeName === 'BR') {
                                        lastChild.remove();
                                    } else if (lastChild.nodeType === Node.TEXT_NODE && lastChild.textContent.endsWith('\n')) {
                                        lastChild.textContent = lastChild.textContent.slice(0, -1);
                                        if (lastChild.textContent.length === 0) {
                                            lastChild.remove();
                                        }
                                    }
                                }
                            }
                            
                            const newPara = document.createElement('div');
                            newPara.innerHTML = '<br>';
                            pre.after(newPara);
                            
                            if (pre.textContent.trim() === '') {
                                pre.remove();
                            }

                            this._moveCursorToEnd(newPara, selection);
                            this._saveContent();
                            return;
                        }
                    }
                    
                    if (parentElement.textContent.trim() === '```') {
                        e.preventDefault();
                        const newPara = document.createElement('div');
                        newPara.innerHTML = '<br>';
                        pre.after(newPara);
                        pre.remove();
                        this._moveCursorToEnd(newPara, selection);
                        this._saveContent();
                    }
                    
                    return;
                }

                const blockquote = parentElement.closest('blockquote');
                if (blockquote) {
                    if (parentElement !== blockquote && parentElement.textContent.trim() === '') {
                        e.preventDefault();
                        const newPara = document.createElement('div');
                        newPara.innerHTML = '<br>';
                        blockquote.after(newPara);
                        parentElement.remove();

                        if (!blockquote.hasChildNodes() || blockquote.textContent.trim() === '') {
                            blockquote.remove();
                        }
                        this._moveCursorToEnd(newPara, selection);
                        this._saveContent();
                        return;
                    }
                }

                const currentLine = parentElement;
                const currentLineText = currentLine.textContent.trim();
                const previousLine = currentLine.previousElementSibling;
                let match;

                const imageRegex = /^!\[([^\]]*)\]\(([^)]+)\)$/;
                if ((match = currentLineText.match(imageRegex))) {
                    e.preventDefault();
                    const altText = match[1];
                    const imageUrl = match[2];
                    const figure = document.createElement('figure');
                    const img = document.createElement('img');
                    img.src = imageUrl;
                    img.alt = altText;
                    figure.appendChild(img);
                    if (altText) {
                        const figcaption = document.createElement('figcaption');
                        figcaption.textContent = altText;
                        figure.appendChild(figcaption);
                    }
                    const newPara = document.createElement('div');
                    newPara.innerHTML = '<br>';
                    currentLine.replaceWith(figure);
                    figure.after(newPara);
                    this._moveCursorToEnd(newPara, selection);
                    this._saveContent();
                    return;
                }

                const separatorRegex = /^\|(?:\s*:?-+:?\s*\|)+$/;
                if (previousLine && currentLineText.match(separatorRegex)) {
                    const headers = previousLine.textContent.split('|').slice(1, -1).map(h => h.trim());
                    if (headers.length > 0) {
                        e.preventDefault();

                        const aligners = currentLineText.split('|').slice(1, -1).map(s => s.trim());
                        const alignments = aligners.map(aligner => {
                            const startsWithColon = aligner.startsWith(':');
                            const endsWithColon = aligner.endsWith(':');
                            if (startsWithColon && endsWithColon) return 'center';
                            if (startsWithColon) return 'right';
                            if (endsWithColon) return 'left';
                            return '';
                        });

                        const table = document.createElement('table');
                        table.dataset.alignments = JSON.stringify(alignments);

                        const thead = table.createTHead();
                        const headerRow = thead.insertRow();
                        headers.forEach((headerText, index) => {
                            const th = document.createElement('th');
                            th.textContent = headerText;
                            if (alignments[index]) {
                                th.style.textAlign = alignments[index];
                            }
                            headerRow.appendChild(th);
                        });

                        const tbody = table.createTBody();
                        const firstDataRow = tbody.insertRow();
                        for (let i = 0; i < headers.length; i++) {
                            const cell = firstDataRow.insertCell(i);
                            cell.appendChild(document.createElement('br'));
                            if (alignments[i]) {
                                cell.style.textAlign = alignments[i];
                            }
                        }

                        previousLine.replaceWith(table);
                        currentLine.remove();
                        this._moveCursorToEnd(firstDataRow.cells[0], selection);
                        this._saveContent();
                        return;
                    }
                }

                if (currentLineText.startsWith('```')) {
                    e.preventDefault();
                    const lang = currentLineText.substring(3);
                    const newPre = document.createElement('pre');
                    const newCode = document.createElement('code');
                    if (lang) newCode.className = `language-${lang}`;
                    newCode.innerHTML = '<br>';
                    newPre.appendChild(newCode);
                    currentLine.replaceWith(newPre);
                    this._moveCursorToEnd(newCode, selection);
                    this._saveContent();
                    return;
                }

                const listItemOnEnter = parentElement.closest('li');
                if (listItemOnEnter) {
                    if (listItemOnEnter.textContent.trim() === '') {
                        e.preventDefault();
                        const parentList = listItemOnEnter.parentElement;
                        const parentLi = parentList.parentElement.closest('li');
                        if (parentLi) {
                            parentLi.after(listItemOnEnter);
                            if (parentList.children.length === 0) {
                                parentList.remove();
                            }
                            this._moveCursorToEnd(listItemOnEnter, selection);
                        } else {
                            const list = listItemOnEnter.parentElement;
                            const newPara = document.createElement('div');
                            newPara.innerHTML = '<br>';
                            list.after(newPara);
                            listItemOnEnter.remove();
                            if (list.children.length === 0) {
                                list.remove();
                            }
                            this._moveCursorToEnd(newPara, selection);
                        }
                        this._saveContent();
                        return;
                    }
                    if (listItemOnEnter.classList.contains('checklist-item')) {
                        e.preventDefault();
                        const newLi = this._createChecklistItem('', false);
                        listItemOnEnter.after(newLi);
                        this._moveCursorToEnd(newLi, selection);
                        this._saveContent();
                        return;
                    }
                }
            }
        });

        this.element.addEventListener('keyup', (e) => {
            if (this.activeRawNode) return;

            if (e.key === ' ') {
                const selection = window.getSelection();
                if (!selection.rangeCount) return;
                const range = selection.getRangeAt(0);
                const node = range.startContainer;

                if (node.parentElement.closest('pre')) {
                    return;
                }

                const parentLi = node.parentElement.closest('li');
                if (parentLi) {
                    const liText = parentLi.textContent;
                    let match;
                    if ((match = liText.match(/^\[([ xX]?)\]\s$/))) {
                        const isChecked = match[1].toLowerCase() === 'x';
                        const list = parentLi.parentElement;
                        list.classList.add('checklist');
                        const newChecklistItem = this._createChecklistItem('', isChecked);
                        parentLi.replaceWith(newChecklistItem);
                        this._moveCursorToEnd(newChecklistItem, selection);
                        this._saveContent();
                        return;
                    }
                }
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent.substring(0, range.startOffset);
                    let match;
                    const parentBlock = node.parentElement;

                    const isInsideBlockquote = parentBlock && parentBlock.parentElement.tagName === 'BLOCKQUOTE';
                    const isTopLevelBlock = parentBlock && parentBlock.parentElement === this.element && parentBlock.tagName === 'DIV';
                    const isRootTextNode = parentBlock === this.element && node.nodeType === Node.TEXT_NODE;

                    if (isTopLevelBlock || isRootTextNode || isInsideBlockquote) {
                        const elementToReplace = isRootTextNode ? node : parentBlock;

                        if (text.trim() === '---') {
                            const hr = document.createElement('hr');
                            elementToReplace.replaceWith(hr);
                            const newPara = document.createElement('div');
                            newPara.innerHTML = '<br>';
                            hr.after(newPara);
                            this._moveCursorToEnd(newPara, selection);
                            return;
                        }

                        if ((match = text.match(/^(#{1,4}) ([^\n]+?)\s$/))) {
                            const level = match[1].length;
                            const content = match[2];
                            const newHeading = document.createElement(`h${level}`);
                            newHeading.textContent = content;
                            elementToReplace.replaceWith(newHeading);
                            this._moveCursorToEnd(newHeading, selection);
                            return;
                        } else if ((match = text.match(/^> ([^\n]*?)\s$/))) {
                            const content = match[1];
                            const newQuote = document.createElement('blockquote');
                            const line = document.createElement('div');
                            if (content === '') {
                                line.appendChild(document.createElement('br'));
                            } else {
                                line.innerHTML = this._parseInlineMarkdown(content);
                            }
                            newQuote.appendChild(line);
                            elementToReplace.replaceWith(newQuote);
                            this._moveCursorToEnd(line, selection);
                            return;
                        } else if ((match = text.match(/^(\d+)\.\s([^\n]*?)\s$/))) {
                            const content = match[2];
                            const ol = document.createElement('ol');
                            const li = document.createElement('li');
                            const startNum = parseInt(match[1], 10);
                            if (startNum > 1) {
                                ol.setAttribute('start', startNum);
                            }
                            if (content === '') {
                                li.appendChild(document.createElement('br'));
                            } else {
                                li.textContent = content;
                            }
                            ol.appendChild(li);
                            elementToReplace.replaceWith(ol);
                            this._moveCursorToEnd(li, selection);
                            return;
                        } else if ((match = text.match(/^([*-])\s([^\n]*?)\s$/))) {
                            const content = match[2];
                            const ul = document.createElement('ul');
                            const li = document.createElement('li');
                            if (content === '') {
                                li.appendChild(document.createElement('br'));
                            } else {
                                li.textContent = content;
                            }
                            ul.appendChild(li);
                            elementToReplace.replaceWith(ul);
                            this._moveCursorToEnd(li, selection);
                            return;
                        }
                    }
                    if ((match = text.match(/`([^`]+)`\s$/))) {
                        this._replaceMarkdown(node, match, (m) => {
                            const code = document.createElement('code');
                            code.textContent = m[1];
                            return code;
                        });
                    }
                    if ((match = text.match(/\[([^\]]+)\]\(([^)]+)\)\s$/))) {
                        if (text.charAt(match.index - 1) !== '!') {
                            this._replaceMarkdown(node, match, (m) => {
                                const a = document.createElement('a');
                                a.href = m[2];
                                a.textContent = m[1];
                                a.target = '_blank';
                                return a;
                            });
                        }
                    } else if ((match = text.match(/\*\*([^*]+)\*\*\s$/))) {
                        this._replaceMarkdown(node, match, (m) => {
                            const strong = document.createElement('strong');
                            strong.textContent = m[1];
                            return strong;
                        });
                    } else if ((match = text.match(/\*([^*]+)\*\s$/))) {
                        this._replaceMarkdown(node, match, (m) => {
                            const em = document.createElement('em');
                            em.textContent = m[1];
                            return em;
                        });
                    } else if ((match = text.match(/~~([^~]+)~~\s$/))) {
                        this._replaceMarkdown(node, match, (m) => {
                            const del = document.createElement('del');
                            del.textContent = m[1];
                            return del;
                        });
                    }
                }
            }
        });

        this.element.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            const html = this._markdownToHtml(text);
            if (html) {
                document.execCommand('insertHTML', false, html);
                this.updateAllDirections();
                this._saveContent();
            }
        });

        this.element.addEventListener('copy', (e) => {
            const markdown = this._getMarkdownFromSelection();
            if (markdown) {
                e.preventDefault();
                e.clipboardData.setData('text/plain', markdown);
            }
        });

        this.element.addEventListener('focusout', () => {
            if (this.activeRawNode) {
                this._renderActiveNode();
            }
        });
    }
}
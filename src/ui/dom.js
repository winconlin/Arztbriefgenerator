/**
 * DOM-Hilfsfunktionen.
 *
 * SICHERHEIT: In diesem Projekt wird `innerHTML` niemals mit Daten befuellt.
 * Alle Elemente entstehen ueber `document.createElement`, alle Texte ueber
 * `textContent`. Damit kann ein importiertes Template keine Skripte oder
 * Ereignis-Attribute einschleusen (siehe DOCS/ARCHITECTURE_AND_BUGS.md, 3.1).
 */

/**
 * Erzeugt ein Element.
 * @param {string} tag
 * @param {object} [props]    Eigenschaften; `class`, `dataset`, `on` und
 *                            `attrs` werden gesondert behandelt.
 * @param {Array|Node|string} [children]
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(props || {})) {
    if (value === undefined || value === null || value === false) continue;

    if (key === 'class') {
      node.className = Array.isArray(value) ? value.filter(Boolean).join(' ') : String(value);
    } else if (key === 'dataset') {
      for (const [dataKey, dataValue] of Object.entries(value)) {
        if (dataValue !== undefined && dataValue !== null) node.dataset[dataKey] = String(dataValue);
      }
    } else if (key === 'on') {
      for (const [eventName, handler] of Object.entries(value)) {
        if (typeof handler === 'function') node.addEventListener(eventName, handler);
      }
    } else if (key === 'attrs') {
      for (const [attrName, attrValue] of Object.entries(value)) {
        if (attrValue === undefined || attrValue === null || attrValue === false) continue;
        node.setAttribute(attrName, attrValue === true ? '' : String(attrValue));
      }
    } else if (key === 'text') {
      node.textContent = String(value);
    } else {
      node[key] = value;
    }
  }

  append(node, children);
  return node;
}

export function append(parent, children) {
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function replaceChildren(node, children) {
  clear(node);
  return append(node, children);
}

export const $ = (selector, scope = document) => scope.querySelector(selector);
export const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

/**
 * Kopiert Text in die Zwischenablage.
 *
 * Unter `file://` ist der Kontext in einigen Browsern nicht „secure", dort
 * steht `navigator.clipboard` nicht zur Verfuegung. Deshalb gibt es einen
 * Rueckfallpfad ueber ein temporaeres Textfeld.
 *
 * @returns {Promise<boolean>} ob das Kopieren gelungen ist
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Rueckfall unten
  }

  try {
    const helper = el('textarea', {
      value: text,
      attrs: { readonly: true, 'aria-hidden': 'true', tabindex: '-1' },
      style: 'position:fixed;top:-1000px;left:-1000px;opacity:0',
    });
    document.body.appendChild(helper);
    helper.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(helper);
    return ok;
  } catch {
    return false;
  }
}

/** Loest einen lokalen Download aus – ohne jeden Netzwerkzugriff. */
export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = el('a', { href: url, download: filename });
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Fuegt Text an der Cursorposition eines Textfelds ein. */
export function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  const needsLeadingBreak = before !== '' && !before.endsWith('\n');
  const prefix = needsLeadingBreak ? '\n' : '';
  textarea.value = before + prefix + text + after;
  const caret = start + prefix.length + text.length;
  textarea.selectionStart = caret;
  textarea.selectionEnd = caret;
  textarea.focus();
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

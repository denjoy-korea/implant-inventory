const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li',
  'blockquote', 'h2', 'h3', 'hr', 'div', 'span', 'img', 'a',
]);

const ALLOWED_GLOBAL_ATTRS = new Set(['class', 'style']);

const ALLOWED_TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt']),
};

const ALLOWED_CLASSES = new Set(['notice-callout']);

const ALLOWED_STYLE_PROPS = new Set([
  'color',
  'background-color',
  'font-weight',
  'font-style',
  'text-decoration',
]);

const SAFE_STYLE_VALUE = /^([#(),.%\s0-9a-zA-Z-])+$/;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeClassList(rawClassValue: string): string {
  return rawClassValue
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token && ALLOWED_CLASSES.has(token))
    .join(' ');
}

function sanitizeStyle(rawStyle: string): string {
  const safeDecls: string[] = [];
  rawStyle.split(';').forEach(decl => {
    const [rawProp, ...rawValueParts] = decl.split(':');
    if (!rawProp || rawValueParts.length === 0) return;
    const prop = rawProp.trim().toLowerCase();
    const value = rawValueParts.join(':').trim();
    if (!ALLOWED_STYLE_PROPS.has(prop)) return;
    if (!SAFE_STYLE_VALUE.test(value)) return;
    safeDecls.push(`${prop}: ${value}`);
  });
  return safeDecls.join('; ');
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sanitizeRichHtml(rawHtml: string): string {
  if (!rawHtml) return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return escapeHtml(rawHtml);
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${rawHtml}</div>`, 'text/html');
    const inputRoot = doc.body.firstElementChild as HTMLDivElement | null;
    if (!inputRoot) return '';

    const outputDoc = document.implementation.createHTMLDocument('');
    const outputRoot = outputDoc.createElement('div');

    const sanitizeNode = (node: Node, parent: HTMLElement) => {
      if (node.nodeType === Node.TEXT_NODE) {
        parent.appendChild(outputDoc.createTextNode(node.textContent || ''));
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tag)) {
        Array.from(el.childNodes).forEach(child => sanitizeNode(child, parent));
        return;
      }

      const safeEl = outputDoc.createElement(tag);

      Array.from(el.attributes).forEach(attr => {
        const name = attr.name.toLowerCase();
        const value = attr.value;

        if (name.startsWith('on')) return;

        const tagAttrs = ALLOWED_TAG_ATTRS[tag] || new Set<string>();
        if (!ALLOWED_GLOBAL_ATTRS.has(name) && !tagAttrs.has(name)) return;

        if (name === 'class') {
          const safeClass = sanitizeClassList(value);
          if (safeClass) safeEl.setAttribute('class', safeClass);
          return;
        }

        if (name === 'style') {
          const safeStyle = sanitizeStyle(value);
          if (safeStyle) safeEl.setAttribute('style', safeStyle);
          return;
        }

        if (name === 'href') {
          if (!isSafeUrl(value)) return;
          safeEl.setAttribute('href', value);
          safeEl.setAttribute('rel', 'noopener noreferrer nofollow');
          if (el.getAttribute('target') === '_blank') {
            safeEl.setAttribute('target', '_blank');
          }
          return;
        }

        if (name === 'src') {
          if (tag !== 'img') return;
          if (!isSafeUrl(value)) return;
          safeEl.setAttribute('src', value);
          return;
        }

        if (name === 'alt') {
          safeEl.setAttribute('alt', value);
          return;
        }
      });

      Array.from(el.childNodes).forEach(child => sanitizeNode(child, safeEl));
      parent.appendChild(safeEl);
    };

    Array.from(inputRoot.childNodes).forEach(child => sanitizeNode(child, outputRoot));
    return outputRoot.innerHTML;
  } catch {
    return escapeHtml(rawHtml);
  }
}

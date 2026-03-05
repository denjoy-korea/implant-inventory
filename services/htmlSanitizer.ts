import DOMPurify from 'dompurify';

// DOMPurify 설정: 허용 태그/속성 화이트리스트
// mXSS, DOM clobbering, 프로토콜 인젝션 등 자체 구현보다 넓은 범위 방어
const PURIFY_CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li',
                 'blockquote', 'h2', 'h3', 'hr', 'div', 'span', 'a'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
  ALLOW_DATA_ATTR: false,
  FORCE_BODY: true,
};

// href에 javascript: 등 위험 프로토콜 차단 (DOMPurify 기본 동작이지만 명시적으로 등록)
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('rel', 'noopener noreferrer nofollow');
    const href = node.getAttribute('href') ?? '';
    try {
      const parsed = new URL(href, window.location.origin);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        node.removeAttribute('href');
      }
    } catch {
      node.removeAttribute('href');
    }
  }
});

export function sanitizeRichHtml(rawHtml: string): string {
  if (!rawHtml) return '';
  if (typeof window === 'undefined') {
    // SSR 환경: 태그 모두 제거 후 텍스트만 반환
    return rawHtml.replace(/<[^>]*>/g, '');
  }
  return String(DOMPurify.sanitize(rawHtml, PURIFY_CONFIG));
}

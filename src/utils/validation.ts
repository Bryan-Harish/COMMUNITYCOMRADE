/**
 * Global input validation and sanitization functions.
 * Adheres to global security guidelines for XSS prevention, script injection, and robust input validation.
 */

/**
 * Sanitizes user-entered text fields.
 * - Trims leading/trailing whitespace
 * - Collapses multiple consecutive spaces into a single space
 * - Removes invisible control characters (except common ones like \n, \r, \t)
 * - Escapes HTML tags and characters to prevent raw HTML rendering and script tag injection
 * - Rejects/neutralizes 'javascript:' payloads
 */
export function sanitizeText(text: string | null | undefined): string {
  if (text === null || text === undefined) {
    return '';
  }

  // 1. Convert to string and trim
  let sanitized = String(text).trim();

  // 2. Collapse multiple consecutive spaces to a single space (excluding newlines/tabs)
  sanitized = sanitized.replace(/[ \t]+/g, ' ');

  // 3. Remove invisible control characters (U+0000 to U+001F, except \n, \r, \t, and U+007F)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 4. Prevent javascript: payload by neutralizing it
  if (/^\s*javascript:/i.test(sanitized)) {
    sanitized = sanitized.replace(/^\s*javascript:/i, 'unsafe-javascript:');
  }

  // 5. Escape HTML tags/characters to prevent script/raw HTML injection
  const htmlEscapes: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;'
  };
  sanitized = sanitized.replace(/[&<>"'`\/]/g, (char) => htmlEscapes[char] || char);

  return sanitized;
}

/**
 * Checks if a sanitized field is empty (contains only spaces or was completely neutralized)
 */
export function isEmptyField(text: string | null | undefined): boolean {
  if (!text) return true;
  return text.trim().length === 0;
}

/**
 * Name Validation:
 * - Required
 * - Minimum 2 characters, Maximum 100 characters
 * - Allow alphabets, spaces, periods, hyphens
 * - Reject pure numeric names
 */
export function isValidName(name: string | null | undefined): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 100) return false;
  
  // Reject if it is pure numeric
  if (/^\d+$/.test(trimmed)) return false;

  // Allow alphabets, spaces, periods, hyphens
  const nameRegex = /^[A-Za-z\s.\-]+$/;
  return nameRegex.test(trimmed);
}

/**
 * Phone Number Validation:
 * - Required
 * - Digits only
 * - Exactly 10 digits
 * - Reject letters and special characters
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const trimmed = phone.trim();
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(trimmed);
}

/**
 * Standard Email Validation
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const trimmed = email.trim();
  // Standard email validation regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(trimmed) && trimmed.length <= 150;
}

/**
 * Government ID Field Validation:
 * - Trim spaces, prevent special character spam, reasonable length (2 to 50 chars)
 */
export function isValidGovernmentId(id: string | null | undefined): boolean {
  if (!id) return false;
  const trimmed = id.trim();
  if (trimmed.length < 2 || trimmed.length > 50) return false;
  
  // Prevent special character spam (e.g. "@@@@@@@@")
  // Allow alphanumeric characters, spaces, and hyphens
  const idRegex = /^[A-Za-z0-9\s\-]+$/;
  return idRegex.test(trimmed);
}

/**
 * Issue Title Validation:
 * - Required
 * - Minimum 5, Maximum 150 characters
 */
export function isValidIssueTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  const trimmed = title.trim();
  return trimmed.length >= 5 && trimmed.length <= 150;
}

/**
 * Issue Description Validation:
 * - Required
 * - Minimum 20, Maximum 3000 characters
 */
export function isValidIssueDescription(desc: string | null | undefined): boolean {
  if (!desc) return false;
  const trimmed = desc.trim();
  return trimmed.length >= 20 && trimmed.length <= 3000;
}

/**
 * Comments/Discussion Validation:
 * - Required
 * - Minimum 2, Maximum 1000 characters
 */
export function isValidComment(comment: string | null | undefined): boolean {
  if (!comment) return false;
  const trimmed = comment.trim();
  return trimmed.length >= 2 && trimmed.length <= 1000;
}

/**
 * Quiz Category Name Validation:
 * - Required, Maximum 100 characters
 */
export function isValidQuizCategoryName(name: string | null | undefined): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 100;
}

/**
 * Helpline Department Phone:
 * - Digits only, allow optional '+' prefix, reject alphabetic characters
 */
export function isValidHelplinePhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const trimmed = phone.trim();
  const helplineRegex = /^\+?\d{1,15}$/;
  return helplineRegex.test(trimmed);
}

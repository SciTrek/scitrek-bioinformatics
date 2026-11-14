const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const PATH_TOKEN = /([^[.\]]+)|\[(\d+)\]/g;

/**
 * Set a nested value on an object using paths like `a.b[0].c`.
 * Mutates `target` in place and returns it.
 *
 * Prefer this over `new Function(...)` — production CSP blocks eval-style APIs.
 */
export function setPath(target, path, value) {
  if (target == null || typeof target !== 'object') {
    throw new TypeError('setPath target must be an object');
  }
  if (typeof path !== 'string' || !path) {
    throw new TypeError('setPath path must be a non-empty string');
  }

  const segments = [];
  let match;
  PATH_TOKEN.lastIndex = 0;
  while ((match = PATH_TOKEN.exec(path)) !== null) {
    if (match[1] !== undefined) {
      segments.push(match[1]);
    } else {
      segments.push(Number(match[2]));
    }
  }

  if (!segments.length) {
    throw new Error(`Unsupported path: ${path}`);
  }

  let cursor = target;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i];
    const nextKey = segments[i + 1];

    if (typeof key === 'string' && FORBIDDEN_KEYS.has(key)) {
      throw new Error(`Forbidden path segment: ${key}`);
    }

    if (cursor[key] == null || typeof cursor[key] !== 'object') {
      cursor[key] = typeof nextKey === 'number' ? [] : {};
    }
    cursor = cursor[key];
  }

  const lastKey = segments[segments.length - 1];
  if (typeof lastKey === 'string' && FORBIDDEN_KEYS.has(lastKey)) {
    throw new Error(`Forbidden path segment: ${lastKey}`);
  }
  cursor[lastKey] = value;
  return target;
}

import { describe, expect, test } from 'vitest';
import { setPath } from './setPath';

describe('setPath', () => {
  test('sets nested dotted paths', () => {
    const target = { inquiry: { predictions: [''] } };
    setPath(target, 'inquiry.predictions', ['too loud']);
    expect(target.inquiry.predictions).toEqual(['too loud']);
  });

  test('sets bracket index paths used by day pages', () => {
    const target = { inquiry: { predictions: ['', ''] } };
    setPath(target, 'inquiry.predictions[0]', 'high expression');
    expect(target.inquiry.predictions[0]).toBe('high expression');
  });

  test('creates missing objects and arrays along the path', () => {
    const target = {};
    setPath(target, 'cellCycle.mitosisSketch.prophase.desc', 'drawn');
    expect(target.cellCycle.mitosisSketch.prophase.desc).toBe('drawn');
  });

  test('rejects prototype-polluting keys', () => {
    const target = {};
    expect(() => setPath(target, '__proto__.polluted', true)).toThrow(/forbidden/i);
    expect(() => setPath(target, 'constructor.prototype.polluted', true)).toThrow(/forbidden/i);
  });

  test('does not use new Function / eval', () => {
    const originalFunction = globalThis.Function;
    let constructed = 0;
    globalThis.Function = function FunctionSpy(...args) {
      constructed += 1;
      return originalFunction(...args);
    };

    try {
      const target = { compare: { table: '' } };
      setPath(target, 'compare.table', 'ok');
      expect(target.compare.table).toBe('ok');
      expect(constructed).toBe(0);
    } finally {
      globalThis.Function = originalFunction;
    }
  });
});

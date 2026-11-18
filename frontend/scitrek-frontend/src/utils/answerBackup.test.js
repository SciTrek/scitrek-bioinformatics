import { clearAnswerBackup, readAnswerBackup, writeAnswerBackup } from './answerBackup';

describe('answer backup', () => {
  beforeEach(() => localStorage.clear());

  test('round-trips unsaved answers per user and module', () => {
    writeAnswerBackup('P1G1Andy', 3, { intro: { text: 'draft' } });

    expect(readAnswerBackup('P1G1Andy', 3)).toEqual({ intro: { text: 'draft' } });
    expect(readAnswerBackup('P1G1Andy', 4)).toBeNull();
    expect(readAnswerBackup('someone-else', 3)).toBeNull();
  });

  test('clear removes the backup', () => {
    writeAnswerBackup('u', 1, { a: 1 });
    clearAnswerBackup('u', 1);

    expect(readAnswerBackup('u', 1)).toBeNull();
  });

  test('ignores corrupt data and missing user keys', () => {
    localStorage.setItem('scitrek.answerBackup.v1.u.1', '{not json');

    expect(readAnswerBackup('u', 1)).toBeNull();
    writeAnswerBackup(undefined, 1, { a: 1 });
    expect(readAnswerBackup(undefined, 1)).toBeNull();
  });
});

// Local safety copy of answers that have not yet been saved to the server.
//
// A copy exists only while the server is missing the latest edits: it is written
// when the student changes an answer and removed once a save succeeds. If the
// student is logged out, loses connectivity, or the tab closes before a save
// lands, the copy is restored the next time they open the page.
const PREFIX = 'scitrek.answerBackup.v1';

const storageKey = (userKey, moduleId) => `${PREFIX}.${userKey}.${moduleId}`;

export const writeAnswerBackup = (userKey, moduleId, answers) => {
  if (!userKey) return;
  try {
    localStorage.setItem(
      storageKey(userKey, moduleId),
      JSON.stringify({ savedAt: Date.now(), answers })
    );
  } catch {
    // Storage can be full or blocked; the server save is still the primary path.
  }
};

export const readAnswerBackup = (userKey, moduleId) => {
  if (!userKey) return null;
  try {
    const raw = localStorage.getItem(storageKey(userKey, moduleId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.answers === 'object' && parsed.answers !== null
      ? parsed.answers
      : null;
  } catch {
    return null;
  }
};

export const clearAnswerBackup = (userKey, moduleId) => {
  if (!userKey) return;
  try {
    localStorage.removeItem(storageKey(userKey, moduleId));
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
};

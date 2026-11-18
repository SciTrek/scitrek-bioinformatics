import { useEffect } from 'react';
import { writeAnswerBackup } from '../utils/answerBackup';

// Mirrors unsaved answers to local storage so a failed save, forced logout or
// closed tab cannot lose them. The page removes the copy after a successful save.
export function useAnswerBackup(userKey, moduleId, answersData, dirty) {
  useEffect(() => {
    if (userKey && dirty) {
      writeAnswerBackup(userKey, moduleId, answersData);
    }
  }, [userKey, moduleId, answersData, dirty]);
}

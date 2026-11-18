import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Day1Page from './Day1Page';
import Day2Page from './Day2Page';
import Day3Page from './Day3Page';
import Day4Page from './Day4Page';
import Day5Page from './Day5Page';
import { getCurrentUser, getResponseDetail, upsertResponse } from '../services/api';
import { readAnswerBackup, writeAnswerBackup } from '../utils/answerBackup';

vi.mock('../components/StudentProfileBanner', () => ({
  default: () => <header>banner</header>,
}));
vi.mock('../components/Popup', () => ({ default: () => null }));
vi.mock('../services/api', () => ({
  getCurrentUser: vi.fn(),
  getResponseDetail: vi.fn(),
  upsertResponse: vi.fn(),
}));

const mockUser = { username: 'P1G1Student', first_name: 'Student' };
const PAGES = [
  ['Day 1', Day1Page, 1],
  ['Day 2', Day2Page, 2],
  ['Day 3', Day3Page, 3],
  ['Day 4', Day4Page, 4],
  ['Day 5', Day5Page, 5],
];

const renderDay = (Component, day) =>
  render(
    <MemoryRouter
      initialEntries={[`/sections/day-${day}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path={`/sections/day-${day}`} element={<Component />} />
      </Routes>
    </MemoryRouter>
  );

const flush = () =>
  act(async () => {
    for (let i = 0; i < 6; i += 1) await Promise.resolve();
  });

describe('Day pages protect student answers', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    getCurrentUser.mockResolvedValue(mockUser);
    upsertResponse.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe.each(PAGES)('%s', (_name, Component, day) => {
    test.each([
      ['a server error', { response: { status: 503 } }],
      ['a dropped connection', new Error('Network Error')],
      ['a rate limit', { response: { status: 429 } }],
    ])('does not show an editable blank form when saved answers fail to load (%s)', async (_label, failure) => {
      getResponseDetail.mockRejectedValue(failure);

      renderDay(Component, day);
      await flush();

      expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t load your saved answers/i);
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(upsertResponse).not.toHaveBeenCalled();
    });

    test('restores unsaved answers backed up before the session ended and saves them', async () => {
      getResponseDetail.mockRejectedValue({ response: { status: 404 } });
      writeAnswerBackup(mockUser.username, day, { zzRestoredMarker: 'typed before logout' });
      vi.useFakeTimers({ shouldClearNativeTimers: true });

      renderDay(Component, day);
      await flush();
      await act(async () => {
        vi.advanceTimersByTime(15100);
        await Promise.resolve();
      });
      await flush();
      vi.useRealTimers();

      expect(upsertResponse).toHaveBeenCalledWith(
        day,
        expect.objectContaining({ zzRestoredMarker: 'typed before logout' })
      );
      // Once the server has it, the local copy is no longer needed.
      expect(readAnswerBackup(mockUser.username, day)).toBeNull();
    });
  });

  test('a failed save keeps a local backup, tells the student, and keeps retrying', async () => {
    getResponseDetail.mockRejectedValue({ response: { status: 404 } });
    upsertResponse.mockRejectedValue({ response: { status: 401 } });
    vi.useFakeTimers({ shouldClearNativeTimers: true });

    renderDay(Day2Page, 2);
    await flush();
    fireEvent.change(screen.getByPlaceholderText(/G1 \(Gap\/Growth 1\)/i), {
      target: { value: 'Cells grow and prepare.' },
    });
    await flush();
    await act(async () => {
      vi.advanceTimersByTime(2100);
      await Promise.resolve();
    });
    await flush();

    expect(upsertResponse).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/not saved yet/i)).toBeInTheDocument();
    expect(readAnswerBackup(mockUser.username, 2)).toEqual(
      expect.objectContaining({
        cellCycle: expect.objectContaining({ interphaseG1: 'Cells grow and prepare.' }),
      })
    );

    // The 15s autosave timer retries, and a later success clears the warning and backup.
    upsertResponse.mockResolvedValue({});
    await act(async () => {
      vi.advanceTimersByTime(15100);
      await Promise.resolve();
    });
    await flush();
    vi.useRealTimers();

    expect(upsertResponse).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/not saved yet/i)).not.toBeInTheDocument();
    expect(readAnswerBackup(mockUser.username, 2)).toBeNull();
  });
});

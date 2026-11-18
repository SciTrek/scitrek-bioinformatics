import React from 'react';

// Shown instead of the activity when saved answers could not be fetched.
// Editing is blocked on purpose: a blank form that autosaves would replace the
// student's real saved answers.
export default function AnswerLoadError({ onRetry }) {
  return (
    <div role="alert" className="container mx-auto px-4 py-16 text-center space-y-4">
      <h1 className="text-xl font-semibold">We couldn&rsquo;t load your saved answers</h1>
      <p>
        Your work is safe. The connection dropped for a moment, so we&rsquo;re holding off
        on this page until your saved answers can be loaded.
      </p>
      <button
        type="button"
        className="rounded bg-blue-600 px-4 py-2 text-white"
        onClick={onRetry}
      >
        Try again
      </button>
    </div>
  );
}

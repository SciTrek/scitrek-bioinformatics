import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import HomePage from './pages/HomePage';
import StudentProfilePage from './pages/StudentProfilePage';
import LoginPage from './pages/LoginPage';
import Inbox from './pages/Inbox';
import PreModuleQuizPage from './pages/PreModuleQuizPage';
import PostModuleQuizPage from './pages/PostModuleQuizPage';
import WelcomePage from './pages/WelcomePage';
import WhatYoullLearnPage from './pages/WhatYoullLearnPage';
import ImportantVocabularyPage from './pages/ImportantVocabularyPage';
import Day1Page from './pages/Day1Page';
import Day2Page from './pages/Day2Page';
import Day3Page from './pages/Day3Page';
import Day4Page from './pages/Day4Page';
import Day5Page from './pages/Day5Page';
import Footer from './components/Footer';
import WorkbookList from './components/WorkbookList';
import WorkbookPage from './components/WorkbookPage';
import ErrorBoundary from './components/ErrorBoundary';

import { getCurrentUser } from './services/api';
import { getAccessToken, removeTokens } from './utils/auth';
import './App.css';

const STARTUP_ATTEMPTS = 3;
const STARTUP_RETRY_MS = 1500;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchUser() {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }
      for (let attempt = 0; attempt < STARTUP_ATTEMPTS; attempt += 1) {
        try {
          const userData = await getCurrentUser();
          if (!cancelled) {
            setUser(userData);
            setLoading(false);
          }
          return;
        } catch (err) {
          console.error(err);
          const status = err?.response?.status;
          if (status === 401 || status === 403 || status === 404) {
            // The server answered and rejected this login: the session is over.
            removeTokens();
            if (!cancelled) {
              setUser(null);
              setLoading(false);
            }
            return;
          }
          // Rate limit, server error or dropped connection: keep the session and retry.
          if (attempt < STARTUP_ATTEMPTS - 1) {
            await new Promise(resolve => setTimeout(resolve, STARTUP_RETRY_MS * (attempt + 1)));
          }
        }
      }
      if (!cancelled) {
        setLoadError(true);
        setLoading(false);
      }
    }
    fetchUser();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div>Loading&hellip;</div>;
  if (loadError) {
    return (
      <div role="alert" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h1>We couldn&rsquo;t reach SciTrek</h1>
        <p>Your work is safe and you are still signed in. Check your connection and try again.</p>
        <button type="button" onClick={() => window.location.reload()}>Try again</button>
      </div>
    );
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="app-container">
        <div className="content">
          <ErrorBoundary>
          <Routes>
            <Route
              path="/login"
              element={user ? <Navigate to="/" /> : <LoginPage />}
            />
            <Route
              path="/"
              element={user ? <HomePage user={user} /> : <Navigate to="/login" />}
            />
            <Route
              path="/student_profile"
              element={user ? <StudentProfilePage user={user} /> : <Navigate to="/login" />}
            />
            <Route
              path="/student_profile/pre_module"
              element={user ? <PreModuleQuizPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/student_profile/post_module"
              element={user ? <PostModuleQuizPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/inbox"
              element={user ? <Inbox user={user} /> : <Navigate to="/login" />}
            />
            <Route
              path="/workbooks"
              element={user ? <WorkbookList /> : <Navigate to="/login" />}
            />
            <Route
              path="/workbooks/:id"
              element={user ? <WorkbookPage /> : <Navigate to="/login" />}
            />

            <Route
              path="/sections/welcome"
              element={user ? <WelcomePage /> : <Navigate to="/login" />}
            />
            <Route
              path="/sections/what-youll-learn"
              element={user ? <WhatYoullLearnPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/sections/vocabulary"
              element={user ? <ImportantVocabularyPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/sections/day-1"
              element={user ? <Day1Page /> : <Navigate to="/login" />}
            />
            <Route
              path="/sections/day-2"
              element={user ? <Day2Page /> : <Navigate to="/login" />}
            />
            <Route
              path="/sections/day-3"
              element={user ? <Day3Page /> : <Navigate to="/login" />}
            />
            <Route
              path="/sections/day-4"
              element={user ? <Day4Page /> : <Navigate to="/login" />}
            />
            <Route
              path="/sections/day-5"
              element={user ? <Day5Page /> : <Navigate to="/login" />}
            />

            {/* Fallback route */}
            <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
          </Routes>
          </ErrorBoundary>
        </div>
        <Footer />
      </div>
    </Router>
  );
}

export default App;

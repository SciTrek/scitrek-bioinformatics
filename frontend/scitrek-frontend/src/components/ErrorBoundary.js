import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('UI crash caught by ErrorBoundary:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', maxWidth: '36rem', margin: '4rem auto', textAlign: 'left' }}>
          <h1 style={{ marginTop: 0 }}>Something went wrong</h1>
          <p>
            Your previously saved answers should still be on the server. Refresh the page to
            continue.
          </p>
          <button type="button" onClick={this.handleReload}>
            Refresh page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

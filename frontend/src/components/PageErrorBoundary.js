import React from 'react';
import { PageLoader } from './LoadingUI';
import { clearApiCache } from '../lib/apiCache';

/**
 * Empêche un crash dans une page de blanchir toute l’app (menu inclus).
 * « Réessayer » vide le cache API et remonte la page (équivalent pratique du F5
 * sans perdre toute la session UI).
 */
export default class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, retryKey: 0 };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Erreur page:', error, info);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  handleRetry = () => {
    clearApiCache();
    this.setState((s) => ({ error: null, retryKey: (s.retryKey || 0) + 1 }));
  };

  handleHardReload = () => {
    clearApiCache();
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      const detail = this.state.error?.message || String(this.state.error);
      return (
        <div style={{ padding: 32, textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
          <PageLoader label="Erreur d’affichage — rechargez la page" />
          <p style={{ marginTop: 12, fontSize: 12, color: '#94a3b8', wordBreak: 'break-word' }}>{detail}</p>
          <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={this.handleRetry}
              style={{
                padding: '8px 16px',
                background: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Réessayer
            </button>
            <button
              type="button"
              onClick={this.handleHardReload}
              style={{
                padding: '8px 16px',
                background: 'white',
                color: '#4c1d95',
                border: '1px solid #c4b5fd',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }
    return (
      <React.Fragment key={this.state.retryKey}>
        {this.props.children}
      </React.Fragment>
    );
  }
}

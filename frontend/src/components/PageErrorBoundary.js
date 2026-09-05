import React from 'react';
import { PageLoader } from './LoadingUI';

/**
 * Empêche un crash dans une page de blanchir toute l’app (menu inclus).
 */
export default class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
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

  render() {
    if (this.state.error) {
      const detail = this.state.error?.message || String(this.state.error);
      return (
        <div style={{ padding: 32, textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
          <PageLoader label="Erreur d’affichage — rechargez la page" />
          <p style={{ marginTop: 12, fontSize: 12, color: '#94a3b8', wordBreak: 'break-word' }}>{detail}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: 16,
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
        </div>
      );
    }
    return this.props.children;
  }
}

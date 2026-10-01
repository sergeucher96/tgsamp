import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center p-6">
          <div className="bg-[#0a0f1a] border border-red-500/20 rounded-3xl p-6 max-w-sm text-center space-y-3">
            <p className="text-sm font-black uppercase text-red-400">Ошибка компонента</p>
            <p className="text-[11px] text-slate-400">
              {this.state.error?.message || 'Неизвестная ошибка'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white text-xs font-black uppercase"
            >
              Повторить
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
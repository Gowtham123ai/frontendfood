import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-stone-900 mb-2">Something went wrong</h1>
            <p className="text-stone-500 mb-6">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-stone-900 text-white py-3 rounded-xl font-bold hover:bg-stone-800 transition-all"
            >
              Refresh Page
            </button>
            {this.state.error?.message && (
              <div className="mt-6 p-4 bg-stone-100 rounded-xl text-left text-xs overflow-auto max-h-60">
                {(() => {
                  try {
                    const info = JSON.parse(this.state.error.message);
                    return (
                      <div className="space-y-2">
                        <p className="font-bold text-red-600">Firestore Error Details:</p>
                        <p><span className="font-bold">Operation:</span> {info.operationType}</p>
                        <p><span className="font-bold">Path:</span> {info.path}</p>
                        <p><span className="font-bold">User ID:</span> {info.authInfo.userId || 'Not logged in'}</p>
                        <p className="mt-2 text-stone-400 italic">This error usually means security rules are blocking access.</p>
                      </div>
                    );
                  } catch {
                    return <pre>{this.state.error.message}</pre>;
                  }
                })()}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

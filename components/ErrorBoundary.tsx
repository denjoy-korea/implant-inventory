import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
  errorStack?: string;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: undefined, errorStack: undefined };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message, errorStack: error?.stack };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  handleRetry() {
    (this as React.Component<ErrorBoundaryProps, ErrorBoundaryState>).setState({ hasError: false, errorMessage: undefined, errorStack: undefined });
  }

  render(): React.ReactNode {
    const { hasError, errorMessage, errorStack } = (this as React.Component<ErrorBoundaryProps, ErrorBoundaryState>).state;
    if (hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            페이지를 불러오지 못했습니다
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            네트워크 연결을 확인하고 다시 시도해 주세요.
          </p>
          {errorMessage && (
            <details className="w-full max-w-xl mb-4 text-left">
              <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-600 select-none">
                오류 상세 보기
              </summary>
              <pre className="mt-2 p-3 bg-slate-100 rounded text-xs text-red-700 overflow-auto whitespace-pre-wrap break-all">
                {errorMessage}{errorStack ? `\n\n${errorStack}` : ''}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            다시 시도
          </button>
        </div>
      );
    }

    return (this as React.Component<ErrorBoundaryProps, ErrorBoundaryState>).props.children;
  }
}

export default ErrorBoundary;

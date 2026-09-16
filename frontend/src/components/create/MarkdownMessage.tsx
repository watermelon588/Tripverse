import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackContent: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class MarkdownErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Markdown render fallback activated:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="tv-md" style={{ whiteSpace: 'pre-wrap' }}>
          {this.props.fallbackContent}
        </div>
      );
    }
    return this.props.children;
  }
}

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = React.memo(
  ({ content, className = '' }) => {
    if (!content) return null;

    return (
      <MarkdownErrorBoundary fallbackContent={content}>
        <div className={`tv-md ${className}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
              table: ({ children }) => (
                <div className="tv-md__table">
                  <table>{children}</table>
                </div>
              ),
              code: ({ className, children, ...props }) => {
                const isInline = !className && !String(children).includes('\n');
                if (isInline) return <code className="tv-md__code">{children}</code>;
                return (
                  <pre className="tv-md__pre">
                    <code {...props}>{children}</code>
                  </pre>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </MarkdownErrorBoundary>
    );
  }
);

MarkdownMessage.displayName = 'MarkdownMessage';

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
        <div className="whitespace-pre-wrap font-body text-sm leading-relaxed text-[#1F1E1E] dark:text-[#F5F5F5]">
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
        <div className={`tripverse-markdown text-sm leading-relaxed font-body ${className}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-xl sm:text-2xl font-bold mt-4 mb-3 tracking-tight text-[#1F1E1E] dark:text-white border-b border-[#D9D9D9] dark:border-[#333333] pb-1.5 first:mt-0">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-base sm:text-lg font-bold mt-4 mb-2 tracking-tight text-[#1F1E1E] dark:text-white border-b border-[#E5E5E5] dark:border-[#2E2E2E] pb-1 first:mt-0">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm sm:text-base font-bold mt-3 mb-1.5 text-[#1F1E1E] dark:text-white first:mt-0">
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-xs sm:text-sm font-bold mt-2.5 mb-1 text-[#1F1E1E] dark:text-white">
                  {children}
                </h4>
              ),
              p: ({ children }) => (
                <p className="mb-2.5 last:mb-0 leading-relaxed text-[#1F1E1E] dark:text-[#F5F5F5]">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-5 mb-3 space-y-1 text-[#1F1E1E] dark:text-[#EAEAEA]">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-5 mb-3 space-y-1 text-[#1F1E1E] dark:text-[#EAEAEA]">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="leading-relaxed">{children}</li>
              ),
              strong: ({ children }) => (
                <strong className="font-bold text-[#1F1E1E] dark:text-white">
                  {children}
                </strong>
              ),
              em: ({ children }) => (
                <em className="italic">{children}</em>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-[#1F1E1E] dark:border-white/60 bg-[#F9F9F9] dark:bg-[#202020] pl-3.5 pr-2 py-2 my-3 italic text-xs sm:text-sm text-[#1F1E1E]/80 dark:text-[#CCCCCC]">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-3 max-w-full border border-[#D9D9D9] dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A]">
                  <table className="w-full border-collapse text-left text-xs sm:text-sm">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-[#F2F2F2] dark:bg-[#242424] border-b border-[#D9D9D9] dark:border-[#2E2E2E]">
                  {children}
                </thead>
              ),
              th: ({ children }) => (
                <th className="px-3.5 py-2 font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-[#1F1E1E] dark:text-white border-r border-[#E0E0E0] dark:border-[#333333] last:border-r-0 whitespace-nowrap">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-3.5 py-2.5 align-top border-b border-[#EBEBEB] dark:border-[#282828] border-r border-[#EBEBEB] dark:border-[#282828] last:border-r-0 text-xs leading-relaxed text-[#1F1E1E] dark:text-[#E0E0E0]">
                  {children}
                </td>
              ),
              tr: ({ children }) => (
                <tr className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors last:border-b-0">
                  {children}
                </tr>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1F1E1E] dark:text-[#CCCCCC] underline underline-offset-4 decoration-1 font-semibold hover:opacity-75 transition-opacity"
                >
                  {children}
                </a>
              ),
              hr: () => (
                <hr className="my-4 border-0 border-t border-[#D9D9D9] dark:border-[#2E2E2E]" />
              ),
              code: ({ className, children, ...props }) => {
                const isInline = !className && !String(children).includes('\n');
                if (isInline) {
                  return (
                    <code className="bg-[#EFEFEF] dark:bg-[#2A2A2A] px-1.5 py-0.5 font-mono text-[11px] sm:text-xs font-semibold text-[#1F1E1E] dark:text-[#E0E0E0] border border-[#DCDCDC] dark:border-[#383838]">
                      {children}
                    </code>
                  );
                }
                return (
                  <div className="my-3 overflow-x-auto bg-[#181818] border border-[#2E2E2E] p-3 text-white font-mono text-xs">
                    <code {...props} className="block whitespace-pre">
                      {children}
                    </code>
                  </div>
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

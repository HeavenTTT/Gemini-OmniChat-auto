import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { ExternalLink, AlertCircle } from 'lucide-react';
import { Role, Language, TextWrappingMode, Theme } from '../../types';
import { t } from '../../utils/i18n';
import { CodeBlock } from './CodeBlock';
import { ThoughtBlock } from './ThoughtBlock';

interface MessageContentProps {
  content: string;
  role: Role;
  isError?: boolean;
  images?: string[];
  textWrapping: TextWrappingMode;
  fontSize: number;
  language: Language;
  theme: Theme;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onViewImage?: (url: string) => void;
  isLast?: boolean;
}

export const MessageContent: React.FC<MessageContentProps> = React.memo(({
  content,
  role,
  isError,
  images,
  textWrapping,
  fontSize,
  language,
  theme,
  onShowToast,
  onViewImage,
  isLast = false
}) => {

  // Parse <think> blocks
  const { thoughts, cleanContent } = useMemo(() => {
    if (role !== Role.MODEL) {
        return { thoughts: [], cleanContent: content };
    }
    const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/g;
    const extractedThoughts: string[] = [];
    let match;
    // We clone the content to not mutate original during regex exec loops if needed, 
    // but regex.exec works on string reference.
    while ((match = thinkRegex.exec(content)) !== null) {
        extractedThoughts.push(match[1]);
    }
    
    // Strip the thoughts
    let stripped = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '');
    
    // Fix for streaming: If the content ends with a partial <think> tag (e.g. "<", "<t", "<thin"),
    // strip it from the display text to avoid flickering raw tags.
    stripped = stripped.replace(/<(?:t(?:h(?:i(?:n(?:k)?)?)?)?)?$/, '');

    return { thoughts: extractedThoughts, cleanContent: stripped.trim() };
  }, [content, role]);

  const handleImageClick = (src: string) => {
      if (onViewImage) {
          onViewImage(src);
      } else {
          window.open(src, '_blank');
      }
  };

  const getWrappingClass = () => {
    switch (textWrapping) {
      case 'forced': return 'whitespace-pre-wrap break-all';
      case 'auto': return 'whitespace-normal break-words';
      case 'default': default: return 'whitespace-pre-wrap break-words';
    }
  };

  if (isError) {
    return <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /><span>{content}</span></div>;
  }

  return (
    <div className={`markdown-body ${getWrappingClass()}`} style={{ fontSize: `${fontSize}px` }}>
        {thoughts.length > 0 && (
            <div className="mb-3 flex flex-col gap-2">
                {thoughts.map((thought, idx) => (
                    <ThoughtBlock 
                        key={idx} 
                        text={thought} 
                        lang={language} 
                        defaultOpen={isLast} // Auto-expand for the latest message (streaming)
                    />
                ))}
            </div>
        )}
        
        {/* Only render text content if it exists, logic handled by parent usually but safe to check */}
        {(cleanContent || (!images || images.length === 0)) && (
                <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkMath]} 
                rehypePlugins={[rehypeKatex]} 
                urlTransform={(value) => value}
                components={{ 
                    code({node, className, children, ...props}) { 
                        const match = /language-(\w+)/.exec(className || ''); 
                        const isInline = !match && !String(children).includes('\n'); 
                        
                        if (isInline) {
                            return <code className={className} {...props}>{children}</code>;
                        }
                        return (
                            <CodeBlock 
                            language={match ? match[1] : 'text'} 
                            value={String(children).replace(/\n$/, '')} 
                            theme={theme}
                            onShowToast={onShowToast}
                            lang={language}
                            />
                        );
                    },
                    a({href, children}) {
                        return (
                            <a href={href} target="_blank" rel="noopener noreferrer">
                                {children}
                                <ExternalLink className="w-3 h-3 inline-block ml-0.5 opacity-70" />
                            </a>
                        );
                    },
                    img({src, alt}) {
                        return <img src={src} alt={alt} onClick={() => { if (typeof src === 'string') handleImageClick(src); }} style={{cursor: 'pointer'}} />;
                    },
                    input({checked, readOnly}) {
                        return <input type="checkbox" checked={checked} readOnly={readOnly} className="mr-2 accent-primary-600 rounded w-4 h-4 align-text-bottom cursor-default" />;
                    }
                }}
            >
                {cleanContent}
            </ReactMarkdown>
        )}
    </div>
  );
});
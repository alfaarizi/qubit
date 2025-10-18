import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LaTeXProps {
    children: string;
    block?: boolean;
    className?: string;
}

export function LaTeX({ children, block = false, className = '' }: LaTeXProps) {
    const containerRef = useRef<HTMLSpanElement | HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            try {
                katex.render(children, containerRef.current, {
                    displayMode: block,
                    throwOnError: false,
                    errorColor: '#ef4444',
                    trust: false,
                });
            } catch (error) {
                console.error('KaTeX rendering error:', error);
                if (containerRef.current) {
                    containerRef.current.textContent = children;
                }
            }
        }
    }, [children, block]);

    const Component = block ? 'div' : 'span';
    
    return <Component ref={containerRef as any} className={className} />;
}

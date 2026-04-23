import React from 'react';
import { navigate } from '../lib/utils';

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
}

export function Link({ href, children, onClick, ...props }: LinkProps) {
    const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (onClick) onClick(e);
        if (e.defaultPrevented) return;

        // Abaikan SPA jika buka tab baru
        if (e.metaKey || e.ctrlKey || props.target === '_blank') return;

        e.preventDefault();

        // Gunakan fungsi utilitas kita
        await navigate(href);
    };

    return (
        <a {...props} href={href} onClick={handleClick}>
            {children}
        </a>
    );
}
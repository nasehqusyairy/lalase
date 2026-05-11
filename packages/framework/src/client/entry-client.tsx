// entry-client.tsx
import { hydrateRoot } from 'react-dom/client';
import './main.css';
import { createInertiaApp } from '@inertiajs/react';

createInertiaApp({
    // Memberitahu Inertia cara mencari file komponen di folder pages
    resolve: name => {
        const pages = import.meta.glob('./pages/**/*.tsx');
        return pages[`./pages/${name}.tsx`]() as any;
    },
    setup({ el, App, props }) {
        hydrateRoot(el, <App {...props} />);
    }
});
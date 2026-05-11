// entry-client.tsx
import './main.css';
import { createInertiaApp } from '@inertiajs/react';

createInertiaApp({
    // Memberitahu Inertia cara mencari file komponen di folder pages
    resolve: name => {
        const pages = import.meta.glob('./pages/**/*.tsx');
        return pages[`./pages/${name}.tsx`]() as any;
    }
});
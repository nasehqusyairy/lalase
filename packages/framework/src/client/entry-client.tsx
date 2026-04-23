// src/entry-client.tsx
import { hydrateRoot } from 'react-dom/client';
import { useState, useEffect } from 'react';
import App from './app';

const rootElement = document.getElementById('root');

// Ambil data dari atribut data-page
const rawData = rootElement?.getAttribute('data-page') || '{}';
const initialData = JSON.parse(rawData);

function Root() {
    const [pageData, setPageData] = useState(initialData);

    useEffect(() => {
        const navigateSPA = async (url: string) => {
            const res = await fetch(url, {
                headers: { 'x-custom-navigation': 'true' },
            });

            const json = await res.json();
            setPageData(json);
        };

        (window as any).navigateSPA = async (url: string) => {
            await navigateSPA(url);
            window.history.pushState(null, '', url);
        };

        const onPopState = async () => {
            await navigateSPA(window.location.pathname);
        };

        window.addEventListener('popstate', onPopState);

        return () => {
            window.removeEventListener('popstate', onPopState);
        };
    }, []);


    return <App pageData={pageData} />;
}

hydrateRoot(rootElement!, <Root />);
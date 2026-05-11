// entry-server.tsx - SSR entry point for Inertia
import ReactDOMServer from 'react-dom/server';
import { createInertiaApp } from '@inertiajs/react';

// Import page types from Inertia
interface PageProps {
    [key: string]: any;
}

interface InertiaPage {
    component: string;
    props: PageProps;
    url: string;
    version: string | null;
    rememberedState?: string;
}

// Resolve page components
const resolvePage = async (name: string) => {
    const pages = import.meta.glob('./pages/**/*.tsx', { eager: true });
    const pagePath = `./pages/${name}.tsx`;

    if (!pages[pagePath]) {
        throw new Error(`Page not found: ${name}`);
    }

    return (pages[pagePath] as any).default;
};

// SSR render function - uses renderToString to avoid duplicating the page data script
// The script tag is already in the template (app.edge)
export async function render(page: InertiaPage): Promise<string> {
    const html = await (createInertiaApp as any)({
        setup: ({ App, props }: any) => {
            // eslint-disable-next-line react/react-ininvocation
            return <App {...props} />;
        },
        page,
        resolve: resolvePage,
        render: ReactDOMServer.renderToString,
    });

    return html;
}

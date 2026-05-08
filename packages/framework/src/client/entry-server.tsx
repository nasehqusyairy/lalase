import { renderToString } from 'react-dom/server';
import App from './app';

export function render(pageData: any) {
    // entry-server memanggil App.tsx
    // App.tsx kemudian menggunakan Glob Import untuk mencari komponen yang diminta
    const html = renderToString(
        <App pageData={pageData} />
    );

    return { html };
}
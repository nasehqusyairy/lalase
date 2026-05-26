import { renderToString as render } from 'react-dom/server';
import { createInertiaApp, usePage } from '@inertiajs/react';
import { Fragment, type ComponentType } from 'react';
import parse from 'html-react-parser'
import { name } from '../../package.json'

type Assets = {
    css: string[];
    scripts: string[];
}

type PageModule = {
    default: ComponentType;
}

type PageProps = ReturnType<typeof usePage>;

const appName = name || 'Lalase Framework';
const pages = import.meta.glob<PageModule>('./pages/**/*.tsx', { eager: true });

export default async function (page: PageProps, { css, scripts }: Assets) {
    const { head, body } = await createInertiaApp({
        page,
        render,
        setup: ({ App, props }) => <App {...props} />,
        resolve: name => pages[`./pages/${name}.tsx`].default,
        title: title => title ? `${title} - ${appName}` : appName,
    })

    return render(
        <html lang={page.props._locale as string || "en"}>
            <head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />

                {/* Vite Assets */}
                {css.map((href) => <link key={href} rel="stylesheet" href={`/${href}`} />)}
                {scripts.map((src) => <script key={src} type="module" defer src={`/${src}`} />)}

                {/* App Head */}
                {head.map((head, i) => <Fragment key={i}>{parse(head)}</Fragment>)}
            </head>
            <body>
                {/* App Body */}
                {parse(body)}
            </body>
        </html>
    )
}
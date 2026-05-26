import { hydrateRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { ComponentType } from 'react';
import { name } from '../../package.json'
import './main.css';

type PageModule = {
    default: ComponentType;
}

const appName = name || 'Lalase Framework';
const pages = import.meta.glob<PageModule>('./pages/**/*.tsx', { eager: true });

createInertiaApp({
    setup: ({ el, App, props }) => hydrateRoot(el, <App {...props} />),
    resolve: name => pages[`./pages/${name}.tsx`].default,
    title: title => title ? `${title} - ${appName}` : appName,
});
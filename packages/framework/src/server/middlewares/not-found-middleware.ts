import type { Middleware } from '@server/types';

const message = 'Halaman tidak ditemukan'
export default (({ res }) => res.status(404).render('error', { message })) as Middleware;

import { createRoute } from '@server/core/router';
import { Router } from 'express';
import aboutController from '@server/controllers/about-controller';
import booksController from '@server/controllers/books-controller';

const route = createRoute();

route.get('/', async ({ res }) => {
    res.view('home');
}).name('home.index');

route.prefix('/salam').group(() => {
    route.get('/:nama/:umur', aboutController.salam).name('about.salam')
});

route.prefix('/books').group(() => {
    route.get('/', booksController.index).name('books.index')
    route.post('/', booksController.create).name('books.create')
});

export const web: Router = route.getRouter()

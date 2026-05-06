import { Route } from '@server/core/router';
import { Router } from 'express';
import aboutController from '@server/controllers/about-controller';
import booksController from '@server/controllers/books-controller';

Route.get('/', async ({ res }) => {
    res.renderProps('home');
}).name('home.index');

Route.prefix('/salam').group(() => {
    Route.get('/:nama/:umur', aboutController.salam).name('about.salam')
});

Route.prefix('/books').group(() => {
    Route.get('/', booksController.index).name('books.index')
    Route.post('/', booksController.create).name('books.create')
});

export const web: Router = Route.getRouter()
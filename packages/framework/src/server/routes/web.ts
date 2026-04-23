import { Route } from '@server/core/router';
import { AboutController } from '@server/controllers/about-controller';
import { BooksController } from '@server/controllers/books-controller';
import { Router } from 'express';

Route.get('/', async ({ res }) => {
    res.renderProps('home');
}).name('home.index');

Route.prefix('/salam').group(() => {
    Route.get('/:nama/:umur', AboutController.salam).name('about.salam')
});

Route.prefix('/books').group(() => {
    Route.get('/', BooksController.index).name('books.index')
    Route.post('/', BooksController.create).name('books.create')
});

export const web: Router = Route.getRouter()
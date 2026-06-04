# Lalase Framework

Lalase adalah **framework monolit berbasis Express** yang ringan dan *beginner-friendly*. Framework ini dirancang untuk kemudahan penggunaan dengan kombinasi powerful dari backend Express dan frontend React, lengkap dengan fitur-fitur modern seperti Server-Side Rendering (SSR), ORM yang powerful, dan template engine.

## Fitur Utama

- **Monolit Sederhana**: Semua dalam satu package — backend, frontend, dan database
- **Express-based**: Menggunakan Express sebagai core server
- **React + Vite**: Frontend modern dengan React 19 dan Vite 7
- **SSR dengan Inertia.js**: Server-side rendering yang seamless
- **Edge Template Engine**: Template engine powerful dari Edge.js
- **Vine.js Validation**: Validasi data yang type-safe
- **OERem ORM**: ORM ringan berbasis Knex.js untuk MySQL
- **Session Management**: Built-in session handling
- **Modular Architecture**: Middleware dan extension system yang fleksibel

## Instalasi

```bash
# Clone repository
git clone <repository-url>
cd lalase

# Install dependencies
pnpm install

# Jalankan development server
pnpm dev
```

Server akan running di `http://localhost:3000`

## Struktur Project

```
packages/framework/
├── src/
│   ├── client/           # Frontend React
│   │   ├── app.tsx
│   │   ├── ssr.tsx
│   │   ├── main.css
│   │   └── pages/        # React components/pages
│   ├── server/          # Backend Express
│   │   ├── config/      # Konfigurasi (app, database, middleware, dll)
│   │   ├── controllers/ # Controller handlers
│   │   ├── models/      # Database models
│   │   ├── routes/      # Route definitions
│   │   ├── middlewares/ # Custom middlewares
│   │   ├── lib/         # Utilities (route builder, inertia, dll)
│   │   └── extensions/  # Framework extensions
│   └── shared/           # Shared types
├── views/                # Edge templates
├── public/               # Static files
└── package.json
```

---

# Tutorial

## Tutorial 1: Membuat Route Baru

Lalase menggunakan sistem route builder yang fluent dan modular. Route didefinisikan di folder `src/server/routes/`.

### Contoh Membuat Route Sederhana

```typescript
// src/server/routes/web.ts
import { createRoute } from '@server/lib/route';

const route = createRoute();

// Route dasar GET
route.get('/about', async ({ res }) => {
    inertia.render('about', { message: 'Tentang Lalase Framework' });
}).name('about');

export default route.getRouter();
```

### Route dengan Parameter

```typescript
// Route dengan parameter URL
route.get('/users/:id', async ({ req, res }) => {
    const userId = req.params.id;
    inertia.render('users/show', { userId });
}).name('users.show');
```

### Route dengan Prefix Group

```typescript
// Menggunakan prefix dan group
route.prefix('/posts').group(() => {
    route.get('/', async ({ res }) => {
        inertia.render('posts/index', { posts: [] });
    }).name('posts.index');
    
    route.get('/comments', async ({ res }) => {
        inertia.render('posts/comments', { comments: [] });
    }).name('posts.comments');
});
```

---

## Tutorial 2: Membuat Controller

Controller menangani logika bisnis dan response. Setiap controller harus memenuhi interface `Controller`.

### Contoh Membuat Controller

```typescript
// src/server/controllers/post-controller.ts
import type { Controller } from "@server/types";

export default {
    async index({ res }) {
        // GET /posts
        const posts = await getPostsFromDatabase();
        inertia.render('posts/index', { posts });
    },

    async show({ req, res }) {
        // GET /posts/:id
        const post = await getPostById(req.params.id);
        inertia.render('posts/show', { post });
    },

    async store({ req, res }) {
        // POST /posts
        const newPost = await createPost(req.body);
        inertia.render('posts/show', { post: newPost });
    }

} satisfies Controller;
```

### Menghubungkan Route dengan Controller

```typescript
// src/server/routes/web.ts
import postController from '@server/controllers/post-controller';
import { createRoute } from '@server/lib/route';

const route = createRoute();

route.get('/posts', postController.index);
route.get('/posts/:id', postController.show);
route.post('/posts', postController.store);

export default route.getRouter();
```

### Contoh Komponen Halaman React

```typescript
// src/shared/models/types/post.ts
export type TPost = { id: number; title: string; content: string }
```

```typescript
// src/client/pages/posts/index.tsx
import {TPost} from '@shared/models/types/post'

type Props = { 
    posts: TPost[]
}

export default (props:Props) => {
    return (
        <div>
            <h1>Daftar Post</h1>
            <ul>
                {props.posts.map((post) => (
                    <li key={post.id}>{post.title}</li>
                ))}
            </ul>
        </div>
    );
}
```

```typescript
// src/client/pages/posts/show.tsx
import {TPost} from '@shared/models/types/post'

type Props = { 
    posts: TPost
}

export default (props:Props) => {
    return (
        <article>
            <h1>{post.title}</h1>
            <p>{post.content}</p>
        </article>
    );
}
```

---

## Tutorial 3: Menggunakan Model dan Database

Lalase menggunakan OERem sebagai ORM berbasis Knex.js. Model didefinisikan di `src/server/models/`.

### Membuat Model

```typescript
// src/server/models/post-model.ts
import type { Model } from "@lalase/oerem";
import { createModel } from "@server/config/database";
import {TPost} from '@shared/models/types/post'

export default createModel('posts', {
    // Kolom yang boleh diisi
    fillable: ['title', 'content', 'author_id'],
    // Kolom yang disembunyikan saat output
    hidden: ['deleted_at'],
}) as Model<TPost>;
```

### Menggunakan Model di Controller

```typescript
// src/server/controllers/post-controller.ts
import postModel from "@server/models/post-model";
import type { Controller } from "@server/types";

export default {
    async index({ res }) {
        // Mengambil semua data
        const posts = await postModel.all();
        inertia.render('posts/index', { posts });
    },

    async show({ req, res }) {
        // Mengambil data berdasarkan ID
        const post = await postModel.find(req.params.id);
        inertia.render('posts/show', { post });
    },

    async store({ req, res }) {
        // Membuat data baru
        const post = await postModel.create({
            title: req.body.title,
            content: req.body.content,
            author_id: req.body.author_id
        });
        inertia.back();
    },

    async update({ req, res }) {
        // Mengupdate data
        const post = await postModel.update(req.params.id, {
            title: req.body.title,
            content: req.body.content
        });
        inertia.back();
    },

    async delete({ req, res }) {
        // Menghapus data
        await postModel.delete(req.params.id);
        inertia.back();
    }

} satisfies Controller;
```

### Fitur Tambahan OERem

```typescript
// Eager Loading - Mengambil relasi
const users = await userModel.with('posts').all();

// Scope - Filter data
const activeUsers = await userModel.where('status', 'active').all();

// Transaction
await transaction(async (trx) => {
    await userModel.create({ name: 'John' }, trx);
    await postModel.create({ title: 'Hello' }, trx);
});
```

---

## Tutorial 4: Menggunakan Middleware

Lalase memiliki sistem middleware yang fleksibel — baik global maupun per-route.

### Membuat Custom Middleware

```typescript
// src/server/middlewares/logger-middleware.ts
import type { Middleware } from "@server/types";

export default (({ req, res, next }) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
}) as Middleware;
```

### Menggunakan Middleware di Route

```typescript
// src/server/routes/web.ts
import { createRoute } from '@server/lib/route';
import loggerMiddleware from '@server/middlewares/logger-middleware';

const route = createRoute();

// Middleware untuk route tertentu
route.middleware(loggerMiddleware).group(() => {
    route.get('/dashboard', async ({ res }) => {
        inertia.render('dashboard', { message: 'Dashboard' });
    });
});

// Atau langsung di route
route.get('/profile', async ({ res }) => {
    inertia.render('profile', { message: 'Profile' });
}).name('profile').middleware(loggerMiddleware);
```

### Menggunakan Auth Middleware

```typescript
// src/server/routes/web.ts
import authMiddleware from '@server/middlewares/auth-middleware';

const route = createRoute();

// Routes yang butuh authentication
route.prefix('/admin').group(() => {
    route.middleware(authMiddleware).group(() => {
        route.get('/dashboard', async ({ res }) => {
            inertia.render('admin/dashboard', { message: 'Admin Dashboard' });
        });
    });
});
```

---

## Tutorial 5: Membuat Extension

Lalase memiliki sistem extension yang fleksibel untuk menambahkan fitur baru ke aplikasi. Extension bisa menambahkan property ke `req` atau `res`, middleware, atau fitur lainnya.

### Anatomi Extension

Extension adalah fungsi yang menerima instance Express app dan memodifikasinya:

```typescript
// src/server/extensions/my-extension.ts
import type { AppExtension } from "@server/types";

export default (app: Express) => {
    // Tambahkan fitur di sini
}) as AppExtension;
```

### Menambahkan Property ke Request

Contoh extension yang menambahkan method `validate` ke request (seperti validation-extension.ts):

```typescript
// src/server/extensions/validation-extension.ts
import vine from '@vinejs/vine';
import { AuthorizationException, ValidationException } from '@server/lib/exception';
import type { AppExtension } from "@server/types";
import type { RequestDefinition } from "@server/types";

export default (app => {
    app.request.defineProperty('validate', function () {
        return async function (data, { schema, authorize }) {
            // Check authorization first
            if (authorize) {
                const isAuthorized = await authorize();
                if (!isAuthorized) {
                    throw new AuthorizationException();
                }
            }

            // Compile schema using VineJS
            const validator = vine.create(schema);

            try {
                // Validate data
                const output = await validator.validate(data);
                return output as any;
            } catch (error: any) {
                const errors: Record<string, string[]> = {};

                if (Array.isArray(error.messages)) {
                    for (const msg of error.messages) {
                        const field = msg.field || 'root';
                        if (!errors[field]) {
                            errors[field] = [];
                        }
                        errors[field].push(msg.message);
                    }
                    throw new ValidationException(errors, data);
                }

                if (error.messages && typeof error.messages === 'object') {
                    throw new ValidationException(error.messages, data);
                }

                throw new ValidationException({ root: [error.message || 'Validation failed'] }, data);
            }
        };
    });
}) as AppExtension;
```

Cara menggunakan di controller:

```typescript
// src/server/controllers/post-controller.ts
import type { Controller } from "@server/types";

export default {
    async store({ req, res }) {
        // Menggunakan method validate yang ditambahkan extension
        const data = await req.validate(req.body, {
            schema: {
                title: vine.string().minLength(3).maxLength(255),
                content: vine.string().minLength(10),
            }
        });
        
        const post = await postModel.create(data);
        inertia.back();
    }

} satisfies Controller;
```

### Menambahkan Property ke Response

Contoh extension yang menambahkan method ke response:

```typescript
// src/server/extensions/response-extension.ts
import type { AppExtension } from "@server/types";

export default (app => {
    app.response.defineProperty('jsonApi', function () {
        return function (data: any, statusCode: number = 200) {
            this.status(statusCode).json({
                success: statusCode >= 200 && statusCode < 400,
                data
            });
            return this;
        };
    });
}) as AppExtension;
```

### Menambahkan View Engine (Edge)

Extension juga bisa menambahkan template engine (seperti edge-extension.ts):

```typescript
// src/server/extensions/edge-extension.ts
import { Edge } from 'edge.js';
import type { AppExtension } from '@server/types';
import { APP_NAME } from '@server/config/constants';

export default (app => {
    app.engine(
        'edge',
        (filePath: string, options: object, callback: (err: Error | null, html?: string) => void): void => {
            const cache: boolean = app.settings['view cache'] || false;
            app.settings['view cache'] = cache;

            const edge = new Edge({ cache });
            edge.mount('default', app.settings.views);
            edge.global('_title', APP_NAME);

            try {
                const html = edge.renderSync(filePath, options);
                callback(null, html);
            } catch (error) {
                callback(error as any);
            }
        }
    );

    app.set('view engine', 'edge');
}) as AppExtension
```

### Register Extension

Extension perlu didaftarkan di config extension:

```typescript
// src/server/config/extension.ts
import inertiaExtension from '@server/extensions/inertia-extension';
import edgeExtension from '@server/extensions/edge-extension';
import validationExtension from '@server/extensions/validation-extension';

export const extensions = [
    inertiaExtension,
    edgeExtension,
    validationExtension,
];
```

### ⚠️ Penting: Update types.d.ts

Ketika menambahkan property baru ke `req` atau `res`, wajib update `packages/framework/src/server/types.d.ts`.

Contoh menambahkan property `validate` ke Request:

```typescript
// packages/framework/src/server/types.d.ts
declare global {
    namespace Express {
        interface Request {
            // ... property lain
            validate<T>(data: any, request: RequestDefinition): Promise<T>;
        }
    }
}
```

Contoh menambahkan property ke Response:

```typescript
// packages/framework/src/server/types.d.ts
declare global {
    namespace Express {
        interface Response {
            // ... property lain
            jsonApi(data: any, statusCode?: number): Response;
        }
    }
}
```

---

## Konfigurasi Environment

Buat file `.env` di root project:

```env
# Server
APP_PORT=3000
NODE_ENV=development

# Database
DB_CLIENT=mysql2
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_NAME=lalase_db

# Session
SESSION_SECRET=your-super-secret-key-change-this
```

## Build dan Deploy

```bash
# Build untuk production
pnpm build

# Jalankan production server
pnpm start
```

---

## Lisensi

MIT License - © 2025 Lalase Framework

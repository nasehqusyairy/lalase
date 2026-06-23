import { AsyncLocalStorage } from 'async_hooks';
import type { Request, Response } from 'express';

export const context = new AsyncLocalStorage<{ request: Request; response: Response }>();

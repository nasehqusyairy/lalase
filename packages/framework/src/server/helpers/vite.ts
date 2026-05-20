import { Vite, type ViteOptions } from "@server/lib/vite";

export const createVite = (options: ViteOptions) => new Vite(options);
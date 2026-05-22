import type { AppExtension } from "@server/types";
import vite from '@server/config/vite';

export default (app => {
    app.request.defineProperty('vite', function (req) {
        return {
            tags: async (entries) => await vite.resolveTags(req.originalUrl, entries),
            ssrRender: vite.ssrRender,
        };
    });
}) as AppExtension;

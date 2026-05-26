import type { AppExtension } from "@server/types";
import { Inertia } from '@server/lib/inertia';

export default (app => {
    app.response.defineProperty('inertia', function (res) {
        const req = res.req;
        const inertia = new Inertia();

        return {
            render: async (component, props) => await inertia.render(req, res, component, props),
            share: (key, value) => inertia.share(key, value, res),
            shareAll: (data) => inertia.shareAll(data, res),
            location: (url) => inertia.location(url, req, res),
            back: () => inertia.back(req, res),
        };
    });
}) as AppExtension

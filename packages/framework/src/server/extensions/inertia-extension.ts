import type { AppExtension } from "@server/types";
import { Inertia } from '@server/lib/inertia';

export default (app => {
    app.response.defineProperty('inertia', function (res) {
        const req = res.req;
        const inertia = new Inertia();

        return {
            render: async (component: string, props: any) => {
                return inertia.render(component, props, req, res);
            },

            share: (key: string, value: any) => {
                return inertia.share(key, value, res);
            },

            shareAll: (data: Record<string, any>) => {
                return inertia.shareAll(data, res);
            },

            location: (url: string) => {
                return inertia.location(url, req, res);
            },

            back: () => {
                return inertia.back(req, res);
            },
        };
    });
}) as AppExtension;

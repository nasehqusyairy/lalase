import type { AppExtension } from "@server/types";
import { Inertia } from '@server/lib/inertia';

/*
|-------------------------------------------------------------------------------------------
| Inertia Extension - Menambahkan inertia ke res
|
| Fungsi:
|   1. Menyediakan res.inertia.render() untuk render Inertia page
|   2. Menyediakan res.inertia.share() dan shareAll() untuk shared data
|   3. Menyediakan res.inertia.location() untuk hard redirect
|   4. Menyediakan res.inertia.back() untuk redirect ke referer
|-------------------------------------------------------------------------------------------
*/
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

import type { AppExtension } from "@server/types";

export default ((app) => {
    // ✅ Ambil SEBELUM defineProperty — masih menunjuk ke Express original
    const originalRedirect = app.response.redirect.bind(app.response);

    app.response.defineProperty('redirect', function (res) {
        return function (statusOrUrl: number | string, url?: string) {
            let status: number;
            let redirectUrl: string;

            if (typeof statusOrUrl === 'number') {
                status = statusOrUrl;
                redirectUrl = url || '/';
            } else {
                redirectUrl = statusOrUrl;
                status = 302;
            }

            const req = res.req;
            if (req) {
                const isInertia = req.headers['x-inertia'] === 'true';
                const isPostMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

                if (isInertia && isPostMethod && status === 302) {
                    status = 303;
                }
            }

            return originalRedirect.call(res, status, redirectUrl);
        };
    });
}) as AppExtension;
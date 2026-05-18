import type { AppExtension } from "@server/types";

export default ((app) => {
    /**
     * 1. Tambahkan metode defineProperty ke objek app.request
     */
    app.request.defineProperty = function (key: string, builder: (req: any) => any) {
        const cacheKey = Symbol(`__cache_req_${key}`);

        Object.defineProperty(this, key, {
            get() {
                // 'this' di sini adalah objek 'req' asli milik user pada request aktif
                if (!(cacheKey in this)) {
                    this[cacheKey] = builder(this);
                }
                return this[cacheKey];
            },
            configurable: true,
            enumerable: false
        });
    };

    /**
     * 2. Tambahkan metode defineProperty ke objek app.response
     */
    app.response.defineProperty = function (key: string, builder: (res: any) => any) {
        const cacheKey = Symbol(`__cache_res_${key}`);

        Object.defineProperty(this, key, {
            get() {
                // 'this' di sini adalah objek 'res' asli milik user pada request aktif
                if (!(cacheKey in this)) {
                    this[cacheKey] = builder(this);
                }
                return this[cacheKey];
            },
            configurable: true,
            enumerable: false
        });
    };
}) as AppExtension
import { getPath } from "@server/lib/path";
import type { AppExtension, PropertyBuilder } from "@server/types";

function defineProperty<T, K extends keyof T>(cachePrefix: string, obj: any, key: K, builder: PropertyBuilder<T, K>) {
    const cacheKey = Symbol(`${cachePrefix}${key as string}`);
    Object.defineProperty(obj, key, {
        get() {
            if (!(cacheKey in this)) {
                this[cacheKey] = builder(this);
            }
            return this[cacheKey];
        },
        configurable: true,
        enumerable: false
    });
}

export default (app => {
    app.request.defineProperty = function (key, builder) {
        defineProperty('__cache_req_', this, key, builder)
    };

    app.response.defineProperty = function (key, builder) {
        defineProperty('__cache_res_', this, key, builder)
    };

    app.set('views', getPath('views'))
}) as AppExtension
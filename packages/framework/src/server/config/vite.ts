import { APP_DEBUG, VITE_TYPE, VITE_PORT, VITE_MIDDLEWARE, VITE_MANIFEST } from "@server/config/constants";
import { createVite } from "@server/lib/vite";
import type { AppType } from "vite";

export default createVite({
    debug: APP_DEBUG,
    manifest: VITE_MANIFEST,
    config: {
        server: {
            middlewareMode: VITE_MIDDLEWARE,
            hmr: {
                port: VITE_PORT
            },
        },
        appType: VITE_TYPE as AppType,
    }
})
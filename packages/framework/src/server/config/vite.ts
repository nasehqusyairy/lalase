import { PRODUCTION, VITE_APP_TYPE, VITE_DEV_SERVER_PORT, VITE_IS_MIDDLEWARE_MODE, VITE_MANIFEST_PATH } from "@server/config/constants";
import { createVite } from "@server/lib/vite";

export default createVite({
    isProduction: PRODUCTION,
    manifest: VITE_MANIFEST_PATH,
    config: {
        server: {
            middlewareMode: VITE_IS_MIDDLEWARE_MODE,
            hmr: {
                port: VITE_DEV_SERVER_PORT
            },
        },
        appType: VITE_APP_TYPE,
    }
})
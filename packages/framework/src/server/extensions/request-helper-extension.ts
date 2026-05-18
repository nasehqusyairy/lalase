import type { AppExtension } from "@server/types";

/*
|-------------------------------------------------------------------------------------------
| Request Extension Helper - Adds request info to res.locals for extension access
| 
| This extension provides res.locals._req_ so that extensions can access
| request information (headers, method, etc.) when defining response properties.
|-------------------------------------------------------------------------------------------
*/
export default ((app) => {
    app.response.defineProperty('_req_', function (res) {
        // Will be set by middleware - returns undefined initially
        return undefined;
    });
}) as AppExtension;

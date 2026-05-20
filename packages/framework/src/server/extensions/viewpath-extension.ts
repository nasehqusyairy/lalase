import { getPath } from "@server/helpers/path";
import type { AppExtension } from "@server/types";

export default ((app) => {
    app.set('views', getPath('views'));

}) as AppExtension
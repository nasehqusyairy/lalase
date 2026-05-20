import { getPath } from "@server/lib/path";
import type { AppExtension } from "@server/types";

export default ((app) => app.set('views', getPath('views'))) as AppExtension
import { getPath } from "@server/helpers/path";
import type { Middleware } from "@server/types";

export default (({ app, next }) => {
    app.set('views', getPath('views'));

    next();
}) as Middleware;
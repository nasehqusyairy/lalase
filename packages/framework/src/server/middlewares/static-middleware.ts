import { STATIC_PATH } from "@server/config/constants";
import { getPath } from "@server/lib/path";
import type { Middleware } from "@server/types";
import express from 'express'

export default (({ req, res, next }) => express.static(getPath(STATIC_PATH), { index: false })(req, res, next)) as Middleware
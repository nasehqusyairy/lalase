import { STATIC_PATH } from "@server/config/app";
import { getPath } from "@server/helpers/path";
import type { Middleware } from "@server/types";
import express from 'express'

export default (({ req, res, next }) => {
    express.static(getPath(STATIC_PATH), { index: false })(req, res, next)
}) as Middleware
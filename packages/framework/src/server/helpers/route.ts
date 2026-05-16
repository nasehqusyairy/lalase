import { RouteBuilder } from "@server/lib/route";
import type { Application } from "express";

export const createRoute = (app: Application) => new RouteBuilder(app)

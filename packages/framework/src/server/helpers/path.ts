import { ROOT_PATH } from "@server/config/app";
import path from "path";

export const getPath = (...segments: string[]) => path.join(ROOT_PATH, ...segments)

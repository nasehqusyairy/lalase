import { ROOT_PATH } from "@server/config/constants";
import path from "path";

export const getPath = (...segments: string[]) => path.join(ROOT_PATH, ...segments)

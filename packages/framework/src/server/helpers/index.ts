import { ROOT_PATH } from "@server/core/config";
import path from "path";

/**
 * Get runtime path for files
 * In production, view/client files are in dist folder
 */
export function getPath(...segments: string[]): string {
    return path.join(ROOT_PATH, ...segments);
}

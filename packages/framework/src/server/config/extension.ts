import coreExtension from "@server/extensions/core-extension";
import edgeExtension from "@server/extensions/edge-extension";
import requestExtension from "@server/extensions/validation-extension";
import viteExtension from "@server/extensions/vite-extension";
import inertiaExtension from "@server/extensions/inertia-extension";
import type { AppExtension } from "@server/types";
import viewpathExtension from "@server/extensions/viewpath-extension";

export default [
    coreExtension,
    edgeExtension,
    requestExtension,
    viteExtension,
    inertiaExtension,
    viewpathExtension
] as AppExtension[];

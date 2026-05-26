import coreExtension from "@server/extensions/core-extension";
import inertiaExtension from "@server/extensions/inertia-extension";
import type { AppExtension } from "@server/types";

export default [
    coreExtension,
    inertiaExtension
] as AppExtension[];

import type { WithInput } from "../types/models";

/**
 * Ubah variasi input `with()` menjadi struktur callback seragam.
 *
 * Contoh:
 *  - 'posts.comments.user'
 *  - 'profile'
 *  - { posts: (q) => q.where('status','active') }
 *
 * Output:
 *  { posts: (child) => { child.with('comments.user'); modifier(child); } , ... }
 */
export function normalizeWith(...inputs: any[]): Record<string, (childBuilder: any) => any> {
    const registry: Record<string, { children: string[]; modifiers: Function[] }> = {};

    for (const item of inputs) {
        if (typeof item === "string") {
            const [first, ...rest] = item.split(".");
            if (!registry[first]) registry[first] = { children: [], modifiers: [] };
            if (rest.length > 0) registry[first].children.push(rest.join("."));
            continue;
        }

        if (typeof item === "object" && item !== null) {
            for (const [key, val] of Object.entries(item)) {
                if (!registry[key]) registry[key] = { children: [], modifiers: [] };
                if (typeof val === "function") registry[key].modifiers.push(val);
            }
        }
    }

    const normalized: Record<string, (childBuilder: any) => any> = {};
    for (const [relName, data] of Object.entries(registry)) {
        normalized[relName] = (childBuilder: any) => {
            data.modifiers.forEach((fn) => fn(childBuilder));
            if (data.children.length > 0) {
                childBuilder.with(...data.children);
            }
            return childBuilder;
        };
    }

    return normalized;
}

// Re-export type for consumers (kept to avoid unused warnings in some configs)
export type { WithInput };

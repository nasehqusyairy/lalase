export function deepTrim<T>(value: T): T {
    if (typeof value === 'string') {
        return value.trim() as unknown as T;
    }

    // Hindari trimming untuk objek native Node/Browser agar casting tetap aman
    if (value instanceof Date || value instanceof Buffer) {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map(v => deepTrim(v)) as unknown as T;
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([k, v]) => [k, deepTrim(v)])
        ) as unknown as T;
    }

    return value;
}
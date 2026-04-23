export function castValue<T>(value: any, defaultValue: T): T {
    if (value === undefined || value === null) return defaultValue;

    const targetType = typeof defaultValue;

    if (targetType === 'number') {
        const parsed = Number(value);
        return (isNaN(parsed) ? defaultValue : parsed) as unknown as T;
    }

    if (targetType === 'boolean') {
        if (typeof value === 'boolean') return value as unknown as T;
        return (value === 'true' || value === '1' || value === 'on') as unknown as T;
    }

    if (targetType === 'string') {
        return String(value) as unknown as T;
    }

    return value as T;
}
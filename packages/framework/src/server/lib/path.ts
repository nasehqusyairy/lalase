import path from "path";

export const getPath = (...segments: string[]) => path.join(path.resolve(process.cwd()), ...segments)

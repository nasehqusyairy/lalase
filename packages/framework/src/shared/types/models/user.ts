import type { TimeStampColumns } from "@lalase/oerem";

export type TUser = {
    id: number;
    name: string;
    email: string;
    password: string;

} & TimeStampColumns 
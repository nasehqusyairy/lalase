import { createPool } from "@lalase/oerem";
import { DB_CLIENT, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USERNAME } from "@server/config/db";

export default createPool({
    client: DB_CLIENT,
    connection: {
        host: DB_HOST,
        user: DB_USERNAME,
        password: DB_PASSWORD,
        port: DB_PORT,
        database: DB_NAME
    }
})
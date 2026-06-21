import { createPool, getOeremConfig } from "@lalase/oerem";

export default createPool((await getOeremConfig()).knex)
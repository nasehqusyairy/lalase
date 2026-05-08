const migrationTemplate = `
import db from '@server/database/db'
import {getSchemaBuilder} from '@lalase/oerem' 

export async function up(){
    // await getSchemaBuilder(db).createTable('table_name', (table) => {
    //         table.increments('id').primary();
    //         table.timestamps();
    // });
}

export async function down(){
    // await getSchemaBuilder(db).dropTableIfExists('table_name');
}
`;

export default migrationTemplate;

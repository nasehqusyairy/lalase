import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Role
  await knex.schema.createTable('roles', (table) => {
    table.bigIncrements('id').primary()
    table.string('name', 255).notNullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('roles')
}

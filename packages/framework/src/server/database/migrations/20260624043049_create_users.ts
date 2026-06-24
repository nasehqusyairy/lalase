import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // User
  await knex.schema.createTable('users', (table) => {
    table.bigIncrements('id').primary()
    table.string('name', 255).notNullable()
    table.string('email', 255).notNullable().unique()
    table.string('password', 255).notNullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users')
}

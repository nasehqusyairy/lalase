import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // UserRole
  await knex.schema.createTable('user_role', (table) => {
    table.bigIncrements('id').primary()
    table.bigInteger('user_id').unsigned().notNullable()
    table.bigInteger('role_id').unsigned().notNullable()

    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE')
    table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE').onUpdate('CASCADE')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_role')
}

import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Post
  await knex.schema.createTable('posts', (table) => {
    table.bigIncrements('id').primary()
    table.string('title', 255).notNullable()
    table.text('body').notNullable()
    table.bigInteger('user_id').unsigned().notNullable()

    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('posts')
}

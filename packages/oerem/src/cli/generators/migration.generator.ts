import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { FieldMeta, ModelDef, SqlColumnType } from '../../schema/types.js'
import type { DiscoveredModel } from '../scanner.js'

// ─── Knex column builder call from FieldMeta ─────────────────────────────────

function fieldToKnexCall(columnName: string, meta: FieldMeta): string {
    const chain: string[] = [baseKnexCall(columnName, meta)]

    if (meta.isPrimary) {
        chain.push('primary()')
    }

    if (meta.isNullable) {
        chain.push('nullable()')
    } else if (!meta.isPrimary) {
        chain.push('notNullable()')
    }

    if (meta.isUnique) {
        chain.push('unique()')
    }

    if (meta.defaultValue !== undefined) {
        const val = typeof meta.defaultValue === 'string'
            ? `'${meta.defaultValue}'`
            : String(meta.defaultValue)
        chain.push(`defaultTo(${val})`)
    }

    return `    table.${chain.join('.')}`
}

function baseKnexCall(columnName: string, meta: FieldMeta): string {
    const unsigned = meta.isUnsigned ? '.unsigned()' : ''

    switch (meta.type as SqlColumnType) {
        case 'varchar':
            return `string('${columnName}', ${meta.length ?? 255})`

        case 'text':
            return `text('${columnName}')`

        case 'int':
            return meta.isPrimary
                ? `increments('${columnName}')`
                : `integer('${columnName}')${unsigned}`

        case 'bigint':
            return meta.isPrimary
                ? `bigIncrements('${columnName}')`
                : `bigInteger('${columnName}')${unsigned}`

        case 'boolean':
            return `boolean('${columnName}')`

        case 'date':
            return `date('${columnName}')`

        case 'dateTime':
            return `dateTime('${columnName}')`

        case 'timestamp':
            return `timestamp('${columnName}')`

        case 'decimal':
            return `decimal('${columnName}', ${meta.precision ?? 8}, ${meta.scale ?? 2})${unsigned}`

        case 'float':
            return `float('${columnName}')${unsigned}`

        case 'json':
            return `json('${columnName}')`

        case 'jsonb':
            return `jsonb('${columnName}')`

        case 'uuid':
            return meta.isPrimary
                ? `uuid('${columnName}').primary().defaultTo(knex.fn.uuid())`
                : `uuid('${columnName}')`

        case 'enum':
            const vals = (meta.enumValues ?? []).map(v => `'${v}'`).join(', ')
            return `enum('${columnName}', [${vals}])`

        default:
            return `specificType('${columnName}', '${meta.type}')`
    }
}

// ─── Foreign Key constraint lines ─────────────────────────────────────────────

function foreignKeyLines(schema: ModelDef['schema']): string[] {
    const lines: string[] = []

    for (const [col, meta] of Object.entries(schema)) {
        if (!meta.foreign?.isForeign) continue

        if (meta.foreign.referencesTable) {
            const refTable = meta.foreign.referencesTable
            const refCol = meta.foreign.referencesColumn ?? 'id'
            let line = `    table.foreign('${col}').references('${refCol}').inTable('${refTable}')`

            if (meta.foreign.cascadeOn?.includes('delete')) {
                line += `.onDelete('CASCADE')`
            }
            if (meta.foreign.cascadeOn?.includes('update')) {
                line += `.onUpdate('CASCADE')`
            }

            lines.push(line)
        }
    }

    return lines
}

// ─── Generate migration file content ─────────────────────────────────────────

function generateMigrationContent(models: DiscoveredModel[]): string {
    const upBlocks: string[] = []
    const downBlocks: string[] = []

    for (const model of models) {
        const { def } = model
        const columnLines: string[] = []

        for (const [colName, meta] of Object.entries(def.schema)) {
            // Skip uuid primary — already handled with defaultTo(knex.fn.uuid())
            columnLines.push(fieldToKnexCall(colName, meta))
        }

        const fkLines = foreignKeyLines(def.schema)

        const needsKnexRef = Object.values(def.schema).some(
            m => m.type === 'uuid' && m.isPrimary
        )

        const upTableLines = [
            `  // ${def.identifier}`,
            `  await knex.schema.createTable('${def.table}', (table) => {`,
            ...columnLines,
            ...(fkLines.length > 0 ? ['', ...fkLines] : []),
            `  })`,
        ]

        upBlocks.push(upTableLines.join('\n'))
        downBlocks.push(`  await knex.schema.dropTableIfExists('${def.table}')`)
    }

    const knexParam = models.some(m =>
        Object.values(m.def.schema).some(f => f.type === 'uuid' && f.isPrimary)
    ) ? 'knex' : 'knex'

    return [
        `import type { Knex } from 'knex'`,
        ``,
        `export async function up(knex: Knex): Promise<void> {`,
        upBlocks.join('\n\n'),
        `}`,
        ``,
        `export async function down(knex: Knex): Promise<void> {`,
        // Reverse order for dropping (respect FK dependencies)
        [...downBlocks].reverse().join('\n'),
        `}`,
        ``,
    ].join('\n')
}

// ─── Timestamp prefix ─────────────────────────────────────────────────────────

function migrationTimestamp(): string {
    return new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
}

// ─── Public: generate migration file ─────────────────────────────────────────

export function generateMigration(
    models: DiscoveredModel[],
    migrationsFolder: string,
    name: string = 'create_tables',
): string {
    if (!existsSync(migrationsFolder)) {
        throw new Error(
            `Migrations folder not found: ${migrationsFolder}\n` +
            `Create the folder and set "migrationsFolder" in oerem.config.ts`
        )
    }

    const fileName = `${migrationTimestamp()}_${name}.ts`
    const filePath = resolve(migrationsFolder, fileName)
    const content = generateMigrationContent(models)

    writeFileSync(filePath, content, 'utf-8')
    console.log(`  ✔ Generated migration: ${fileName}`)

    return filePath
}

// ─── Simulate: apply schema directly without migration file ──────────────────

export async function simulateSchema(
    models: DiscoveredModel[],
    knexConfig: import('knex').Knex.Config,
): Promise<void> {
    const { default: Knex } = await import('knex')
    const knex = Knex(knexConfig)

    try {
        for (const model of models) {
            const { def } = model
            const exists = await knex.schema.hasTable(def.table)

            if (exists) {
                console.log(`  ~ Altering table: ${def.table}`)
                await knex.schema.alterTable(def.table, (table) => {
                    applySchemaToTable(table, def)
                })
            } else {
                console.log(`  + Creating table: ${def.table}`)
                await knex.schema.createTable(def.table, (table) => {
                    applySchemaToTable(table, def)
                    applyForeignKeys(table, def)
                })
            }
        }

        console.log('  ✔ Simulate complete.')
    } finally {
        await knex.destroy()
    }
}

// ─── Apply schema fields to knex TableBuilder ─────────────────────────────────

function applySchemaToTable(
    table: import('knex').Knex.CreateTableBuilder,
    def: ModelDef,
): void {
    for (const [colName, meta] of Object.entries(def.schema)) {
        let col: import('knex').Knex.ColumnBuilder

        switch (meta.type as SqlColumnType) {
            case 'varchar':
                col = table.string(colName, meta.length ?? 255); break
            case 'text':
                col = table.text(colName); break
            case 'int':
                col = meta.isPrimary ? table.increments(colName) : table.integer(colName)
                if (meta.isUnsigned) col = col.unsigned()
                break
            case 'bigint':
                col = meta.isPrimary ? table.bigIncrements(colName) : table.bigInteger(colName)
                if (meta.isUnsigned) col = col.unsigned()
                break
            case 'boolean':
                col = table.boolean(colName); break
            case 'date':
                col = table.date(colName); break
            case 'dateTime':
                col = table.dateTime(colName); break
            case 'timestamp':
                col = table.timestamp(colName); break
            case 'decimal':
                col = table.decimal(colName, meta.precision, meta.scale)
                if (meta.isUnsigned) col = col.unsigned()
                break
            case 'float':
                col = table.float(colName)
                if (meta.isUnsigned) col = col.unsigned()
                break
            case 'json':
                col = table.json(colName); break
            case 'jsonb':
                col = table.jsonb(colName); break
            case 'uuid':
                col = table.uuid(colName)
                if (meta.isPrimary) col = col.primary()
                break
            case 'enum':
                col = table.enum(colName, meta.enumValues ?? []); break
            default:
                col = table.specificType(colName, meta.type)
        }

        if (meta.isNullable) {
            col.nullable()
        } else if (!meta.isPrimary) {
            col.notNullable()
        }

        if (meta.isUnique) col.unique()
        if (meta.defaultValue !== undefined) col.defaultTo(meta.defaultValue as any)
    }
}

function applyForeignKeys(
    table: import('knex').Knex.CreateTableBuilder,
    def: ModelDef,
): void {
    for (const [col, meta] of Object.entries(def.schema)) {
        if (!meta.foreign?.referencesTable) continue

        const fk = table
            .foreign(col)
            .references(meta.foreign.referencesColumn ?? 'id')
            .inTable(meta.foreign.referencesTable)

        if (meta.foreign.cascadeOn?.includes('delete')) fk.onDelete('CASCADE')
        if (meta.foreign.cascadeOn?.includes('update')) fk.onUpdate('CASCADE')
    }
}
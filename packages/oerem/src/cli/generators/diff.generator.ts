import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ModelDef } from '../../schema/types.js'
import type { DiscoveredModel } from '../scanner.js'
import {
    createSnapshot,
    diffSchemas,
    serializeModel,
    type SchemaSnapshot,
    type TableDiff,
    type ColumnChange,
    type SnapshotFieldMeta,
} from './snapshot.js'
import { generateMigration } from './migration.generator.js'

// ─── Snapshot file path ───────────────────────────────────────────────────────

const SNAPSHOT_FILENAME = '.oerem-snapshot.json'

export function snapshotPath(cwd: string): string {
    return resolve(cwd, SNAPSHOT_FILENAME)
}

// ─── Save / load snapshot ─────────────────────────────────────────────────────

export function saveSnapshot(models: ModelDef[], cwd: string): void {
    const snapshot = createSnapshot(models)
    writeFileSync(snapshotPath(cwd), JSON.stringify(snapshot, null, 2), 'utf-8')
    console.log(`  ✔ Snapshot saved: ${SNAPSHOT_FILENAME}`)
}

export function loadSnapshot(cwd: string): SchemaSnapshot | null {
    const path = snapshotPath(cwd)
    if (!existsSync(path)) return null

    try {
        return JSON.parse(readFileSync(path, 'utf-8')) as SchemaSnapshot
    } catch {
        throw new Error(`Failed to parse snapshot file at ${path}. It may be corrupted.`)
    }
}

// ─── Sort table diffs by dependency ────────────────────────────────────────────

/**
 * Sorts table diffs by their FK dependency level.
 * Tables that are created first (no FK) come first.
 * Tables being dropped come last in reverse order.
 */
function sortTableDiffsByDependency(tableDiffs: TableDiff[]): TableDiff[] {
    if (tableDiffs.length <= 1) return tableDiffs

    // Get all table names from the diffs
    const tableNames = new Set<string>()
    for (const td of tableDiffs) {
        tableNames.add(td.table)
    }

    // Build dependency map: referenced table -> tables that reference it
    const dependentsMap = new Map<string, string[]>()

    for (const td of tableDiffs) {
        for (const cc of td.columnChanges) {
            if (cc.after?.foreign?.referencesTable) {
                const refTable = cc.after.foreign.referencesTable
                if (tableNames.has(refTable)) {
                    const deps = dependentsMap.get(refTable) || []
                    deps.push(td.table)
                    dependentsMap.set(refTable, deps)
                }
            }
        }
    }

    // Separate created/altered from dropped
    const toCreateOrAlter = tableDiffs.filter(td => td.changeType !== 'dropped')
    const toDrop = tableDiffs.filter(td => td.changeType === 'dropped')

    // Calculate levels for created/altered tables
    const levels = new Map<string, number>()

    function calculateLevel(table: string, seen: Set<string>): number {
        if (levels.has(table)) return levels.get(table)!
        if (seen.has(table)) return 0

        seen.add(table)
        let maxLevel = 0

        const dependents = dependentsMap.get(table) || []
        for (const dependent of dependents) {
            if (seen.has(dependent)) continue
            const level = calculateLevel(dependent, new Set(seen))
            maxLevel = Math.max(maxLevel, level + 1)
        }

        levels.set(table, maxLevel)
        return maxLevel
    }

    // Calculate levels
    for (const td of toCreateOrAlter) {
        calculateLevel(td.table, new Set())
    }

    // Sort created/altered by level, then by table name for stability
    const sorted = [...toCreateOrAlter].sort((a, b) => {
        const levelA = levels.get(a.table) ?? 0
        const levelB = levels.get(b.table) ?? 0
        if (levelA !== levelB) return levelA - levelB
        return a.table.localeCompare(b.table)
    })

    // Dropped tables in reverse order (drop dependent first, then referenced)
    const droppedSorted = [...toDrop].sort((a, b) => {
        const levelA = levels.get(a.table) ?? 0
        const levelB = levels.get(b.table) ?? 0
        if (levelA !== levelB) return levelB - levelA // Reverse!
        return b.table.localeCompare(a.table)
    })

    return [...sorted, ...droppedSorted]
}

// ─── Diff migration generator ─────────────────────────────────────────────────

export function generateDiffMigration(
    models: DiscoveredModel[],
    cwd: string,
    migrationsFolder: string,
    name: string = 'schema_update',
): string | null {
    const previous = loadSnapshot(cwd)
    const currentSnapshot = createSnapshot(models.map(m => m.def))

    if (!previous) {
        console.log('  ℹ No snapshot found. Generating full create migration.')
        const filePath = generateMigration(models, migrationsFolder, name)
        saveSnapshot(models.map(m => m.def), cwd)
        return filePath
    }

    const diff = diffSchemas(previous, currentSnapshot)

    if (!diff.hasChanges) {
        console.log('  ✔ No schema changes detected. Nothing to migrate.')
        return null
    }

    for (const td of diff.tableDiffs) {
        if (td.changeType === 'created') {
            console.log(`  + Table created: ${td.table}`)
        } else if (td.changeType === 'dropped') {
            console.log(`  - Table dropped: ${td.table}`)
        } else {
            for (const cc of td.columnChanges) {
                const symbol = cc.changeType === 'added' ? '+' : cc.changeType === 'removed' ? '-' : '~'
                console.log(`  ${symbol} ${td.table}.${cc.column} (${cc.changeType})`)
            }
        }
    }

    // Sort by dependency and generate one file per table
    const sortedDiffs = sortTableDiffsByDependency(diff.tableDiffs)
    const baseTime = baseTimestamp()
    let firstFilePath: string | undefined

    for (let i = 0; i < sortedDiffs.length; i++) {
        const td = sortedDiffs[i]
        const timestamp = calculateMigrationTimestamp(baseTime, i)

        const content = buildDiffMigrationContent([td])
        const tableName = td.table
        let changeType = td.changeType
        const fileName = `${timestamp}_${changeType}_${tableName}.ts`
        const filePath = resolve(migrationsFolder, fileName)

        writeFileSync(filePath, content, 'utf-8')
        console.log(`  ✔ Generated migration: ${fileName}`)

        if (!firstFilePath) firstFilePath = filePath
    }

    saveSnapshot(models.map(m => m.def), cwd)

    return firstFilePath || ''
}

function baseTimestamp(): string {
    return new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
}

function calculateMigrationTimestamp(baseTimestamp: string, level: number): string {
    const prefix = baseTimestamp.slice(0, 8)
    const suffix = baseTimestamp.slice(8)
    const suffixNum = parseInt(suffix, 10)
    const newSuffix = String(suffixNum + level * 1000).padStart(6, '0')
    return prefix + newSuffix
}

// ─── Build migration file content from diff ───────────────────────────────────

function buildDiffMigrationContent(tableDiffs: TableDiff[]): string {
    const upLines: string[] = []
    const downLines: string[] = []

    for (const td of tableDiffs) {
        switch (td.changeType) {
            case 'created': {
                upLines.push(...buildCreateTableBlock(td))
                downLines.push(`  await knex.schema.dropTableIfExists('${td.table}')`)
                break
            }

            case 'dropped': {
                // Can't auto-generate down for dropped tables reliably — leave a comment
                upLines.push(`  await knex.schema.dropTableIfExists('${td.table}')`)
                downLines.push(
                    `  // TODO: restore dropped table "${td.table}" manually if needed`
                )
                break
            }

            case 'altered': {
                upLines.push(...buildAlterTableBlock(td, 'up'))
                downLines.push(...buildAlterTableBlock(td, 'down'))
                break
            }
        }
    }

    return [
        `import type { Knex } from 'knex'`,
        ``,
        `export async function up(knex: Knex): Promise<void> {`,
        upLines.join('\n'),
        `}`,
        ``,
        `export async function down(knex: Knex): Promise<void> {`,
        downLines.join('\n'),
        `}`,
        ``,
    ].join('\n')
}

// ─── Build createTable block for new tables ───────────────────────────────────

function buildCreateTableBlock(td: TableDiff): string[] {
    const columnLines = td.columnChanges
        .filter(c => c.changeType === 'added' && c.after)
        .map(c => columnToKnex(c.column, c.after!))

    const fkLines: string[] = []
    for (const c of td.columnChanges) {
        if (c.after?.foreign?.referencesTable) {
            const { referencesTable, referencesColumn = 'id', cascadeOn } = c.after.foreign
            let line = `    table.foreign('${c.column}').references('${referencesColumn}').inTable('${referencesTable}')`
            if (cascadeOn?.includes('delete')) line += `.onDelete('CASCADE')`
            if (cascadeOn?.includes('update')) line += `.onUpdate('CASCADE')`
            fkLines.push(line)
        }
    }

    return [
        `  await knex.schema.createTable('${td.table}', (table) => {`,
        ...columnLines,
        ...(fkLines.length > 0 ? ['', ...fkLines] : []),
        `  })`,
    ]
}

// ─── Build alterTable block ───────────────────────────────────────────────────

function buildAlterTableBlock(td: TableDiff, direction: 'up' | 'down'): string[] {
    const innerLines: string[] = []

    for (const cc of td.columnChanges) {
        if (direction === 'up') {
            innerLines.push(...columnChangeToKnex(cc, 'up'))
        } else {
            innerLines.push(...columnChangeToKnex(cc, 'down'))
        }
    }

    if (innerLines.length === 0) return []

    return [
        `  await knex.schema.alterTable('${td.table}', (table) => {`,
        ...innerLines,
        `  })`,
    ]
}

function columnChangeToKnex(cc: ColumnChange, direction: 'up' | 'down'): string[] {
    const meta = direction === 'up' ? cc.after : cc.before
    const reverseMeta = direction === 'up' ? cc.before : cc.after

    switch (cc.changeType) {
        case 'added': {
            if (direction === 'up' && meta) {
                return [`    ${columnToKnex(cc.column, meta, true)}`]
            }
            if (direction === 'down') {
                return [`    table.dropColumn('${cc.column}')`]
            }
            return []
        }

        case 'removed': {
            if (direction === 'up') {
                return [`    table.dropColumn('${cc.column}')`]
            }
            if (direction === 'down' && reverseMeta) {
                return [`    ${columnToKnex(cc.column, reverseMeta, true)}`]
            }
            return []
        }

        case 'type_changed':
        case 'nullable_changed':
        case 'default_changed': {
            if (meta) {
                return [`    ${columnToKnex(cc.column, meta, true, true)}`]
            }
            return []
        }

        case 'unique_changed': {
            if (direction === 'up') {
                if (cc.after?.isUnique) {
                    return [`    table.unique(['${cc.column}'])`]
                } else {
                    return [`    table.dropUnique(['${cc.column}'])`]
                }
            } else {
                if (cc.before?.isUnique) {
                    return [`    table.unique(['${cc.column}'])`]
                } else {
                    return [`    table.dropUnique(['${cc.column}'])`]
                }
            }
        }

        case 'foreign_changed': {
            const lines: string[] = []
            // Drop old FK first
            lines.push(`    table.dropForeign(['${cc.column}'])`)
            // Add new FK if present
            const fkMeta = direction === 'up' ? cc.after?.foreign : cc.before?.foreign
            if (fkMeta?.referencesTable) {
                let line = `    table.foreign('${cc.column}').references('${fkMeta.referencesColumn ?? 'id'}').inTable('${fkMeta.referencesTable}')`
                if (fkMeta.cascadeOn?.includes('delete')) line += `.onDelete('CASCADE')`
                if (fkMeta.cascadeOn?.includes('update')) line += `.onUpdate('CASCADE')`
                lines.push(line)
            }
            return lines
        }

        default:
            return []
    }
}

// ─── Single column → knex call ────────────────────────────────────────────────

function columnToKnex(
    col: string,
    meta: SnapshotFieldMeta,
    inAlterTable = false,
    alter = false,
): string {
    const chain: string[] = [baseColumnCall(col, meta)]
    const alterSuffix = alter ? '.alter()' : ''

    if (meta.isPrimary && !inAlterTable) chain.push('primary()')
    if (meta.isNullable) chain.push('nullable()')
    else if (!meta.isPrimary) chain.push('notNullable()')
    if (meta.isUnique && !inAlterTable) chain.push('unique()')
    if (meta.defaultValue !== undefined) {
        const val = typeof meta.defaultValue === 'string'
            ? `'${meta.defaultValue}'`
            : String(meta.defaultValue)
        chain.push(`defaultTo(${val})`)
    }

    return `    table.${chain.join('.')}${alterSuffix}`
}

function baseColumnCall(col: string, meta: SnapshotFieldMeta): string {
    switch (meta.type) {
        case 'varchar': return `string('${col}', ${meta.length ?? 255})`
        case 'text': return `text('${col}')`
        case 'integer': return meta.isPrimary ? `increments('${col}')` : `integer('${col}')`
        case 'bigInteger': return meta.isPrimary ? `bigIncrements('${col}')` : `bigInteger('${col}')`
        case 'boolean': return `boolean('${col}')`
        case 'date': return `date('${col}')`
        case 'dateTime': return `dateTime('${col}')`
        case 'timestamp': return `timestamp('${col}')`
        case 'decimal': return `decimal('${col}', ${meta.precision ?? 8}, ${meta.scale ?? 2})`
        case 'float': return `float('${col}')`
        case 'json': return `json('${col}')`
        case 'jsonb': return `jsonb('${col}')`
        case 'uuid': return `uuid('${col}')`
        case 'enum': {
            const vals = (meta.enumValues ?? []).map(v => `'${v}'`).join(', ')
            return `enum('${col}', [${vals}])`
        }
        default: return `specificType('${col}', '${meta.type}')`
    }
}

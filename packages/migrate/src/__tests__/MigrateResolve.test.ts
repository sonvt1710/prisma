// describeMatrix is making eslint unhappy about the test names
/* eslint-disable jest/no-identical-title */

import { MigrateResolve } from '../commands/MigrateResolve'
import { cockroachdbOnly, describeMatrix, postgresOnly, sqliteOnly } from './__helpers__/conditionalTests'
import { createDefaultTestContext } from './__helpers__/context'

const ctx = createDefaultTestContext()

describe('common', () => {
  it('should fail if no schema file', async () => {
    ctx.fixture('empty')
    const result = MigrateResolve.new().parse([], await ctx.config())
    await expect(result).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Could not find Prisma Schema that is required for this command.
      You can either provide it with \`--schema\` argument,
      set it in your Prisma Config file (e.g., \`prisma.config.ts\`),
      set it as \`prisma.schema\` in your package.json,
      or put it into the default location (\`./prisma/schema.prisma\`, or \`./schema.prisma\`.
      Checked following paths:

      schema.prisma: file not found
      prisma/schema.prisma: file not found

      See also https://pris.ly/d/prisma-schema-location"
    `)
  })
  it('should fail if no --applied or --rolled-back', async () => {
    ctx.fixture('schema-only-sqlite')
    const result = MigrateResolve.new().parse([], await ctx.config())
    await expect(result).rejects.toThrowErrorMatchingInlineSnapshot(`
      "--applied or --rolled-back must be part of the command like:
      prisma migrate resolve --applied 20201231000000_example
      prisma migrate resolve --rolled-back 20201231000000_example"
    `)
  })
  it('should fail if both --applied or --rolled-back', async () => {
    ctx.fixture('schema-only-sqlite')
    const result = MigrateResolve.new().parse(
      ['--applied=something_applied', '--rolled-back=something_rolledback'],
      await ctx.config(),
    )
    await expect(result).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Pass either --applied or --rolled-back, not both."`,
    )
  })
})

describeMatrix(sqliteOnly, 'SQLite', () => {
  it('should fail if no sqlite db - empty schema', async () => {
    ctx.fixture('schema-only-sqlite')
    const result = MigrateResolve.new().parse(
      ['--schema=./prisma/empty.prisma', '--applied=something_applied'],
      await ctx.config(),
    )
    await expect(result).rejects.toMatchInlineSnapshot(`"P1003: Database \`dev.db\` does not exist"`)

    expect(ctx.normalizedCapturedStdout()).toMatchInlineSnapshot(`
      "Prisma schema loaded from prisma/empty.prisma
      Datasource "my_db": SQLite database "dev.db" <location placeholder>
      "
    `)
  })

  //
  // --applied
  //

  it("--applied should fail if migration doesn't exist", async () => {
    ctx.fixture('existing-db-1-failed-migration')
    const result = MigrateResolve.new().parse(['--applied=does_not_exist'], await ctx.config())
    await expect(result).rejects.toThrowErrorMatchingInlineSnapshot(`
      "P3017

      The migration does_not_exist could not be found. Please make sure that the migration exists, and that you included the whole name of the directory. (example: "20201231000000_initial_migration")
      "
    `)
  })

  it('--applied should fail if migration is already applied', async () => {
    ctx.fixture('existing-db-1-migration')
    const result = MigrateResolve.new().parse(['--applied=20201014154943_init'], await ctx.config())
    await expect(result).rejects.toThrowErrorMatchingInlineSnapshot(`
      "P3008

      The migration \`20201231000000_init\` is already recorded as applied in the database.
      "
    `)
  })

  it('--applied should fail if migration is not in a failed state', async () => {
    ctx.fixture('existing-db-1-migration')
    const result = MigrateResolve.new().parse(['--applied', '20201014154943_init'], await ctx.config())
    await expect(result).rejects.toThrowErrorMatchingInlineSnapshot(`
      "P3008

      The migration \`20201231000000_init\` is already recorded as applied in the database.
      "
    `)
  })

  it('--applied should work on a failed migration', async () => {
    ctx.fixture('existing-db-1-failed-migration')
    const result = MigrateResolve.new().parse(['--applied', '20201106130852_failed'], await ctx.config())
    await expect(result).resolves.toMatchInlineSnapshot(`""`)
    expect(ctx.normalizedCapturedStdout()).toMatchInlineSnapshot(`
      "Prisma schema loaded from prisma/schema.prisma
      Datasource "my_db": SQLite database "dev.db" <location placeholder>

      Migration 20201231000000_failed marked as applied.
      "
    `)
  })

  it('--applied should work on a failed migration (schema folder)', async () => {
    ctx.fixture('schema-folder-sqlite-migration-failed')
    const result = MigrateResolve.new().parse(
      ['--schema=./prisma', '--applied', '20240527130802_init'],
      await ctx.config(),
    )
    await expect(result).resolves.toMatchInlineSnapshot(`""`)
    expect(ctx.normalizedCapturedStdout()).toMatchInlineSnapshot(`
      "Prisma schema loaded from prisma
      Datasource "my_db": SQLite database "dev.db" <location placeholder>

      Migration 20201231000000_init marked as applied.
      "
    `)
  })

  //
  // --rolled-back
  //

  it("--rolled-back should fail if migration doesn't exist", async () => {
    ctx.fixture('existing-db-1-failed-migration')
    const result = MigrateResolve.new().parse(['--rolled-back=does_not_exist'], await ctx.config())
    await expect(result).rejects.toThrowErrorMatchingInlineSnapshot(`
      "P3011

      Migration \`does_not_exist\` cannot be rolled back because it was never applied to the database. Hint: did you pass in the whole migration name? (example: "20201231000000_initial_migration")
      "
    `)
  })

  it('--rolled-back should fail if migration is not in a failed state', async () => {
    ctx.fixture('existing-db-1-migration')
    const result = MigrateResolve.new().parse(['--rolled-back', '20201014154943_init'], await ctx.config())
    await expect(result).rejects.toThrowErrorMatchingInlineSnapshot(`
      "P3012

      Migration \`20201231000000_init\` cannot be rolled back because it is not in a failed state.
      "
    `)
  })

  it('--rolled-back should work on a failed migration', async () => {
    ctx.fixture('existing-db-1-failed-migration')
    const result = MigrateResolve.new().parse(['--rolled-back', '20201106130852_failed'], await ctx.config())
    await expect(result).resolves.toMatchInlineSnapshot(`""`)
    expect(ctx.normalizedCapturedStdout()).toMatchInlineSnapshot(`
      "Prisma schema loaded from prisma/schema.prisma
      Datasource "my_db": SQLite database "dev.db" <location placeholder>

      Migration 20201231000000_failed marked as rolled back.
      "
    `)
  })

  it('--rolled-back works if migration is already rolled back', async () => {
    ctx.fixture('existing-db-1-failed-migration')
    const result = MigrateResolve.new().parse(['--rolled-back', '20201106130852_failed'], await ctx.config())
    await expect(result).resolves.toMatchInlineSnapshot(`""`)

    // Try again
    const result2 = MigrateResolve.new().parse(['--rolled-back', '20201106130852_failed'], await ctx.config())
    await expect(result2).resolves.toMatchInlineSnapshot(`""`)

    expect(ctx.normalizedCapturedStdout()).toMatchInlineSnapshot(`
      "Prisma schema loaded from prisma/schema.prisma
      Datasource "my_db": SQLite database "dev.db" <location placeholder>

      Migration 20201231000000_failed marked as rolled back.
      Prisma schema loaded from prisma/schema.prisma
      Datasource "my_db": SQLite database "dev.db" <location placeholder>

      Migration 20201231000000_failed marked as rolled back.
      "
    `)
  })
})

describeMatrix(postgresOnly, 'postgres', () => {
  it('should fail if no db - invalid url', async () => {
    ctx.fixture('schema-only-postgresql')
    jest.setTimeout(10_000)

    const result = MigrateResolve.new().parse(
      ['--schema=./prisma/invalid-url.prisma', '--applied=something_applied'],
      await ctx.config(),
    )
    await expect(result).rejects.toMatchInlineSnapshot(`
      "P1001: Can't reach database server at \`doesnotexist:5432\`

      Please make sure your database server is running at \`doesnotexist:5432\`."
    `)

    expect(ctx.normalizedCapturedStderr()).toMatchInlineSnapshot(`
      "Environment variables loaded from prisma/.env
      "
    `)
    expect(ctx.normalizedCapturedStdout()).toMatchInlineSnapshot(`
      "Prisma schema loaded from prisma/invalid-url.prisma
      Datasource "my_db": PostgreSQL database "mydb", schema "public" <location placeholder>
      "
    `)
  })
})

describeMatrix(cockroachdbOnly, 'cockroachdb', () => {
  it('should fail if no db - invalid url', async () => {
    ctx.fixture('schema-only-cockroachdb')

    const result = MigrateResolve.new().parse(
      ['--schema=./prisma/invalid-url.prisma', '--applied=something_applied'],
      await ctx.config(),
    )
    await expect(result).rejects.toMatchInlineSnapshot(`
      "P1001: Can't reach database server at \`something.cockroachlabs.cloud:26257\`

      Please make sure your database server is running at \`something.cockroachlabs.cloud:26257\`."
    `)

    expect(ctx.normalizedCapturedStderr()).toMatchInlineSnapshot(`
      "Environment variables loaded from prisma/.env
      "
    `)
    expect(ctx.normalizedCapturedStdout()).toMatchInlineSnapshot(`
      "Prisma schema loaded from prisma/invalid-url.prisma
      Datasource "db": CockroachDB database "clustername.defaultdb", schema "public" <location placeholder>
      "
    `)
  }, 10_000)
})

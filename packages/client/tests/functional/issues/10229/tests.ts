import type { PrismaClientInitializationError } from '../../../../src/runtime/core/errors/PrismaClientInitializationError'
import testMatrix from './_matrix'
// @ts-ignore
import type { PrismaClient } from './generated/prisma/client'

declare let prisma: PrismaClient

// https://github.com/prisma/prisma/issues/10229
testMatrix.setupTestSuite(
  () => {
    test('should assert that the error has the correct errorCode', async () => {
      expect.assertions(2)

      try {
        await prisma.$connect()
      } catch (error) {
        const e = error as PrismaClientInitializationError
        expect(e.constructor.name).toEqual('PrismaClientInitializationError')
        expect(e.errorCode).toEqual('P1001')
      } finally {
        prisma.$disconnect().catch(() => {})
      }
    })
  },
  {
    skipDb: true,
    optOut: {
      from: ['sqlite', 'mongodb', 'sqlserver'],
      reason: `
        sqlite: dont have a connection string'
        mongodb: times out and dont throw
        sqlserver: returns undefined
      `,
    },
    skipDataProxy: {
      runtimes: ['node', 'edge'],
      reason: 'InvalidDatasourceError is not compatible with asserted error // Change in Prisma 6',
    },
    skipDriverAdapter: {
      from: ['js_neon', 'js_pg', 'js_pg_cockroachdb', 'js_planetscale', 'js_mariadb'],
      reason: "driver adapters don't get their url from the schema, so it does not fail",
    },
  },
)

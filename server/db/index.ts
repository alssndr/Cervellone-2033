// server/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is required')

// SSL obbligatorio su Render; max basso per free tier
const client = postgres(url, { ssl: 'require', max: 1 })

export const db = drizzle(client, { schema })

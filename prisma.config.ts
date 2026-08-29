import "dotenv/config";
import { defineConfig } from "prisma/config";
import { buildDatabaseUrl } from "./src/config/database-url.js";

const databaseUrl = buildDatabaseUrl({
  host: process.env.DB_HOST ?? "localhost",
  port: process.env.DB_PORT ?? "5432",
  user: process.env.DB_USER ?? "postgres",
  password: process.env.DB_PASSWORD ?? "password",
  database: process.env.DB_NAME ?? "mydatabase",
});

export default defineConfig({
  schema: "prisma/",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});

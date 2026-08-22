import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl = new URL("postgresql://");
databaseUrl.username = process.env.DB_USER ?? "postgres";
databaseUrl.password = process.env.DB_PASSWORD ?? "password";
databaseUrl.hostname = process.env.DB_HOST ?? "localhost";
databaseUrl.port = process.env.DB_PORT ?? "5432";
databaseUrl.pathname = `/${process.env.DB_NAME ?? "mydatabase"}`;


export default defineConfig({
  schema: "prisma/",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl.toString(),
  },
});

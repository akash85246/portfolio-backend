import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg; 
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

pool
  .query("SELECT 1")
  .then(() => console.log("PostgreSQL Connected"))
  .catch((err) => console.error("Database Connection Error:", err));

export default pool;
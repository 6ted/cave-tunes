
const { Pool } = require("pg");

const pool = new Pool(
    process.env.DATABASE_URL
        ? {
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === "production"
                ? { rejectUnauthorized: false }
                : false
        }
        : {
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD,
            port: Number(process.env.DB_PORT) || 5432
        }
);

pool.connect()
    .then(client => {
        console.log("✅ PostgreSQL Connected");
        client.release();
    })
    .catch(err => {
        console.error("❌ Database Error:", err.message);
    });

module.exports = pool;

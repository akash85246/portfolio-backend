import pool from "./connection.js";

function createUserTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  return pool.query(query);
}

async function addUser(username, email, password) {
  const query = `    INSERT INTO users (username, email, password)
    VALUES ($1, $2, $3)
    RETURNING id, username, email, created_at;`;
  const values = [username, email, password];
  const result = await pool.query(query, values);
  return result.rows[0];
}
async function updateLogin(userId, lastLogin) {
  const query = `UPDATE users SET last_login = $1 WHERE id = $2`;
  const values = [lastLogin, userId];
  await pool
    .query(query, values)
    .catch((err) => console.error("Error updating last login:", err));
}
async function getUser(username) {
  const query = `SELECT * FROM users WHERE username = $1`;
  const values = [username];
  const result = await pool.query(query, values);
  return result.rows[0];
}
async function deleteUser(userId) {
  const query = `DELETE FROM users WHERE id = $1`;
  const values = [userId];
  await pool
    .query(query, values)
    .catch((err) => console.error("Error deleting user:", err));
}

function createMessageTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      content TEXT,
      file_url TEXT,
      ip_address VARCHAR(45) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      response TEXT,
      error TEXT,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  return pool.query(query);
}

function createViewTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS views (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, 
      ip_address VARCHAR(45) NOT NULL, -- supports IPv4 and IPv6
      viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  return pool.query(query);
}

const initializeDatabase = async () => {
  try {
    await createUserTable();
    await createMessageTable();
    await createViewTable();
    console.log("✅ All tables initialized successfully");
  } catch (err) {
    console.error("❌ Error initializing tables:", err);
  }
};

initializeDatabase();

export { addUser, updateLogin, getUser, deleteUser };

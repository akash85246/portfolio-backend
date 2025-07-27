import pool from "./connection.js";

function createUserTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      profile_picture TEXT,
      type VARCHAR(255) NOT NULL,
      last_online TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_online BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  return pool.query(query);
}

async function addUser(username, email, profile_picture, type, last_online) {
  const query = `    INSERT INTO users (username, email,profile_picture,  type, last_online)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, username, email,profile_picture,  type, last_online ,created_at;`;
  const values = [username, email, profile_picture, type, last_online];
  const result = await pool.query(query, values);
  return result.rows;
}

async function updateLogin(user_id) {
  const lastLogin = new Date();
  const query = `UPDATE users SET last_login = $1 WHERE id = $2`;

  const values = [lastLogin, user_id];
  await pool
    .query(query, values)
    .catch((err) => console.error("Error updating last login:", err));
  return lastLogin;
}

async function changeStatus(user_id, status) {
  const query = `
    UPDATE users 
    SET is_online = $2
    WHERE id = $1
  `;
  const values = [user_id, status];
  await pool.query(query, values);
  return true;
}

async function getUser(email) {
  const query =
    "SELECT username,profile_picture,email,id,last_online FROM users WHERE email=$1";
  const values = [email];
  const { rows } = await pool.query(query, values);
  if (rows.length === 0) {
    return [];
  }
  return rows;
}

async function deleteUser(user_id) {
  const query = `DELETE FROM users WHERE id = $1`;
  const values = [user_id];
  await pool
    .query(query, values)
    .catch((err) => console.error("Error deleting user:", err));
}

function createMessageTable() {
  const query = `
   CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  file_url TEXT,
  ip_address VARCHAR(45) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  response_to INTEGER REFERENCES messages(id) ON DELETE SET NULL,
  is_updated BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
  `;
  return pool.query(query);
}

async function updateMessageStatus(message_id, status) {
  const query = `UPDATE messages SET status = $1 WHERE id = $2 RETURNING *`;
  const values = [status, message_id];
  const result = await pool.query(query, values);

  return result.rows[0];
}
async function addMessage(
  receiver_id,
  user_id,
  content,
  fileUrl,
  ipAddress,
  response_to = null
) {
  const query = `
    WITH inserted AS (
      INSERT INTO messages (
        receiver_id, user_id, content, file_url, ip_address, response_to
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, receiver_id, user_id, content, file_url, ip_address, response_to, created_at
    )
    SELECT 
      inserted.*, 
      receiver.profile_picture AS receiver_profile_picture,
      sender.profile_picture AS sender_profile_picture
    FROM inserted
    JOIN users receiver ON inserted.receiver_id = receiver.id
    JOIN users sender ON inserted.user_id = sender.id;
  `;

  const values = [
    receiver_id,
    user_id,
    content,
    fileUrl,
    ipAddress,
    response_to,
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function deleteMessage(message_id) {
  const query = `DELETE FROM messages WHERE id = $1`;
  const values = [message_id];
  await pool
    .query(query, values)
    .catch((err) => console.error("Error deleting message:", err));
}

async function updateMessage(
  message_id,
  new_content = null,
  new_file_url = null
) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (new_content !== null) {
    fields.push(`content = $${idx++}`);
    values.push(new_content);
  }

  if (new_file_url !== null) {
    fields.push(`file_url = $${idx++}`);
    values.push(new_file_url);
  }

  if (fields.length === 0) return null;

  fields.push(`is_updated = true`);
  fields.push(`updated_at = CURRENT_TIMESTAMP`);

  values.push(message_id);
  const query = `
    UPDATE messages
    SET ${fields.join(", ")}
    WHERE id = $${idx}
    RETURNING *;
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
}

async function getMessages(user_id, receiver_id) {
  const query = `
    SELECT 
      m.*,
      sender.profile_picture AS sender_profile_picture,
      receiver.profile_picture AS receiver_profile_picture
    FROM messages m
    LEFT JOIN users sender ON m.user_id = sender.id
    LEFT JOIN users receiver ON m.receiver_id = receiver.id
    WHERE 
      (m.user_id = $1 AND m.receiver_id = $2)
      OR 
      (m.user_id = $2 AND m.receiver_id = $1)
    ORDER BY m.created_at ASC;
  `;
  const values = [user_id, receiver_id];
  const result = await pool.query(query, values);
  return result.rows;
}

async function getAllMessageUser() {
  const query = `
   SELECT 
  u.id, 
  u.username, 
  u.profile_picture, 
  u.email, 
  u.is_online, 
  u.last_online,
  COALESCE(unread_counts.unread_count, 0) AS unread_count
FROM users u
JOIN messages m ON u.id = m.user_id OR u.id = m.receiver_id
LEFT JOIN (
  SELECT user_id, COUNT(*) AS unread_count
  FROM messages
  WHERE receiver_id = 1 AND status != 'read'
  GROUP BY user_id
) AS unread_counts ON u.id = unread_counts.user_id
WHERE u.id != 1
GROUP BY u.id, unread_counts.unread_count
ORDER BY u.is_online DESC, u.last_online DESC, u.username;
  `;

  const result = await pool.query(query);

  if (result.rows.length === 0) {
    return [];
  }
  return result.rows;
}

async function getMessageById(message_id) {
  const query = `SELECT * FROM messages WHERE id = $1`;
  const values = [message_id];
  const result = await pool.query(query, values);
  return result.rows[0];
}

function createViewTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS views (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ip_address VARCHAR(45) NOT NULL,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (ip_address, user_id)
);
  `;
  return pool.query(query);
}

async function addView(ip_address, user_id = null) {
  const query = `
    INSERT INTO views (ip_address, user_id)
    VALUES ($1, $2)
    ON CONFLICT (ip_address, user_id) DO NOTHING
    RETURNING *;
  `;
  const values = [ip_address, user_id];
  const result = await pool.query(query, values);
  return result.rows[0]; // will be undefined if no new row inserted
}

async function getTotalViews() {
  const query = `SELECT COUNT(*) AS total_views FROM views`;
  const result = await pool.query(query).catch((err) => {
    console.error("Error getting total views:", err);
    throw err;
  });
  return parseInt(result.rows[0].total_views, 10);
}
async function updateViewsByIp(ip_address, user_id) {
  const checkQuery = `
    SELECT 1 FROM views WHERE ip_address = $1 AND user_id = $2
  `;
  const check = await pool.query(checkQuery, [ip_address, user_id]);
  if (check.rowCount > 0) return null;
  const query = `
    UPDATE views
    SET user_id = $1
    WHERE ip_address = $2 AND user_id IS NULL
    RETURNING *;
  `;
  const result = await pool.query(query, [user_id, ip_address]);
  return result.rows;
}

const initializeDatabase = async () => {
  try {
    await createUserTable();
    await createMessageTable();
    await createViewTable();
    console.log("All tables initialized successfully");
  } catch (err) {
    console.error("Error initializing tables:", err);
  }
};

initializeDatabase();

export {
  addUser,
  updateLogin,
  getUser,
  deleteUser,
  addMessage,
  deleteMessage,
  updateMessage,
  getMessages,
  getMessageById,
  changeStatus,
  updateMessageStatus,
  getAllMessageUser,
  addView,
  updateViewsByIp,
  getTotalViews,
};

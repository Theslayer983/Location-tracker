const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'weather.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Admins table
    db.run(`
        CREATE TABLE IF NOT EXISTS admins (
            username TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            tracking_id TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Visitors table with address field
    db.run(`
        CREATE TABLE IF NOT EXISTS visitors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_username TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            location_lat REAL,
            location_lon REAL,
            location_accuracy REAL,
            location_address TEXT,
            ip TEXT,
            device_platform TEXT,
            device_language TEXT,
            screen_width INTEGER,
            screen_height INTEGER,
            user_agent TEXT,
            browser_name TEXT,
            browser_version TEXT,
            FOREIGN KEY (admin_username) REFERENCES admins(username)
        )
    `);

    // Create super admin with hashed password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('slayer2026', salt);
    
    db.get("SELECT * FROM admins WHERE username = 'superadmin'", (err, row) => {
        if (!row) {
            db.run(`
                INSERT INTO admins (username, password, tracking_id) 
                VALUES ('superadmin', ?, 'superadmin')
            `, [hashedPassword]);
        }
    });
});

module.exports = db;

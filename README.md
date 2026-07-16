# 🌤️ Weather Tracker Pro

[![Deploy on Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

> Advanced Weather Tracking System with Admin Panel & Super Admin Dashboard

## 🚀 Features

- **🔐 Admin Panel** - Create accounts, get tracking links, view visitor data
- **👑 Super Admin** - Monitor all admins and their visitors
- **🌦️ Live Weather** - Real-time weather data using Open-Meteo API
- **📍 Location Tracking** - Track visitor locations with accuracy
- **📊 Analytics** - View visitor stats, devices, browsers, and more
- **🔗 Shareable Links** - Unique tracking URLs for each admin
- **💾 Data Persistence** - SQLite database (data survives restarts)

## 📱 Tech Stack

- **Backend**: Node.js, Express
- **Database**: SQLite3
- **Auth**: JWT, bcrypt
- **Weather API**: Open-Meteo (No API key needed)
- **Deployment**: Render, Vercel, or any Node.js host

## 🛠️ Installation

### Local Development

```bash
git clone https://github.com/yourusername/weather-tracker.git
cd weather-tracker
npm install
echo "PORT=3000" > .env
echo "JWT_SECRET=your_secret_key" >> .env
npm start

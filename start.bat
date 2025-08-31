@echo off
echo 🌊 Starting SocialWave Application...
echo.

cd /d "%~dp0"

echo 📦 Installing dependencies...
cd backend
call npm install
cd ..

echo.
echo 🚀 Starting SocialWave Backend Server...
echo 🌍 Your app will be available at: http://localhost:5006
echo.

cd backend
call npm start

pause
@echo off
REM Attendance Automation System - Quick Deployment Script for Windows
REM This script helps prepare your project for cloud deployment

echo ======================================
echo Attendance Automation - Deployment Prep
echo ======================================
echo.

REM Check if git is initialized
if not exist ".git\" (
    echo [INIT] Initializing Git repository...
    git init
    echo [OK] Git initialized
) else (
    echo [OK] Git already initialized
)

REM Check if .env exists
if not exist ".env" (
    echo [WARN] .env file not found
    if exist ".env.example" (
        echo [INIT] Creating .env from .env.example...
        copy .env.example .env
        echo [OK] .env created. Please update with your credentials
    ) else (
        echo [ERROR] .env.example not found
    )
) else (
    echo [OK] .env file exists
)

echo.
echo Checking deployment files...
echo.

REM Check required files
for %%f in (Procfile ecosystem.config.js render.yaml railway.json .gitignore) do (
    if exist "%%f" (
        echo [OK] %%f
    ) else (
        echo [MISSING] %%f
    )
)

echo.
echo Checking package.json...
findstr "engines" package.json >nul
if %errorlevel% equ 0 (
    echo [OK] Node.js engines specified
) else (
    echo [WARN] Node.js engines not specified
)

echo.
echo ======================================
echo Next Steps:
echo ======================================
echo 1. Push to GitHub:
echo    git remote add origin https://github.com/yourusername/repo.git
echo    git push -u origin main
echo.
echo 2. Setup MongoDB Atlas (FREE):
echo    - Visit: https://www.mongodb.com/cloud/atlas
echo    - Create cluster and get connection string
echo.
echo 3. Choose deployment platform:
echo    * Render (FREE): https://render.com
echo    * Railway (FREE): https://railway.app
echo    * Heroku (PAID): https://heroku.com
echo.
echo 4. Read DEPLOYMENT_GUIDE.md for detailed instructions
echo.
echo [OK] Preparation complete!
echo.

pause

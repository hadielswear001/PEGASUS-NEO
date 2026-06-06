@echo off
REM ============================================
REM PEGASUS NEO - Startup Script (Windows)
REM ============================================

echo.
echo   ========================================
echo        PEGASUS NEO v1.1
echo    Agentic Security Operating System
echo   ========================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ first.
    echo    Visit: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=1 delims=v." %%a in ('node -v') do set NODE_MAJOR=%%a
echo [OK] Node.js detected

REM Check pnpm
where pnpm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [INFO] Installing pnpm...
    npm install -g pnpm
)
echo [OK] pnpm detected

REM Install dependencies if needed
if not exist "node_modules" (
    echo.
    echo [INFO] Installing dependencies...
    pnpm install
)

REM Check for .env file
if not exist ".env" (
    echo.
    echo [WARNING] No .env file found!
    echo    Please create a .env file with your configuration.
    echo    See INSTALLATION.md for required environment variables.
    echo.
    pause
    exit /b 1
)

REM Start server
if "%1"=="prod" (
    echo.
    echo [INFO] Building for production...
    pnpm build
    echo.
    echo [INFO] Starting production server...
    pnpm start
) else (
    echo.
    echo [INFO] Starting development server...
    echo    URL: http://localhost:3000
    echo.
    pnpm dev
)

pause

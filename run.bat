@echo off
REM ====================================================================
REM local-llm-doctor - Windows launcher (v2 - simplified)
REM Avoids: for /f parsing, %i in strings, Chinese output
REM ====================================================================

echo.
echo ============================================================
echo  local-llm-doctor v0.1.0 - Windows launcher
echo ============================================================
echo.

REM 1. Check Node.js
echo [1/5] Checking Node.js...
where node 1>nul 2>nul
if errorlevel 1 goto :no_node
echo   OK Node.js found

REM 2. Check npm
echo [2/5] Checking npm...
where npm 1>nul 2>nul
if errorlevel 1 goto :no_npm
echo   OK npm found

REM 3. Check node_modules
echo [3/5] Checking dependencies...
if not exist "node_modules\" goto :need_install
echo   OK dependencies installed
goto :deps_ok

:need_install
echo   ! Installing dependencies (may take 1-2 minutes)...
echo.
call npm install
if errorlevel 1 goto :install_fail
echo.
echo   OK dependencies installed

:deps_ok

REM 4. Build TypeScript
echo [4/5] Building TypeScript...
call npm run build
if errorlevel 1 goto :build_fail
echo   OK build complete

REM 5. Run program
echo [5/5] Running local-llm-doctor...
echo.
echo ============================================================
echo.

node bin\local-llm-doctor.js

echo.
echo ============================================================
echo   Done! Press any key to close
echo ============================================================
pause >nul
exit /b 0

:no_node
echo   ERROR: Node.js not installed
echo   Please install from https://nodejs.org/ (LTS version)
pause
exit /b 1

:no_npm
echo   ERROR: npm not found (should be installed with Node.js)
pause
exit /b 1

:install_fail
echo   ERROR: npm install failed
echo   Try: npm config set registry https://registry.npmmirror.com
pause
exit /b 1

:build_fail
echo   ERROR: build failed (see error above)
pause
exit /b 1

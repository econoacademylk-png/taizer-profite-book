@echo off
title Taizer Profit Book - Daily Income & Target Sheet
echo ===================================================
echo     TAIZER CRYPTO - DAILY INCOME & TARGET SHEET
echo ===================================================
echo.
echo Starting development server...
echo The app will open at http://localhost:3000
echo (To stop the app, press Ctrl + C in this window)
echo.
timeout /t 2 /nobreak >nul
start http://localhost:3000
npm run dev
pause

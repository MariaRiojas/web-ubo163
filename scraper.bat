@echo off
REM ============================================================
REM  Scraper CGBVP - Compania de Bomberos Ancon 163
REM  Doble clic para actualizar datos desde el intranet CGBVP.
REM  Requiere: red normal (NO usar VPN/AWS) y .env.local con
REM  las credenciales (USUARIO_INTRANET / CONTRASENA_INTRANET).
REM ============================================================
cd /d "%~dp0"
title Scraper CGBVP - Bomberos Ancon 163

:menu
cls
echo.
echo   ============================================
echo    SCRAPER CGBVP - COMPANIA ANCON 163
echo   ============================================
echo.
echo    Estas en una red normal (no AWS). Elige:
echo.
echo    [1] Actualizar PADRON de bomberos (rapido)
echo    [2] Descargar PARTES historicos (ultimos 60 dias)
echo    [3] LOOP EN VIVO (estado cada 2 min, partes cada 15 min)
echo        -- dejalo abierto; cierra la ventana para detener --
echo    [4] Salir
echo.
set /p opt=   Opcion:

if "%opt%"=="1" ( call npm run scraper:bomberos & echo. & echo Listo. & pause & goto menu )
if "%opt%"=="2" ( call npm run scraper:historico & echo. & echo Listo. & pause & goto menu )
if "%opt%"=="3" ( echo. & echo Corriendo en vivo... cierra esta ventana para detener. & call npm run scraper:start & pause & goto menu )
if "%opt%"=="4" ( exit )
goto menu

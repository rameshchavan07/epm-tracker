@echo off
echo ============================================
echo   EPM Tracker - Open Firewall Port 3000
echo ============================================
echo.
netsh advfirewall firewall add rule name="EPM Backend Port 3000" dir=in action=allow protocol=TCP localport=3000
echo.
if %errorlevel%==0 (
    echo SUCCESS! Port 3000 is now open.
    echo Your phone should be able to connect now.
) else (
    echo FAILED! Please right-click this file and
    echo select "Run as administrator"
)
echo.
pause

@echo off
echo ================================================
echo Starting VSCC-WebDiner .NET Core Backend...
echo ================================================
cd /d "%~dp0WebDiner.Api"
dotnet run --urls "http://localhost:8201"
pause


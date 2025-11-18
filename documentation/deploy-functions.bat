@echo off
REM Supabase Edge Functions Deployment Script for Windows
REM This script deploys all Edge Functions to your Supabase project

echo 🚀 Deploying Supabase Edge Functions...
echo.

REM Check if supabase CLI is installed
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Supabase CLI is not installed.
    echo Install it with: npm install -g supabase
    exit /b 1
)

REM Check if project is linked
if not exist ".supabase\config.toml" (
    echo ❌ Project is not linked to Supabase.
    echo Link it with: supabase link --project-ref YOUR_PROJECT_REF
    exit /b 1
)

echo 📦 Deploying all functions...
echo.

REM Deploy all functions
supabase functions deploy

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ All functions deployed successfully!
    echo.
    echo 📋 Next steps:
    echo 1. Verify functions in Supabase dashboard
    echo 2. Set RESEND_API_KEY secret if using email functions
    echo 3. Test functions to ensure they work
) else (
    echo.
    echo ❌ Deployment failed. Check the error messages above.
    exit /b 1
)


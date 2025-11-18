# 🚀 Supabase Edge Functions Migration Guide

This guide will help you migrate all 13 Edge Functions to your new Supabase project.

## 📋 Functions Overview

Your project has **13 Edge Functions**:

### Email Functions (7)
1. `send-welcome-email` - Sends welcome emails to new users
2. `send-asset-assignment-email` - Notifies when assets are assigned
3. `send-transfer-approval-email` - Sends transfer approval requests
4. `send-maintenance-reminder-email` - Maintenance reminders
5. `send-ticket-assignment-email` - Ticket assignment notifications
6. `send-email-digest` - Daily/weekly email digests
7. `send-test-email` - Test email functionality
8. `send-transfer-notification` - Transfer notifications

### User Management Functions (4)
9. `admin-create-user` - Create users (admin only)
10. `admin-update-user` - Update users (admin only)
11. `admin-delete-user` - Delete users (admin only)
12. `delete-user` - Delete user account

### Ticket Functions (1)
13. `cancel-ticket` - Cancel support tickets

---

## ⚙️ Prerequisites

### 1. Install Supabase CLI

**For Windows (Recommended - Using Scoop):**

```powershell
# Install Scoop if you don't have it
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Alternative for Windows (Direct Download):**

1. Visit [Supabase CLI Releases](https://github.com/supabase/cli/releases)
2. Download the latest `supabase_X.X.X_windows_amd64.zip`
3. Extract and add to PATH, or use directly

**For Mac/Linux:**

```bash
# Using Homebrew (Mac)
brew install supabase/tap/supabase

# Or using npm (if properly configured)
npm install -g supabase
```

**Verify installation:**

```bash
supabase --version
```

### 2. Login to Supabase CLI

```bash
supabase login
```

This will open your browser to authenticate.

### 3. Link Your Project

```bash
# Navigate to your project
cd solidpro-assetflow

# Link to your new Supabase project
supabase link --project-ref YOUR_NEW_PROJECT_REF
```

You can find your project ref in your Supabase dashboard URL:
`https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

### 4. Update Config File

Update `supabase/config.toml` with your new project ID:

```toml
project_id = "YOUR_NEW_PROJECT_REF"
```

---

## 🔑 Environment Variables Setup

Edge Functions need environment variables. You'll need to set these in your Supabase dashboard.

### Required Environment Variables

1. **RESEND_API_KEY** (for email functions)
   - Sign up at [resend.com](https://resend.com) if you don't have an account
   - Get your API key from Resend dashboard
   - **Required for**: All email-sending functions

2. **SUPABASE_URL** (automatically set)
   - This is automatically available, but you can verify it

3. **SUPABASE_SERVICE_ROLE_KEY** (automatically set)
   - This is automatically available for Edge Functions

4. **SUPABASE_ANON_KEY** (automatically set)
   - This is automatically available for Edge Functions

### Setting Environment Variables

#### Method 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **Project Settings** → **Edge Functions**
3. Click **Add new secret**
4. Add each secret:
   - **Name**: `RESEND_API_KEY`
   - **Value**: Your Resend API key
   - Click **Save**

#### Method 2: Using Supabase CLI

```bash
# Set the Resend API key
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
```

**Note**: Replace `your_resend_api_key_here` with your actual Resend API key.

---

## 📦 Deploy Functions

### Option 1: Deploy All Functions at Once

```bash
# Deploy all functions
supabase functions deploy
```

This will deploy all 13 functions to your new Supabase project.

### Option 2: Deploy Functions Individually

If you prefer to deploy one at a time:

```bash
# Email functions
supabase functions deploy send-welcome-email
supabase functions deploy send-asset-assignment-email
supabase functions deploy send-transfer-approval-email
supabase functions deploy send-maintenance-reminder-email
supabase functions deploy send-ticket-assignment-email
supabase functions deploy send-email-digest
supabase functions deploy send-test-email
supabase functions deploy send-transfer-notification

# User management functions
supabase functions deploy admin-create-user
supabase functions deploy admin-update-user
supabase functions deploy admin-delete-user
supabase functions deploy delete-user

# Ticket functions
supabase functions deploy cancel-ticket
```

---

## ✅ Verify Deployment

### Check in Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions** in the left sidebar
3. You should see all 13 functions listed

### Test a Function

You can test a function using the Supabase dashboard:

1. Go to **Edge Functions**
2. Click on a function (e.g., `send-test-email`)
3. Click **Invoke function**
4. Provide test data and click **Invoke**

---

## 🔧 Function Configuration

The `supabase/config.toml` file contains function-specific settings:

```toml
[functions.send-test-email]
verify_jwt = true

[functions.cancel-ticket]
verify_jwt = true

[functions.send-welcome-email]
verify_jwt = false

[functions.send-asset-assignment-email]
verify_jwt = true

[functions.send-transfer-approval-email]
verify_jwt = true

[functions.send-maintenance-reminder-email]
verify_jwt = true

[functions.send-ticket-assignment-email]
verify_jwt = true

[functions.send-email-digest]
verify_jwt = false
```

**What does `verify_jwt` mean?**
- `verify_jwt = true`: Function requires authentication (user must be logged in)
- `verify_jwt = false`: Function can be called without authentication

These settings are automatically applied when you deploy.

---

## 🧪 Testing Functions

### Test Email Function

After setting up Resend API key, test the email function:

```bash
# Using curl
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-test-email' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"to": "test@example.com", "subject": "Test", "html": "<p>Test email</p>"}'
```

Or use the Supabase dashboard:
1. Go to **Edge Functions** → `send-test-email`
2. Click **Invoke function**
3. Enter test data and invoke

---

## 📝 Step-by-Step Migration Checklist

- [ ] Install Supabase CLI (`npm install -g supabase`)
- [ ] Login to Supabase CLI (`supabase login`)
- [ ] Link project (`supabase link --project-ref YOUR_PROJECT_REF`)
- [ ] Update `supabase/config.toml` with new project ID
- [ ] Set up Resend account (if using email functions)
- [ ] Set `RESEND_API_KEY` environment variable in Supabase
- [ ] Deploy all functions (`supabase functions deploy`)
- [ ] Verify functions appear in Supabase dashboard
- [ ] Test at least one function to ensure it works

---

## 🆘 Troubleshooting

### Issue: "Function not found" after deployment

**Solution**: 
- Wait a few seconds and refresh the dashboard
- Check that you're looking at the correct project
- Verify the function name matches exactly

### Issue: "RESEND_API_KEY not found"

**Solution**:
- Make sure you've set the secret in Supabase dashboard
- Verify the secret name is exactly `RESEND_API_KEY` (case-sensitive)
- Redeploy the function after setting the secret

### Issue: "Unauthorized" when calling function

**Solution**:
- Check if `verify_jwt = true` in config.toml
- Make sure you're passing the Authorization header
- Verify your JWT token is valid

### Issue: Email not sending

**Solution**:
- Verify Resend API key is correct
- Check Resend dashboard for any errors
- Verify the "from" email domain is verified in Resend
- Check function logs in Supabase dashboard

### Issue: "Installing Supabase CLI as a global module is not supported" (Windows)

**Solution**: 
- On Windows, `npm install -g supabase` doesn't work
- See `INSTALL_SUPABASE_CLI_WINDOWS.md` for proper Windows installation
- Use Scoop or direct download method instead

### Issue: "Project not linked"

**Solution**:
```bash
# Re-link your project
supabase link --project-ref YOUR_PROJECT_REF
```

### Issue: "supabase: command not found"

**Solution**:
- Verify Supabase CLI is installed: `supabase --version`
- Make sure it's in your PATH
- On Windows, see `INSTALL_SUPABASE_CLI_WINDOWS.md`

---

## 🔍 Viewing Function Logs

To debug functions, view logs:

### Using CLI
```bash
# View logs for a specific function
supabase functions logs send-test-email

# View all function logs
supabase functions logs
```

### Using Dashboard
1. Go to **Edge Functions**
2. Click on a function
3. Click **Logs** tab
4. View real-time logs

---

## 📚 Function URLs

After deployment, your functions will be available at:

```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/FUNCTION_NAME
```

For example:
- `https://xxxxx.supabase.co/functions/v1/send-welcome-email`
- `https://xxxxx.supabase.co/functions/v1/admin-create-user`

---

## 🔄 Updating Functions

If you need to update a function later:

1. Make your changes to the function code
2. Redeploy:
   ```bash
   supabase functions deploy FUNCTION_NAME
   ```
3. Or redeploy all:
   ```bash
   supabase functions deploy
   ```

---

## 💡 Important Notes

1. **Email Service**: Functions use Resend for sending emails. You need a Resend account and API key.

2. **Automatic Variables**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_ANON_KEY` are automatically available - you don't need to set them.

3. **Function Updates**: After updating code, you must redeploy for changes to take effect.

4. **Testing**: Always test functions after deployment, especially email functions.

5. **Costs**: Edge Functions have usage limits on free tier. Check Supabase pricing.

---

## 🎯 Quick Command Reference

```bash
# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Set secrets
supabase secrets set RESEND_API_KEY=your_key

# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy FUNCTION_NAME

# View logs
supabase functions logs FUNCTION_NAME

# List functions
supabase functions list
```

---

## ✅ Verification

After migration, verify:

- [ ] All 13 functions appear in Supabase dashboard
- [ ] Functions can be invoked (test at least one)
- [ ] Email functions work (if Resend is configured)
- [ ] No errors in function logs
- [ ] Functions respond correctly to requests

---

**Congratulations!** 🎉 Your Edge Functions are now migrated to your new Supabase project.

If you encounter any issues, check the troubleshooting section or refer to the [Supabase Edge Functions documentation](https://supabase.com/docs/guides/functions).


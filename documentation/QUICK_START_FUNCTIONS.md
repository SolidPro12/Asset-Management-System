# ⚡ Quick Start: Deploy Edge Functions (5 minutes)

## 🎯 Fastest Method

### Step 1: Install & Setup Supabase CLI

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

1. Go to [Supabase CLI Releases](https://github.com/supabase/cli/releases)
2. Download `supabase_X.X.X_windows_amd64.zip` (latest version)
3. Extract the zip file
4. Add the extracted folder to your PATH, or run `supabase.exe` directly

**For Mac/Linux:**

```bash
# Using Homebrew (Mac) or Linux package manager
brew install supabase/tap/supabase

# Or using npm (if you have it set up correctly)
npm install -g supabase
```

**After installation, login:**

```bash
# Login to Supabase
supabase login
```

This will open your browser to authenticate.

### Step 2: Link Your Project

```bash
# Link to your new Supabase project
supabase link --project-ref YOUR_PROJECT_REF
```

**Find your project ref**: Look at your Supabase dashboard URL:
`https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

### Step 3: Update Config File

Edit `supabase/config.toml` and update the project_id:

```toml
project_id = "YOUR_NEW_PROJECT_REF"
```

### Step 4: Set Up Email Service (If Using Email Functions)

**Only needed if you use email functions** (8 out of 13 functions):

1. Sign up at [resend.com](https://resend.com) (free tier available)
2. Get your API key from Resend dashboard
3. Set it in Supabase:

**Option A: Using Dashboard (Easiest)**
- Go to Supabase Dashboard → **Project Settings** → **Edge Functions**
- Click **Add new secret**
- Name: `RESEND_API_KEY`
- Value: Your Resend API key
- Click **Save**

**Option B: Using CLI**
```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
```

### Step 5: Deploy All Functions

```bash
# Deploy all 13 functions at once
supabase functions deploy
```

That's it! ✅

---

## ✅ Verify Deployment

1. Go to Supabase Dashboard → **Edge Functions**
2. You should see all 13 functions listed:
   - send-welcome-email
   - send-asset-assignment-email
   - send-transfer-approval-email
   - send-maintenance-reminder-email
   - send-ticket-assignment-email
   - send-email-digest
   - send-test-email
   - send-transfer-notification
   - admin-create-user
   - admin-update-user
   - admin-delete-user
   - delete-user
   - cancel-ticket

---

## 🧪 Quick Test

Test the email function (if you set up Resend):

1. Go to **Edge Functions** → `send-test-email`
2. Click **Invoke function**
3. Enter test data:
   ```json
   {
     "to": "your-email@example.com",
     "subject": "Test Email",
     "html": "<p>This is a test email!</p>"
   }
   ```
4. Click **Invoke**
5. Check your email!

---

## 📋 Checklist

- [ ] Supabase CLI installed
- [ ] Logged in to Supabase CLI
- [ ] Project linked
- [ ] Config file updated
- [ ] Resend API key set (if using email functions)
- [ ] Functions deployed
- [ ] Functions visible in dashboard
- [ ] Test function works

---

## 🆘 Common Issues

### "Installing Supabase CLI as a global module is not supported"
**Solution**: On Windows, you cannot use `npm install -g supabase`. 
- See `INSTALL_SUPABASE_CLI_WINDOWS.md` for Windows installation methods
- Use Scoop or direct download instead

### "Project not linked"
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### "RESEND_API_KEY not found"
- Make sure you set the secret in Supabase dashboard
- Secret name must be exactly `RESEND_API_KEY` (case-sensitive)

### Functions not appearing
- Wait a few seconds and refresh
- Check you're in the correct project

### "supabase: command not found"
- Make sure Supabase CLI is installed and in your PATH
- Close and reopen your terminal
- Verify with: `supabase --version`

---

## 📚 Need More Details?

See `MIGRATE_FUNCTIONS_GUIDE.md` for:
- Detailed step-by-step instructions
- Troubleshooting guide
- Function configuration
- Advanced usage

---

**Done!** 🎉 Your Edge Functions are now deployed!


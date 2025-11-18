# 🪟 Installing Supabase CLI on Windows

The Supabase CLI **cannot** be installed globally via `npm install -g supabase` on Windows. Use one of these methods instead:

## Method 1: Using Scoop (Recommended) ⭐

Scoop is a package manager for Windows that makes installation easy.

### Step 1: Install Scoop (if you don't have it)

Open PowerShell and run:

```powershell
# Allow script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install Scoop
irm get.scoop.sh | iex
```

### Step 2: Install Supabase CLI

```powershell
# Add Supabase bucket
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git

# Install Supabase CLI
scoop install supabase
```

### Step 3: Verify Installation

```powershell
supabase --version
```

You should see the version number. Done! ✅

---

## Method 2: Direct Download (Alternative)

If you prefer not to use Scoop:

### Step 1: Download the Binary

1. Go to [Supabase CLI Releases](https://github.com/supabase/cli/releases)
2. Download the latest `supabase_X.X.X_windows_amd64.zip` file
3. Extract the zip file to a folder (e.g., `C:\supabase-cli`)

### Step 2: Add to PATH

1. Copy the path where you extracted the file (e.g., `C:\supabase-cli`)
2. Open **System Properties** → **Environment Variables**
3. Under **System Variables**, find `Path` and click **Edit**
4. Click **New** and add your path (e.g., `C:\supabase-cli`)
5. Click **OK** on all dialogs

### Step 3: Verify Installation

Open a new PowerShell window and run:

```powershell
supabase --version
```

---

## Method 3: Using npx (Temporary, Not Recommended)

You can use `npx` to run Supabase CLI without installing it globally:

```powershell
# Instead of: supabase login
npx supabase login

# Instead of: supabase link
npx supabase link --project-ref YOUR_PROJECT_REF

# Instead of: supabase functions deploy
npx supabase functions deploy
```

**Note**: This is slower and requires internet connection each time.

---

## 🆘 Troubleshooting

### "supabase: command not found"

**Solution**: 
- Make sure you added Supabase to your PATH
- Close and reopen your terminal/PowerShell
- Try using the full path: `C:\path\to\supabase.exe --version`

### "Execution policy" error

**Solution**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Scoop installation fails

**Solution**: 
- Make sure you're running PowerShell as Administrator
- Try the direct download method instead

---

## ✅ After Installation

Once Supabase CLI is installed, continue with:

1. **Login**: `supabase login`
2. **Link project**: `supabase link --project-ref YOUR_PROJECT_REF`
3. **Deploy functions**: `supabase functions deploy`

See `QUICK_START_FUNCTIONS.md` for the complete deployment guide.

---

## 📚 Resources

- [Supabase CLI GitHub](https://github.com/supabase/cli)
- [Scoop Package Manager](https://scoop.sh/)
- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli)


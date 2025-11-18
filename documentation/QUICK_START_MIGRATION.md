# Quick Start: Migrate to New Supabase

## 🎯 Fastest Method (5 minutes)

### Step 1: Get Your New Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and create/login to your account
2. Create a new project (or use existing)
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### Step 2: Update Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_public_key_here
```

Replace `YOUR_PROJECT_REF` and `your_anon_public_key_here` with your actual values.

### Step 3: Run Migrations

**Option A: Using Supabase Dashboard (Easiest - No CLI needed)**

1. Open the file `combined-migration.sql` in your project root
2. Copy ALL its contents (Ctrl+A, Ctrl+C)
3. Go to your Supabase dashboard → **SQL Editor**
4. Click **New Query**
5. Paste the SQL (Ctrl+V)
6. Click **Run** (or press Ctrl+Enter)
7. Wait for it to complete (may take 1-2 minutes)

**Option B: Using Supabase CLI (Recommended for developers)**

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
supabase db push
```

### Step 4: Verify Migration

1. In Supabase dashboard, go to **Table Editor**
2. You should see 23 tables listed
3. Check a few tables to ensure they're created correctly

### Step 5: Test Your App

```bash
# Start your development server
npm run dev
```

Try logging in or creating a test asset to verify everything works!

## ✅ Done!

Your database is now migrated. If you encounter any issues, check the full `MIGRATION_GUIDE.md` for detailed troubleshooting.

---

## 📋 What Gets Migrated?

- ✅ 23 database tables
- ✅ 5 custom enums (app_role, asset_status, etc.)
- ✅ 5 database functions
- ✅ All Row Level Security (RLS) policies
- ✅ All triggers and indexes
- ❌ **NOT migrated**: Existing data, users, or storage files

## 🔄 If You Need to Migrate Data

If you have existing data in your old database:

1. Export data from old Supabase (use Table Editor or pg_dump)
2. Import data to new Supabase (use Table Editor or SQL INSERT statements)

---

**Need help?** Check `MIGRATION_GUIDE.md` for detailed instructions.


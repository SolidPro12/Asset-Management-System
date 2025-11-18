# 🚀 Supabase Migration - Complete Guide

Welcome! This guide will help you migrate your entire database from the old Supabase project to your new one.

## 📁 Files Created for Migration

I've created several helpful files for you:

### Database Migration Files
1. **`QUICK_START_MIGRATION.md`** ⚡ - **START HERE!** Fastest way to migrate database (5 minutes)
2. **`MIGRATION_GUIDE.md`** 📚 - Detailed database migration guide with troubleshooting
3. **`DATABASE_SCHEMA_SUMMARY.md`** 📊 - Overview of all 23 tables and their purposes
4. **`combined-migration.sql`** 💾 - All 41 migrations combined into one file
5. **`migrate-to-new-supabase.js`** 🔧 - Helper script (already run, created combined SQL)

### Edge Functions Migration Files
6. **`QUICK_START_FUNCTIONS.md`** ⚡ - **START HERE for Functions!** Fastest way to deploy functions (5 minutes)
7. **`MIGRATE_FUNCTIONS_GUIDE.md`** 📚 - Detailed Edge Functions migration guide
8. **`deploy-functions.sh`** / **`deploy-functions.bat`** 🔧 - Deployment scripts

## 🎯 Quick Start (Recommended)

**For beginners, follow this simple 3-step process:**

### Step 1: Get Your Supabase Credentials
1. Go to [supabase.com](https://supabase.com) → Your Project → Settings → API
2. Copy your **Project URL** and **anon public key**

### Step 2: Create `.env` File
Create a file named `.env` in the project root:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_public_key_here
```

### Step 3: Run Migrations
1. Open `combined-migration.sql` in your project
2. Copy ALL its contents
3. Go to Supabase Dashboard → SQL Editor → New Query
4. Paste and click **Run**

**Done!** ✅ Your database is migrated.

---

## 📋 What You're Migrating

### Database Structure
- ✅ **23 Tables** - All your data tables
- ✅ **9 Custom Enums** - User roles, asset statuses, etc.
- ✅ **5 Database Functions** - Helper functions
- ✅ **Row Level Security (RLS)** - Security policies
- ✅ **Triggers** - Automatic updates
- ✅ **Indexes** - Performance optimization

### What's NOT Migrated
- ❌ **Existing Data** - You'll need to export/import separately
- ❌ **User Accounts** - Users need to sign up again
- ❌ **Storage Files** - If you use Supabase Storage

### Edge Functions Migration
- ✅ **13 Edge Functions** - See `QUICK_START_FUNCTIONS.md` for deployment guide
- ✅ **Email Functions** - Requires Resend API key setup
- ✅ **User Management Functions** - Ready to deploy

---

## 🛠️ Migration Methods

### Method 1: Supabase Dashboard (Easiest - No CLI)
**Best for**: Beginners, one-time migration
- Use the `combined-migration.sql` file
- Copy-paste into SQL Editor
- See `QUICK_START_MIGRATION.md` for details

### Method 2: Supabase CLI (Recommended)
**Best for**: Developers, ongoing development
```bash
npm install -g supabase
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```
- See `MIGRATION_GUIDE.md` for details

---

## 📚 Documentation Files

| File | Purpose | When to Use |
|------|---------|-------------|
| `QUICK_START_MIGRATION.md` | Fast 5-minute guide | **Start here if you're new** |
| `MIGRATION_GUIDE.md` | Detailed instructions | When you need troubleshooting |
| `DATABASE_SCHEMA_SUMMARY.md` | Table overview | To understand your database |
| `combined-migration.sql` | All migrations in one file | To run migrations manually |

---

## ✅ Verification Checklist

After migration, verify:

- [ ] All 23 tables appear in Supabase Table Editor
- [ ] Can see enums in Database → Types
- [ ] Can see functions in Database → Functions
- [ ] `.env` file is created with correct values
- [ ] App runs without connection errors
- [ ] Can create test data (e.g., new asset)

---

## 🆘 Troubleshooting

### "Relation already exists" error
- Some tables might already exist
- Drop existing tables or skip that migration

### Can't connect to database
- Check `.env` file exists and has correct values
- Verify Supabase URL and keys are correct
- Make sure project is active in Supabase dashboard

### RLS policies not working
- Make sure you ran ALL migrations
- RLS policies are created in later migration files

### Need more help?
- Check `MIGRATION_GUIDE.md` for detailed troubleshooting
- Review Supabase documentation: https://supabase.com/docs

---

## 📊 Database Overview

Your project has a comprehensive asset management system with:

- **User Management**: Profiles, roles, permissions
- **Asset Management**: Assets, allocations, transfers, history
- **Maintenance**: Schedules and history
- **Tickets**: Support ticket system
- **Requests**: Asset request workflow
- **Email System**: Notifications, templates, logs
- **Activity Logging**: User and asset activity tracking

See `DATABASE_SCHEMA_SUMMARY.md` for complete details.

---

## 🎓 Learning Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Guide](https://supabase.com/docs/reference/cli)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)

---

## 📝 Next Steps After Migration

1. ✅ **Migrate Database** - Follow `QUICK_START_MIGRATION.md`
2. ✅ **Deploy Edge Functions** - Follow `QUICK_START_FUNCTIONS.md`
3. ✅ **Test the application** - Run `npm run dev` and test basic functionality
4. 👥 **Create admin user** - Sign up and assign super_admin role
5. 💾 **Migrate data** (if needed) - Export from old DB, import to new

---

## 💡 Tips

- **Backup first**: Always backup before making changes
- **Test locally**: Test your app after migration
- **Check logs**: Supabase dashboard shows migration logs
- **One at a time**: If using manual method, run migrations one by one
- **Be patient**: Large migrations may take 1-2 minutes

---

**Good luck with your migration!** 🎉

If you have questions, refer to the detailed guides or Supabase documentation.


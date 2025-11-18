# Supabase Migration Guide

This guide will help you migrate all database tables, functions, and configurations from the old Supabase project to your new Supabase instance.

## 📋 Prerequisites

1. **New Supabase Project**: You should have already created a new Supabase project at [supabase.com](https://supabase.com)
2. **Supabase CLI** (Optional but recommended): Install it for easier migration
   ```bash
   npm install -g supabase
   ```
3. **Access to your new Supabase project**: You'll need:
   - Project URL
   - Anon/Public Key (Service Role Key for migrations)

## 🗂️ Database Tables Overview

Your project contains **23 database tables**:

1. `asset_activity_log` - Tracks asset-related activities
2. `asset_allocations` - Asset allocation records
3. `asset_history` - Historical asset assignments
4. `asset_requests` - Asset request records
5. `asset_transfers` - Asset transfer records
6. `assets` - Main assets table
7. `email_digest_preferences` - User email digest preferences
8. `email_logs` - Email sending logs
9. `email_notification_settings` - Email notification configuration
10. `email_templates` - Email templates
11. `maintenance_history` - Maintenance records
12. `maintenance_schedules` - Scheduled maintenance
13. `permission_history` - Permission change history
14. `profiles` - User profiles
15. `request_history` - Request change history
16. `service_history` - Service records
17. `settings` - Application settings
18. `ticket_comments` - Ticket comments
19. `ticket_history` - Ticket change history
20. `tickets` - Support tickets
21. `user_activity_log` - User activity logs
22. `user_management_log` - User management logs
23. `user_roles` - User role assignments

Plus **5 custom enums** and **5 database functions**.

## 🚀 Migration Methods

You have two options to migrate:

### Method 1: Using Supabase CLI (Recommended)

This is the easiest and most reliable method.

#### Step 1: Install Supabase CLI
```bash
npm install -g supabase
```

#### Step 2: Link to Your New Project
```bash
# Navigate to your project directory
cd solidpro-assetflow

# Link to your new Supabase project
supabase link --project-ref YOUR_NEW_PROJECT_REF
```

You can find your project ref in your Supabase dashboard URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

#### Step 3: Update Config File
Update `supabase/config.toml` with your new project ID:
```toml
project_id = "YOUR_NEW_PROJECT_REF"
```

#### Step 4: Run All Migrations
```bash
# Push all migrations to your new database
supabase db push
```

This will run all 41 migration files in the correct order.

### Method 2: Using Supabase Dashboard (Manual)

If you prefer using the web interface:

#### Step 1: Access SQL Editor
1. Go to your Supabase dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

#### Step 2: Run Migrations in Order
You need to run all migration files in chronological order. The files are named with timestamps, so run them from oldest to newest:

1. `20251103104528_e632b498-0193-4f67-8a79-e14072e05270.sql`
2. `20251103105547_2202544e-07b4-4619-b5ee-1b4c9cebe2c8.sql`
3. ... (continue in order)
4. `20251117025021_130f0ce0-42f7-4a19-9401-da65df591907.sql`

**Important**: Run them one at a time, in order. Wait for each to complete before running the next.

#### Step 3: Verify Migrations
After running all migrations, check:
- Go to **Table Editor** - you should see all 23 tables
- Go to **Database** → **Functions** - you should see 5 functions
- Go to **Database** → **Types** - you should see 5 enums

## 🔧 Update Environment Variables

After migration, update your environment variables:

1. Create a `.env` file in the root directory (if it doesn't exist)
2. Add your new Supabase credentials:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_public_key_here
```

You can find these in your Supabase dashboard:
- Go to **Settings** → **API**
- Copy the **Project URL** and **anon public** key

## 📦 Deploy Edge Functions (Optional)

Your project has Supabase Edge Functions. To deploy them:

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individually
supabase functions deploy send-welcome-email
supabase functions deploy send-asset-assignment-email
supabase functions deploy send-transfer-approval-email
supabase functions deploy send-maintenance-reminder-email
supabase functions deploy send-ticket-assignment-email
supabase functions deploy send-email-digest
supabase functions deploy send-test-email
supabase functions deploy cancel-ticket
supabase functions deploy admin-create-user
supabase functions deploy admin-delete-user
supabase functions deploy admin-update-user
supabase functions deploy delete-user
supabase functions deploy send-transfer-notification
```

**Note**: Edge Functions require additional setup (like email service configuration). You can deploy them later if needed.

## ✅ Verification Checklist

After migration, verify:

- [ ] All 23 tables are created
- [ ] All 5 enums are created (app_role, asset_status, asset_category, etc.)
- [ ] All 5 functions are created (generate_request_id, generate_ticket_id, etc.)
- [ ] Row Level Security (RLS) is enabled on all tables
- [ ] RLS policies are created
- [ ] Triggers are created
- [ ] Indexes are created
- [ ] Environment variables are updated
- [ ] Application connects to new database successfully

## 🧪 Test Your Migration

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Test database connection**:
   - Try logging in
   - Create a test asset
   - Check if data is being saved

3. **Check for errors**:
   - Open browser console
   - Check for any Supabase connection errors
   - Verify API calls are going to your new project

## 🔍 Troubleshooting

### Issue: Migration fails with "relation already exists"
**Solution**: Some tables might already exist. You can either:
- Drop existing tables and re-run migrations
- Or skip the migration that creates that table

### Issue: RLS policies not working
**Solution**: Make sure you've run all migrations. RLS policies are created in later migration files.

### Issue: Functions not found
**Solution**: Functions are created in migration files. Make sure you've run all migrations in order.

### Issue: Can't connect to database
**Solution**: 
- Double-check your environment variables
- Verify your Supabase URL and keys are correct
- Make sure your new project is active

## 📝 Important Notes

1. **Data Migration**: This guide migrates the **schema** (table structure), not the **data**. If you have existing data in your old database, you'll need to export and import it separately.

2. **User Authentication**: User accounts (auth.users) are separate from the database schema. Users will need to sign up again or you'll need to migrate them separately.

3. **Storage**: If your project uses Supabase Storage, you'll need to migrate that separately.

4. **Backup**: Always backup your new database before making changes.

## 🆘 Need Help?

If you encounter issues:
1. Check the Supabase dashboard logs
2. Review the migration files for errors
3. Verify all environment variables are correct
4. Check the Supabase documentation: https://supabase.com/docs

## 📚 Additional Resources

- [Supabase Migration Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**Good luck with your migration!** 🎉


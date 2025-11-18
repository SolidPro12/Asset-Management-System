# Database Schema Summary

This document provides an overview of all database tables in your Supabase project.

## 📊 Tables Overview

### User Management Tables

#### `profiles`
- **Purpose**: Stores user profile information
- **Key Fields**: id (UUID, linked to auth.users), full_name, email, department, phone
- **Relationships**: Links to auth.users, referenced by many other tables

#### `user_roles`
- **Purpose**: Manages user role assignments
- **Key Fields**: user_id, role (enum: super_admin, admin, hr, user, financer, department_head)
- **Relationships**: Links to auth.users

#### `permission_history`
- **Purpose**: Tracks changes to user permissions/roles
- **Key Fields**: user_id, action, old_role, new_role, changed_by

#### `user_activity_log`
- **Purpose**: Logs user activities (login, logout, actions)
- **Key Fields**: user_id, activity_type, description, entity_id, entity_type

#### `user_management_log`
- **Purpose**: Logs user management actions (create, update, delete)
- **Key Fields**: target_user_id, action_type, performed_by, old_value, new_value

---

### Asset Management Tables

#### `assets`
- **Purpose**: Main table storing all assets
- **Key Fields**: 
  - asset_id, asset_name, asset_tag (unique)
  - category (enum: laptop, desktop, monitor, etc.)
  - status (enum: available, assigned, under_maintenance, retired)
  - current_assignee_id, department, location
- **Relationships**: Referenced by many other tables

#### `asset_allocations`
- **Purpose**: Tracks asset allocations to employees
- **Key Fields**: asset_id, employee_id, allocated_date, return_date, status
- **Relationships**: Links to assets and profiles

#### `asset_history`
- **Purpose**: Historical record of asset assignments
- **Key Fields**: asset_id, assigned_to, assigned_date, return_date, action
- **Relationships**: Links to assets

#### `asset_requests`
- **Purpose**: Asset request records
- **Key Fields**: 
  - requester_id, category, quantity, reason
  - status (enum: pending, approved, rejected, etc.)
  - request_type (enum: regular, urgent, express)
- **Relationships**: Links to auth.users

#### `asset_transfers`
- **Purpose**: Tracks asset transfers between users
- **Key Fields**: asset_id, from_user_id, to_user_id, status, approval flags
- **Relationships**: Links to assets and profiles

#### `asset_activity_log`
- **Purpose**: Detailed activity log for assets
- **Key Fields**: asset_id, activity_type, description, old_value, new_value

---

### Maintenance & Service Tables

#### `maintenance_schedules`
- **Purpose**: Scheduled maintenance for assets
- **Key Fields**: asset_id, maintenance_type, frequency, next_maintenance_date
- **Relationships**: Links to assets and profiles

#### `maintenance_history`
- **Purpose**: Historical maintenance records
- **Key Fields**: asset_id, maintenance_date, maintenance_type, cost, vendor
- **Relationships**: Links to assets, profiles, and maintenance_schedules

#### `service_history`
- **Purpose**: Service records for assets
- **Key Fields**: asset_id, service_date, service_type, cost, vendor
- **Relationships**: Links to assets

---

### Ticket Management Tables

#### `tickets`
- **Purpose**: Support tickets
- **Key Fields**: 
  - ticket_id (unique), title, description
  - status (enum: open, in_progress, resolved, closed, on_hold, cancelled)
  - priority (enum: low, medium, high, critical)
  - issue_category (enum: hardware, software, network, access)
- **Relationships**: Links to assets

#### `ticket_comments`
- **Purpose**: Comments on tickets
- **Key Fields**: ticket_id, user_id, comment
- **Relationships**: Links to tickets

#### `ticket_history`
- **Purpose**: History of ticket changes
- **Key Fields**: ticket_id, action, old_value, new_value, changed_by
- **Relationships**: Links to tickets

---

### Request Management Tables

#### `request_history`
- **Purpose**: History of asset request changes
- **Key Fields**: request_id, action, performed_by, remarks
- **Relationships**: Links to asset_requests

---

### Email & Notification Tables

#### `email_notification_settings`
- **Purpose**: Global email notification settings
- **Key Fields**: notification_type, enabled, description

#### `email_templates`
- **Purpose**: Email templates for notifications
- **Key Fields**: template_name, subject, html_template, variables (JSONB)

#### `email_logs`
- **Purpose**: Logs of all sent emails
- **Key Fields**: notification_type, recipient_email, status, sent_at, error_message

#### `email_digest_preferences`
- **Purpose**: User preferences for email digests
- **Key Fields**: user_id, frequency, enabled, last_sent_at
- **Relationships**: Links to auth.users

---

### System Tables

#### `settings`
- **Purpose**: Application settings
- **Key Fields**: setting_key, setting_value (JSONB), updated_by

---

## 🔑 Enums (Custom Types)

1. **app_role**: `super_admin`, `admin`, `hr`, `user`, `financer`, `department_head`
2. **asset_status**: `available`, `assigned`, `under_maintenance`, `retired`
3. **asset_category**: `laptop`, `desktop`, `monitor`, `keyboard`, `mouse`, `headset`, `printer`, `phone`, `tablet`, `other`
4. **request_status**: `pending`, `approved`, `rejected`, `in_progress`, `completed`, `cancelled`
5. **request_type**: `regular`, `urgent`, `express`
6. **ticket_status**: `open`, `in_progress`, `resolved`, `closed`, `on_hold`, `cancelled`
7. **ticket_priority**: `low`, `medium`, `high`, `critical`
8. **issue_category**: `hardware`, `software`, `network`, `access`
9. **activity_type**: `login`, `logout`, `ticket_created`, `ticket_updated`, `asset_viewed`, `asset_assigned`, `asset_returned`, `asset_status_changed`, `asset_location_changed`, `profile_updated`, `service_added`, `request_created`, `request_updated`

---

## ⚙️ Database Functions

1. **generate_request_id()**: Generates unique request IDs
2. **generate_ticket_id()**: Generates unique ticket IDs
3. **get_user_role(_user_id)**: Returns the role of a user
4. **has_role(_user_id, _role)**: Checks if a user has a specific role
5. **update_user_role(target_user_id, new_role)**: Updates a user's role

---

## 🔒 Security Features

- **Row Level Security (RLS)**: Enabled on all tables
- **Policies**: Custom policies for each table based on user roles
- **Triggers**: Automatic profile creation, updated_at timestamps
- **Foreign Keys**: Proper relationships with CASCADE/SET NULL options

---

## 📈 Indexes

Indexes are created on frequently queried columns:
- Asset status, category, assignee
- Request status, requester
- Ticket status, priority
- Email logs (recipient, status, sent_at)
- User roles
- And more...

---

## 🔄 Migration Order

Migrations are applied in chronological order (by filename timestamp):
1. Base tables and enums
2. Relationships and foreign keys
3. Functions and triggers
4. RLS policies
5. Indexes
6. Additional features and fixes

---

**Total**: 23 tables, 9 enums, 5 functions, multiple triggers and indexes


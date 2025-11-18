import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the caller is a super admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || roleData?.role !== "super_admin") {
      throw new Error("Only super admins can update users");
    }

    const { user_id, email, password, full_name, employee_id, department, phone, role } = await req.json();

    if (!user_id) {
      throw new Error("User ID is required");
    }

    // Prevent self-role modification
    if (user_id === user.id && role && roleData.role !== role) {
      throw new Error("Cannot modify your own role");
    }

    // Check for duplicate email (excluding current user)
    if (email) {
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .neq("id", user_id)
        .maybeSingle();

      if (existingProfile) {
        throw new Error("Email already exists");
      }
    }

    // Check for duplicate employee_id (excluding current user)
    if (employee_id) {
      const { data: existingEmployee } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("employee_id", employee_id)
        .neq("id", user_id)
        .maybeSingle();

      if (existingEmployee) {
        throw new Error("Employee ID already exists");
      }
    }

    // Update auth user
    const updateData: any = {};
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (full_name) {
      updateData.user_metadata = { full_name };
    }

    if (Object.keys(updateData).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        updateData
      );
      if (authError) throw authError;
    }

    // Update profile
    const profileUpdate: any = {};
    if (full_name !== undefined) profileUpdate.full_name = full_name;
    if (email !== undefined) profileUpdate.email = email;
    if (employee_id !== undefined) profileUpdate.employee_id = employee_id;
    if (department !== undefined) profileUpdate.department = department;
    if (phone !== undefined) profileUpdate.phone = phone;

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdate)
        .eq("id", user_id);

      if (profileError) throw profileError;
    }

    // Update role if provided
    if (role) {
      const { error: roleDeleteError } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", user_id);

      if (roleDeleteError) throw roleDeleteError;

      const { error: roleInsertError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id, role });

      if (roleInsertError) throw roleInsertError;
    }

    // Log the action
    await supabaseAdmin.from("user_management_log").insert({
      action_type: "updated",
      target_user_id: user_id,
      performed_by: user.id,
      details: `Updated user ${email || user_id}`,
    });

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

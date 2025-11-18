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
      throw new Error("Only super admins can create users");
    }

    const { email, password, full_name, employee_id, department, phone, role } = await req.json();

    // Validate required fields
    if (!email || !password || !full_name || !employee_id || !role) {
      throw new Error("Missing required fields");
    }

    // Check for duplicate employee_id
    if (employee_id) {
      const { data: existingEmployee } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("employee_id", employee_id)
        .maybeSingle();

      if (existingEmployee) {
        throw new Error("Employee ID already exists");
      }
    }

    // Create auth user with password
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
        employee_id,
      },
    });

    if (authError) {
      // Handle duplicate email error
      if (authError.message?.includes('already been registered')) {
        throw new Error("Email already exists");
      }
      throw authError;
    }

    // Update profile with additional fields
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        employee_id: employee_id || null,
        department: department || null,
        phone: phone || null,
      })
      .eq("id", authData.user.id);

    if (profileError) throw profileError;

    // Set user role
    const { error: roleUpdateError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", authData.user.id);

    if (roleUpdateError) throw roleUpdateError;

    const { error: roleInsertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: authData.user.id, role });

    if (roleInsertError) throw roleInsertError;

    // Log the action
    await supabaseAdmin.from("user_management_log").insert({
      action_type: "created",
      target_user_id: authData.user.id,
      performed_by: user.id,
      details: `Created user ${email} with role ${role}`,
    });

    return new Response(
      JSON.stringify({ success: true, user_id: authData.user.id }),
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

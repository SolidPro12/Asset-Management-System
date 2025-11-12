import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailConfig {
  email_host: string;
  email_port: number;
  email_host_user: string;
  email_host_password: string;
  from_email: string;
  from_name: string;
  tls_enabled: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get and verify Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is authenticated and is super admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token', details: authError.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!user) {
      console.error('No user found in token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: User not found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    // Check if user is super admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || roleData.role !== 'super_admin') {
      console.error('User is not super admin');
      return new Response(
        JSON.stringify({ error: 'Forbidden: Super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { emailConfig, testEmail } = await req.json();

    if (!emailConfig || !testEmail) {
      return new Response(
        JSON.stringify({ error: 'Email configuration and test email address are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending test email with config:', {
      host: emailConfig.email_host,
      port: emailConfig.email_port,
      user: emailConfig.email_host_user,
      to: testEmail
    });

    // Create SMTP client using denomailer
    const client = new SMTPClient({
      connection: {
        hostname: emailConfig.email_host,
        port: emailConfig.email_port,
        tls: emailConfig.tls_enabled,
        auth: {
          username: emailConfig.email_host_user,
          password: emailConfig.email_host_password,
        },
      },
    });

    // Send test email
    await client.send({
      from: `${emailConfig.from_name} <${emailConfig.from_email}>`,
      to: testEmail,
      subject: 'Test Email - Asset Management System',
      content: 'This is a test email from your Asset Management System. If you receive this, your email configuration is working correctly!',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Test Email</h2>
          <p>This is a test email from your <strong>Asset Management System</strong>.</p>
          <p>If you receive this, your email configuration is working correctly!</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This email was sent from ${emailConfig.email_host} using port ${emailConfig.email_port}
          </p>
        </div>
      `,
    });

    await client.close();

    console.log('Email sent successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test email sent successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error sending test email:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send test email', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
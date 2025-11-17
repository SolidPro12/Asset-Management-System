import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, userName } = await req.json();

    if (!userEmail || !userName) {
      return new Response(
        JSON.stringify({ error: 'User email and name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);

    const { data, error: resendError } = await resend.emails.send({
      from: 'Asset Management System <onboarding@resend.dev>',
      to: [userEmail],
      subject: 'Welcome to Asset Management System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .feature { padding: 15px 0; border-bottom: 1px solid #f0f0f0; }
            .feature:last-child { border-bottom: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Asset Management System!</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>We're excited to have you on board! Your account has been successfully created.</p>
              
              <h3>What you can do:</h3>
              <div class="feature">
                <strong>📦 Manage Assets</strong><br>
                Track and manage your organization's assets efficiently
              </div>
              <div class="feature">
                <strong>🔄 Asset Transfers</strong><br>
                Request and approve asset transfers seamlessly
              </div>
              <div class="feature">
                <strong>🔧 Maintenance Tracking</strong><br>
                Schedule and monitor asset maintenance
              </div>
              <div class="feature">
                <strong>🎫 Support Tickets</strong><br>
                Create and manage support requests
              </div>
              
              <p>If you have any questions or need assistance, don't hesitate to reach out to your administrator.</p>
              
              <p>Best regards,<br>Asset Management System Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Asset Management System</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (resendError) {
      console.error('Resend error:', resendError);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: resendError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error sending welcome email:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send welcome email', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

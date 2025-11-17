import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const { 
      recipientEmail, 
      recipientName, 
      assetName, 
      maintenanceType, 
      scheduledDate,
      frequency,
      notes 
    } = await req.json();

    if (!recipientEmail || !recipientName || !assetName || !maintenanceType) {
      return new Response(
        JSON.stringify({ error: 'Required fields missing' }),
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
      to: [recipientEmail],
      subject: `Maintenance Reminder: ${assetName} - ${maintenanceType}`,
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
            .maintenance-info { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .info-row { padding: 10px 0; }
            .label { font-weight: bold; color: #667eea; }
            .priority { background: #fee2e2; border: 2px solid #ef4444; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔧 Maintenance Reminder</h1>
            </div>
            <div class="content">
              <p>Hi ${recipientName},</p>
              <p>This is a reminder about upcoming maintenance for an asset assigned to you:</p>
              
              <div class="maintenance-info">
                <div class="info-row">
                  <span class="label">Asset:</span> ${assetName}
                </div>
                <div class="info-row">
                  <span class="label">Maintenance Type:</span> ${maintenanceType}
                </div>
                ${scheduledDate ? `<div class="info-row"><span class="label">Scheduled Date:</span> ${new Date(scheduledDate).toLocaleDateString()}</div>` : ''}
                ${frequency ? `<div class="info-row"><span class="label">Frequency:</span> ${frequency}</div>` : ''}
                ${notes ? `<div class="info-row"><span class="label">Notes:</span> ${notes}</div>` : ''}
              </div>
              
              <div class="priority">
                <strong>⚠️ Important:</strong><br>
                Please ensure the maintenance is completed on schedule to maintain optimal asset performance and prevent potential issues.
              </div>
              
              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Review the maintenance requirements</li>
                <li>Schedule the maintenance if not already done</li>
                <li>Update the system once maintenance is completed</li>
                <li>Report any issues discovered during maintenance</li>
              </ul>
              
              <p>If you have any questions or need to reschedule, please contact your administrator.</p>
              
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
    console.error('Error sending maintenance reminder email:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send email', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

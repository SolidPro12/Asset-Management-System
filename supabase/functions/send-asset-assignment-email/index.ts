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
    const { userEmail, userName, assetName, assetId, assignedBy, assignedDate } = await req.json();

    if (!userEmail || !userName || !assetName) {
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
      to: [userEmail],
      subject: `Asset Assigned: ${assetName}`,
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
            .asset-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .info-row { padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
            .info-row:last-child { border-bottom: none; }
            .label { font-weight: bold; color: #667eea; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📦 Asset Assigned</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>An asset has been assigned to you. Please review the details below:</p>
              
              <div class="asset-info">
                <div class="info-row">
                  <span class="label">Asset Name:</span> ${assetName}
                </div>
                ${assetId ? `<div class="info-row"><span class="label">Asset ID:</span> ${assetId}</div>` : ''}
                ${assignedBy ? `<div class="info-row"><span class="label">Assigned By:</span> ${assignedBy}</div>` : ''}
                ${assignedDate ? `<div class="info-row"><span class="label">Assigned Date:</span> ${new Date(assignedDate).toLocaleDateString()}</div>` : ''}
              </div>
              
              <p><strong>Important:</strong></p>
              <ul>
                <li>You are now responsible for this asset</li>
                <li>Please report any issues immediately</li>
                <li>Follow proper care and maintenance guidelines</li>
                <li>Return the asset when requested</li>
              </ul>
              
              <p>If you have any questions about this assignment, please contact your administrator.</p>
              
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
    console.error('Error sending asset assignment email:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send email', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

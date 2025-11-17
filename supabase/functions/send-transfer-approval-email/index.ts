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
      fromUser, 
      toUser, 
      transferStatus,
      actionRequired 
    } = await req.json();

    if (!recipientEmail || !recipientName || !assetName) {
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

    const statusColors = {
      pending: '#f59e0b',
      approved: '#10b981',
      rejected: '#ef4444',
      completed: '#6366f1',
    };

    const statusColor = statusColors[transferStatus as keyof typeof statusColors] || '#667eea';

    const { data, error: resendError } = await resend.emails.send({
      from: 'Asset Management System <onboarding@resend.dev>',
      to: [recipientEmail],
      subject: `Asset Transfer ${actionRequired ? 'Approval Required' : 'Update'}: ${assetName}`,
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
            .transfer-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusColor}; }
            .info-row { padding: 10px 0; }
            .label { font-weight: bold; color: #667eea; }
            .status-badge { display: inline-block; padding: 5px 15px; background: ${statusColor}; color: white; border-radius: 20px; font-size: 14px; }
            .action-required { background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔄 Asset Transfer ${actionRequired ? 'Approval Required' : 'Update'}</h1>
            </div>
            <div class="content">
              <p>Hi ${recipientName},</p>
              <p>${actionRequired ? 'Your approval is required for an asset transfer:' : 'An asset transfer has been updated:'}</p>
              
              <div class="transfer-info">
                <div class="info-row">
                  <span class="label">Asset:</span> ${assetName}
                </div>
                <div class="info-row">
                  <span class="label">From:</span> ${fromUser || 'N/A'}
                </div>
                <div class="info-row">
                  <span class="label">To:</span> ${toUser}
                </div>
                <div class="info-row">
                  <span class="label">Status:</span> <span class="status-badge">${transferStatus.toUpperCase()}</span>
                </div>
              </div>
              
              ${actionRequired ? `
                <div class="action-required">
                  <strong>⚠️ Action Required:</strong><br>
                  Please log in to the Asset Management System to review and approve/reject this transfer request.
                </div>
              ` : ''}
              
              <p>${actionRequired ? 'Please review this transfer request at your earliest convenience.' : 'This is a notification about the transfer status update.'}</p>
              
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
    console.error('Error sending transfer approval email:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send email', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

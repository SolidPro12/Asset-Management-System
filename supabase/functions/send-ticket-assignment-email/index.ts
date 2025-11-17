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
      ticketId,
      ticketTitle, 
      ticketDescription,
      priority,
      assetName,
      location,
      createdBy
    } = await req.json();

    if (!recipientEmail || !recipientName || !ticketTitle) {
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

    const priorityColors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#dc2626',
    };

    const priorityColor = priorityColors[priority as keyof typeof priorityColors] || '#667eea';

    const { data, error: resendError } = await resend.emails.send({
      from: 'Asset Management System <onboarding@resend.dev>',
      to: [recipientEmail],
      subject: `Ticket Assigned: ${ticketTitle} [${priority?.toUpperCase()}]`,
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
            .ticket-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${priorityColor}; }
            .info-row { padding: 10px 0; }
            .label { font-weight: bold; color: #667eea; }
            .priority-badge { display: inline-block; padding: 5px 15px; background: ${priorityColor}; color: white; border-radius: 20px; font-size: 14px; font-weight: bold; }
            .description-box { background: #ffffff; border: 1px solid #e0e0e0; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎫 New Ticket Assigned</h1>
            </div>
            <div class="content">
              <p>Hi ${recipientName},</p>
              <p>A new support ticket has been assigned to you. Please review the details below:</p>
              
              <div class="ticket-info">
                ${ticketId ? `<div class="info-row"><span class="label">Ticket ID:</span> ${ticketId}</div>` : ''}
                <div class="info-row">
                  <span class="label">Title:</span> ${ticketTitle}
                </div>
                <div class="info-row">
                  <span class="label">Priority:</span> <span class="priority-badge">${priority?.toUpperCase() || 'MEDIUM'}</span>
                </div>
                ${assetName ? `<div class="info-row"><span class="label">Asset:</span> ${assetName}</div>` : ''}
                ${location ? `<div class="info-row"><span class="label">Location:</span> ${location}</div>` : ''}
                ${createdBy ? `<div class="info-row"><span class="label">Reported By:</span> ${createdBy}</div>` : ''}
              </div>
              
              ${ticketDescription ? `
                <div class="description-box">
                  <strong>Description:</strong><br>
                  ${ticketDescription}
                </div>
              ` : ''}
              
              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Log in to the Asset Management System to view full ticket details</li>
                <li>Assess the issue and update the ticket status</li>
                <li>Communicate with the reporter if more information is needed</li>
                <li>Complete the resolution and close the ticket</li>
              </ul>
              
              ${priority === 'critical' || priority === 'high' ? `
                <p style="background: #fee2e2; border: 2px solid #ef4444; padding: 15px; border-radius: 8px;">
                  <strong>⚠️ High Priority:</strong> This ticket requires immediate attention. Please address it as soon as possible.
                </p>
              ` : ''}
              
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
    console.error('Error sending ticket assignment email:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send email', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

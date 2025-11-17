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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if digest notifications are enabled
    const { data: settings } = await supabaseClient
      .from('email_notification_settings')
      .select('enabled')
      .eq('notification_type', 'email_digest')
      .single();

    if (!settings?.enabled) {
      console.log('Email digest notifications are disabled');
      return new Response(
        JSON.stringify({ message: 'Email digest notifications are disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get admin users with digest preferences
    const { data: admins } = await supabaseClient
      .from('user_roles')
      .select('user_id, profiles!inner(email, full_name)')
      .in('role', ['super_admin', 'admin']);

    if (!admins || admins.length === 0) {
      console.log('No admin users found');
      return new Response(
        JSON.stringify({ message: 'No admin users to send digest to' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Aggregate data for digest
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get pending transfer approvals
    const { data: pendingTransfers } = await supabaseClient
      .from('asset_transfers')
      .select('id, asset_name, to_user_name, initiated_at')
      .eq('status', 'pending')
      .order('initiated_at', { ascending: false });

    // Get upcoming maintenance (next 7 days)
    const { data: upcomingMaintenance } = await supabaseClient
      .from('maintenance_schedules')
      .select('id, asset_name, maintenance_type, next_maintenance_date')
      .eq('status', 'scheduled')
      .gte('next_maintenance_date', today.toISOString().split('T')[0])
      .lte('next_maintenance_date', new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('next_maintenance_date');

    // Get open tickets
    const { data: openTickets } = await supabaseClient
      .from('tickets')
      .select('id, ticket_id, title, priority, created_at')
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recent asset requests
    const { data: recentRequests } = await supabaseClient
      .from('asset_requests')
      .select('id, request_id, category, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const resend = new Resend(resendApiKey);
    let sentCount = 0;

    // Send digest to each admin
    for (const admin of admins) {
      const profile = Array.isArray(admin.profiles) ? admin.profiles[0] : admin.profiles;
      if (!profile?.email) continue;

      const { error: resendError } = await resend.emails.send({
        from: 'Asset Management System <onboarding@resend.dev>',
        to: [profile.email],
        subject: `Asset Management Digest - ${today.toLocaleDateString()}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 700px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
              .section { margin: 25px 0; }
              .section-title { color: #667eea; font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #667eea; padding-bottom: 5px; }
              .item { background: #f8f9fa; padding: 12px; margin: 8px 0; border-radius: 5px; border-left: 3px solid #667eea; }
              .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; }
              .badge-critical { background: #fee2e2; color: #dc2626; }
              .badge-high { background: #fef3c7; color: #f59e0b; }
              .badge-medium { background: #dbeafe; color: #3b82f6; }
              .badge-pending { background: #fef3c7; color: #f59e0b; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              .stats { display: flex; justify-content: space-around; margin: 20px 0; }
              .stat-box { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px; flex: 1; margin: 0 5px; }
              .stat-number { font-size: 32px; font-weight: bold; color: #667eea; }
              .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📊 Daily Asset Management Digest</h1>
                <p>${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div class="content">
                <p>Hi ${profile.full_name || 'Admin'},</p>
                <p>Here's your daily summary of pending items and upcoming tasks:</p>
                
                <div class="stats">
                  <div class="stat-box">
                    <div class="stat-number">${pendingTransfers?.length || 0}</div>
                    <div class="stat-label">Pending Transfers</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-number">${upcomingMaintenance?.length || 0}</div>
                    <div class="stat-label">Upcoming Maintenance</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-number">${openTickets?.length || 0}</div>
                    <div class="stat-label">Open Tickets</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-number">${recentRequests?.length || 0}</div>
                    <div class="stat-label">Pending Requests</div>
                  </div>
                </div>

                ${pendingTransfers && pendingTransfers.length > 0 ? `
                  <div class="section">
                    <div class="section-title">🔄 Pending Transfer Approvals</div>
                    ${pendingTransfers.map(transfer => `
                      <div class="item">
                        <strong>${transfer.asset_name}</strong><br>
                        <small>To: ${transfer.to_user_name} | Initiated: ${new Date(transfer.initiated_at).toLocaleDateString()}</small>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}

                ${upcomingMaintenance && upcomingMaintenance.length > 0 ? `
                  <div class="section">
                    <div class="section-title">🔧 Upcoming Maintenance (Next 7 Days)</div>
                    ${upcomingMaintenance.map(maintenance => `
                      <div class="item">
                        <strong>${maintenance.asset_name}</strong> - ${maintenance.maintenance_type}<br>
                        <small>Scheduled: ${new Date(maintenance.next_maintenance_date).toLocaleDateString()}</small>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}

                ${openTickets && openTickets.length > 0 ? `
                  <div class="section">
                    <div class="section-title">🎫 Open Tickets</div>
                    ${openTickets.slice(0, 5).map(ticket => `
                      <div class="item">
                        <strong>${ticket.ticket_id}</strong>: ${ticket.title}
                        <span class="badge badge-${ticket.priority}">${ticket.priority?.toUpperCase()}</span><br>
                        <small>Created: ${new Date(ticket.created_at).toLocaleDateString()}</small>
                      </div>
                    `).join('')}
                    ${openTickets.length > 5 ? `<p><small>... and ${openTickets.length - 5} more</small></p>` : ''}
                  </div>
                ` : ''}

                ${recentRequests && recentRequests.length > 0 ? `
                  <div class="section">
                    <div class="section-title">📦 Pending Asset Requests</div>
                    ${recentRequests.slice(0, 5).map(request => `
                      <div class="item">
                        <strong>${request.request_id}</strong> - ${request.category}
                        <span class="badge badge-pending">${request.status?.toUpperCase()}</span><br>
                        <small>Requested: ${new Date(request.created_at).toLocaleDateString()}</small>
                      </div>
                    `).join('')}
                    ${recentRequests.length > 5 ? `<p><small>... and ${recentRequests.length - 5} more</small></p>` : ''}
                  </div>
                ` : ''}

                ${!pendingTransfers?.length && !upcomingMaintenance?.length && !openTickets?.length && !recentRequests?.length ? `
                  <div class="section">
                    <p style="text-align: center; color: #10b981; font-size: 18px;">✅ All caught up! No pending items.</p>
                  </div>
                ` : ''}

                <p style="margin-top: 30px;">Log in to the Asset Management System to review and take action on these items.</p>
                
                <p>Best regards,<br>Asset Management System</p>
              </div>
              <div class="footer">
                <p>This is an automated digest email from Asset Management System</p>
                <p>You're receiving this because you're an administrator</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (resendError) {
        console.error(`Failed to send digest to ${profile.email}:`, resendError);
        
        // Log failed email
        await supabaseClient.from('email_logs').insert({
          notification_type: 'email_digest',
          recipient_email: profile.email,
          recipient_name: profile.full_name,
          subject: `Asset Management Digest - ${today.toLocaleDateString()}`,
          status: 'failed',
          error_message: resendError.message,
        });
      } else {
        sentCount++;
        
        // Log successful email
        await supabaseClient.from('email_logs').insert({
          notification_type: 'email_digest',
          recipient_email: profile.email,
          recipient_name: profile.full_name,
          subject: `Asset Management Digest - ${today.toLocaleDateString()}`,
          status: 'sent',
          metadata: {
            pendingTransfers: pendingTransfers?.length || 0,
            upcomingMaintenance: upcomingMaintenance?.length || 0,
            openTickets: openTickets?.length || 0,
            pendingRequests: recentRequests?.length || 0,
          },
        });
      }
    }

    console.log(`Email digest sent to ${sentCount} admin(s)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Digest sent to ${sentCount} admin(s)`,
        stats: {
          pendingTransfers: pendingTransfers?.length || 0,
          upcomingMaintenance: upcomingMaintenance?.length || 0,
          openTickets: openTickets?.length || 0,
          pendingRequests: recentRequests?.length || 0,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error sending email digest:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send email digest', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

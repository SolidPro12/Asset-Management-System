import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusEmailRequest {
  recipientEmail: string;
  recipientName: string;
  status: 'approved' | 'rejected';
  message: string;
  subject: string;
  notificationType: string;
  metadata?: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      recipientEmail, 
      recipientName, 
      status, 
      message, 
      subject,
      notificationType,
      metadata 
    }: StatusEmailRequest = await req.json();

    console.log(`Email notification for ${recipientEmail}:`, { status, subject });

    // Log the email to database
    const { error: logError } = await supabase.from('email_logs').insert({
      notification_type: notificationType,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      subject: subject,
      status: 'sent',
      metadata: {
        ...metadata,
        status,
        message,
        note: 'Email logged to database - configure SMTP in Supabase Auth settings for actual delivery'
      }
    });

    if (logError) {
      console.error("Error logging email:", logError);
      throw logError;
    }

    // Note: Actual email sending requires SMTP configuration in Supabase Auth settings
    // This function logs the email event to the database for tracking purposes
    console.log(`Email notification logged successfully for: ${recipientEmail}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email notification logged",
        note: "Configure SMTP in Supabase Auth settings for actual email delivery"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-status-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

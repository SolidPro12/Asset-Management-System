import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransferNotificationRequest {
  transferId: string;
  recipientEmail: string;
  recipientName: string;
  assetName: string;
  initiatorName: string;
  type: 'approval_request' | 'transfer_completed';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { transferId, recipientEmail, recipientName, assetName, initiatorName, type }: TransferNotificationRequest = await req.json();

    console.log("Sending transfer notification:", { transferId, recipientEmail, type });

    // In a real implementation, you would integrate with an email service like Resend
    // For now, we'll just log the notification
    console.log(`
      Email notification would be sent to: ${recipientEmail}
      Subject: ${type === 'approval_request' ? 'Asset Transfer Approval Required' : 'Asset Transfer Completed'}
      
      Dear ${recipientName},
      
      ${type === 'approval_request' 
        ? `An asset transfer has been initiated by ${initiatorName} for asset "${assetName}". Your approval is required to proceed with the transfer. Please log in to the system to approve or reject this transfer.`
        : `The asset transfer for "${assetName}" has been completed successfully.`}
      
      Transfer ID: ${transferId}
      
      Best regards,
      Asset Management System
    `);

    return new Response(
      JSON.stringify({ success: true, message: "Notification logged" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
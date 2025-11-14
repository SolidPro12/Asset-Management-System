import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { ticketId } = await req.json();

    if (!ticketId) {
      return new Response(
        JSON.stringify({ error: 'Ticket ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Cancel Ticket] User ${user.id} attempting to cancel ticket ${ticketId}`);

    // Fetch the ticket to validate ownership and status
    const { data: ticket, error: fetchError } = await supabaseClient
      .from('tickets')
      .select('id, ticket_id, status, created_by')
      .eq('id', ticketId)
      .single();

    if (fetchError || !ticket) {
      console.error('Error fetching ticket:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Ticket not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns the ticket
    if (ticket.created_by !== user.id) {
      console.error(`User ${user.id} does not own ticket ${ticketId}`);
      return new Response(
        JSON.stringify({ error: 'You can only cancel your own tickets' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRITICAL: Only allow cancellation if status is "open"
    if (ticket.status !== 'open') {
      console.error(`Ticket ${ticketId} status is ${ticket.status}, cannot cancel`);
      return new Response(
        JSON.stringify({ 
          error: 'Only tickets with Open status can be cancelled',
          currentStatus: ticket.status 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update ticket status to cancelled
    const { data: updatedTicket, error: updateError } = await supabaseClient
      .from('tickets')
      .update({ status: 'cancelled' })
      .eq('id', ticketId)
      .select('id, ticket_id, status')
      .single();

    if (updateError) {
      console.error('Error updating ticket:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to cancel ticket', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Cancel Ticket] Successfully cancelled ticket ${ticket.ticket_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ticket: updatedTicket,
        message: `Ticket ${ticket.ticket_id} cancelled successfully`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in cancel-ticket function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

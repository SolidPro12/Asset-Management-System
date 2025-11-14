import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify the caller is a super_admin
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roles || roles.role !== 'super_admin') {
      console.log(`[Delete User] User ${user.id} is not super_admin, role: ${roles?.role}`)
      return new Response(JSON.stringify({ error: 'Only Super Admins can delete users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get user ID to delete from request
    const { userId } = await req.json()
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[Delete User] Super Admin ${user.id} attempting to delete user ${userId}`)

    // Prevent deleting yourself
    if (userId === user.id) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if target user is also a Super Admin
    const { data: targetUserRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single()

    if (targetUserRole && targetUserRole.role === 'super_admin') {
      console.log(`[Delete User] Cannot delete Super Admin ${userId}`)
      return new Response(JSON.stringify({ 
        error: 'Cannot delete another Super Admin account' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if user has active tickets (open or in_progress)
    const { data: activeTickets, error: ticketsError } = await supabaseClient
      .from('tickets')
      .select('id, ticket_id, status')
      .eq('created_by', userId)
      .in('status', ['open', 'in_progress'])

    if (ticketsError) {
      console.error('[Delete User] Error checking tickets:', ticketsError)
      return new Response(JSON.stringify({ 
        error: 'Failed to verify user tickets' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (activeTickets && activeTickets.length > 0) {
      const ticketIds = activeTickets.map(t => t.ticket_id).join(', ')
      console.log(`[Delete User] User ${userId} has ${activeTickets.length} active tickets: ${ticketIds}`)
      return new Response(JSON.stringify({ 
        error: `User cannot be deleted because they have active tickets (${activeTickets.length} ticket(s): ${ticketIds})`,
        activeTicketsCount: activeTickets.length
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Delete user - cascade will handle profiles and user_roles
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (error) {
      console.error('[Delete User] Error deleting user:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[Delete User] Successfully deleted user ${userId}`)
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('[Delete User] Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'An unknown error occurred'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

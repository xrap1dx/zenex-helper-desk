import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, ...params } = await req.json();
    console.log(`Staff auth action: ${action}`);

    switch (action) {
      case 'login': {
        const { username, password } = params;
        
        // Get staff member by username using service role
        const { data: staff, error } = await supabase
          .from('staff')
          .select('id, username, display_name, role, department_id, is_online, password_hash')
          .eq('username', username)
          .single();

        if (error || !staff) {
          console.log('Login failed: user not found');
          return new Response(
            JSON.stringify({ error: 'Invalid credentials' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify password
        const valid = await bcrypt.compare(password, staff.password_hash);
        if (!valid) {
          console.log('Login failed: invalid password');
          return new Response(
            JSON.stringify({ error: 'Invalid credentials' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update online status
        await supabase
          .from('staff')
          .update({ is_online: true, last_seen: new Date().toISOString() })
          .eq('id', staff.id);

        // Return staff without password_hash
        const { password_hash, ...safeStaff } = staff;
        console.log(`Login successful for: ${username}`);
        
        return new Response(
          JSON.stringify({ staff: safeStaff }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'logout': {
        const { staffId } = params;
        
        await supabase
          .from('staff')
          .update({ is_online: false, last_seen: new Date().toISOString() })
          .eq('id', staffId);

        console.log(`Logout successful for staff ID: ${staffId}`);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create': {
        const { username, password, displayName, role, departmentId, createdBy } = params;

        // Check if username already exists
        const { data: existing } = await supabase
          .from('staff')
          .select('id')
          .eq('username', username)
          .single();

        if (existing) {
          return new Response(
            JSON.stringify({ error: 'Username already exists' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create staff member
        const { data: newStaff, error } = await supabase
          .from('staff')
          .insert({
            username,
            password_hash: passwordHash,
            display_name: displayName,
            role,
            department_id: departmentId,
            created_by: createdBy,
          })
          .select('id, username, display_name, role, department_id, is_online, created_at')
          .single();

        if (error) {
          console.error('Create staff error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to create staff member' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Staff created: ${username}`);
        return new Response(
          JSON.stringify({ staff: newStaff }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list': {
        const { data: staffList, error } = await supabase
          .from('staff')
          .select('id, username, display_name, role, department_id, is_online, created_at, created_by, departments(name)')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('List staff error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch staff' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ staff: staffList }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        const { staffId, updates } = params;
        
        // Don't allow updating password_hash directly
        const { password_hash, ...safeUpdates } = updates;

        const { error } = await supabase
          .from('staff')
          .update(safeUpdates)
          .eq('id', staffId);

        if (error) {
          console.error('Update staff error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to update staff' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Staff updated: ${staffId}`);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        const { staffId, requesterId } = params;
        
        // Prevent self-deletion
        if (staffId === requesterId) {
          return new Response(
            JSON.stringify({ error: 'Cannot delete your own account' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('staff')
          .delete()
          .eq('id', staffId);

        if (error) {
          console.error('Delete staff error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to delete staff' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Staff deleted: ${staffId}`);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Staff auth error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

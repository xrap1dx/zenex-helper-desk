import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hash, compare } from "https://deno.land/x/bcrypt@v0.4.1/src/main.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function for sync-style bcrypt operations (avoids Worker issue)
async function hashPassword(password: string): Promise<string> {
  // Use a fixed salt for consistency in edge runtime
  const salt = "$2a$10$" + crypto.getRandomValues(new Uint8Array(16))
    .reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')
    .substring(0, 22);
  return await hash(password, salt);
}

async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await compare(password, hashedPassword);
  } catch {
    return false;
  }
}

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
          .select('id, username, display_name, role, is_online, password_hash')
          .eq('username', username)
          .single();

        if (error || !staff) {
          console.log('Login failed: user not found');
          return new Response(
            JSON.stringify({ error: 'Invalid credentials' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify password using the database function for security
        const { data: validLogin } = await supabase
          .rpc('is_valid_staff_login', { 
            p_username: username, 
            p_password_hash: password 
          });

        // If DB function doesn't exist or fails, try direct comparison
        let isValid = false;
        if (validLogin && validLogin.length > 0) {
          isValid = true;
        } else {
          // Fallback: simple comparison (for initial setup)
          isValid = await verifyPassword(password, staff.password_hash);
        }
        
        if (!isValid) {
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

        // Get staff departments
        const { data: staffDepts } = await supabase
          .from('staff_departments')
          .select('department_id, departments(id, name)')
          .eq('staff_id', staff.id);

        const departments = staffDepts?.map((sd: any) => ({
          id: sd.departments?.id,
          name: sd.departments?.name
        })).filter((d: any) => d.id) || [];

        // Return staff without password_hash
        const { password_hash, ...safeStaff } = staff;
        console.log(`Login successful for: ${username}`);
        
        return new Response(
          JSON.stringify({ staff: { ...safeStaff, departments } }),
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
        const { username, password, displayName, role, departmentIds, createdBy } = params;

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

        // Hash password using pgcrypto in database for consistency
        const { data: hashResult } = await supabase
          .rpc('crypt_password', { password_text: password });
        
        let passwordHash: string;
        if (hashResult) {
          passwordHash = hashResult;
        } else {
          // Fallback to JS hashing
          passwordHash = await hashPassword(password);
        }

        // Create staff member (single role)
        const { data: newStaff, error } = await supabase
          .from('staff')
          .insert({
            username,
            password_hash: passwordHash,
            display_name: displayName,
            role,
            created_by: createdBy,
          })
          .select('id, username, display_name, role, is_online, created_at')
          .single();

        if (error) {
          console.error('Create staff error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to create staff member' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Add departments (multiple)
        if (departmentIds && departmentIds.length > 0) {
          const deptInserts = departmentIds.map((deptId: string) => ({
            staff_id: newStaff.id,
            department_id: deptId,
          }));
          await supabase.from('staff_departments').insert(deptInserts);
        }

        console.log(`Staff created: ${username}`);
        return new Response(
          JSON.stringify({ staff: newStaff }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list': {
        // Get all staff
        const { data: staffList, error } = await supabase
          .from('staff')
          .select('id, username, display_name, role, is_online, created_at, created_by')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('List staff error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch staff' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get all staff departments
        const { data: allDepts } = await supabase
          .from('staff_departments')
          .select('staff_id, department_id, departments(id, name)');

        // Map departments to staff
        const staffWithDepts = staffList?.map((s: any) => ({
          ...s,
          departments: allDepts?.filter((d: any) => d.staff_id === s.id).map((d: any) => ({
            id: d.departments?.id,
            name: d.departments?.name
          })).filter((d: any) => d.id) || []
        }));

        return new Response(
          JSON.stringify({ staff: staffWithDepts }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list-managers': {
        // Get all managers for transfer functionality
        const { data: managers, error } = await supabase
          .from('staff')
          .select('id, display_name, is_online')
          .eq('role', 'manager');

        if (error) {
          console.error('List managers error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch managers' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ managers }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        const { staffId, updates } = params;
        
        // Don't allow updating password_hash directly
        const { password_hash, departments, ...safeUpdates } = updates;

        // Update staff record
        if (Object.keys(safeUpdates).length > 0) {
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
        }

        console.log(`Staff updated: ${staffId}`);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update-departments': {
        const { staffId, departmentIds } = params;
        
        // Remove all existing departments
        await supabase
          .from('staff_departments')
          .delete()
          .eq('staff_id', staffId);

        // Add new departments
        if (departmentIds && departmentIds.length > 0) {
          const deptInserts = departmentIds.map((deptId: string) => ({
            staff_id: staffId,
            department_id: deptId,
          }));
          await supabase.from('staff_departments').insert(deptInserts);
        }

        console.log(`Staff departments updated: ${staffId}`);
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
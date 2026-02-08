import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("USER_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("USER_SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { action, ...params } = await req.json();
    console.log(`Staff auth action: ${action}`);

    switch (action) {
      case "login": {
        const { username, password } = params;
        const { data: staff, error } = await supabase
          .from("staff_members")
          .select("*")
          .eq("username", username)
          .single();

        if (error || !staff) return json({ error: "Invalid credentials" }, 401);
        if (!staff.is_active) return json({ error: "Account is deactivated" }, 401);
        if (staff.is_suspended)
          return json({ error: `Account suspended: ${staff.suspension_reason || "Contact administrator"}` }, 401);

        const { data: valid } = await supabase.rpc("verify_bcrypt_password", {
          password_attempt: password,
          password_hash: staff.password_hash,
        });

        if (!valid) return json({ error: "Invalid credentials" }, 401);

        await supabase.from("staff_members").update({ status: "online" }).eq("id", staff.id);

        const { password_hash, ...safeStaff } = staff;
        return json({ staff: safeStaff });
      }

      case "logout": {
        const { staffId } = params;
        await supabase.from("staff_members").update({ status: "offline" }).eq("id", staffId);
        return json({ success: true });
      }

      case "create": {
        const { username, password, fullName, email, role, departments } = params;

        const { data: existing } = await supabase
          .from("staff_members")
          .select("id")
          .eq("username", username)
          .single();
        if (existing) return json({ error: "Username already exists" }, 400);

        const { data: hash, error: hashErr } = await supabase.rpc("hash_bcrypt_password", {
          password_text: password,
        });
        if (hashErr || !hash) return json({ error: "Failed to hash password" }, 500);

        const { data: newStaff, error } = await supabase
          .from("staff_members")
          .insert({
            username,
            password_hash: hash,
            full_name: fullName,
            email: email || null,
            role: role || "agent",
            departments: departments || [],
          })
          .select(
            "id, username, full_name, email, role, departments, status, is_active, is_suspended, is_oncall, total_chats_handled, total_rating, rating_count, created_at"
          )
          .single();

        if (error) {
          console.error("Create error:", error);
          return json({ error: "Failed to create staff" }, 500);
        }
        return json({ staff: newStaff });
      }

      case "list": {
        const { data, error } = await supabase
          .from("staff_members")
          .select(
            "id, username, full_name, email, role, departments, status, is_active, is_suspended, suspension_reason, is_oncall, total_chats_handled, total_rating, rating_count, created_at"
          )
          .order("created_at", { ascending: false });

        if (error) return json({ error: "Failed to list staff" }, 500);
        return json({ staff: data });
      }

      case "update": {
        const { staffId, updates } = params;
        const { password_hash, ...safe } = updates;
        const { error } = await supabase.from("staff_members").update(safe).eq("id", staffId);
        if (error) return json({ error: "Failed to update" }, 500);
        return json({ success: true });
      }

      case "suspend": {
        const { staffId, reason } = params;
        await supabase
          .from("staff_members")
          .update({
            is_suspended: true,
            suspension_reason: reason || "Suspended by admin",
            status: "offline",
          })
          .eq("id", staffId);
        return json({ success: true });
      }

      case "unsuspend": {
        const { staffId } = params;
        await supabase
          .from("staff_members")
          .update({ is_suspended: false, suspension_reason: null })
          .eq("id", staffId);
        return json({ success: true });
      }

      case "change-password": {
        const { staffId, currentPassword, newPassword } = params;
        const { data: staff } = await supabase
          .from("staff_members")
          .select("password_hash")
          .eq("id", staffId)
          .single();
        if (!staff) return json({ error: "Staff not found" }, 404);

        const { data: valid } = await supabase.rpc("verify_bcrypt_password", {
          password_attempt: currentPassword,
          password_hash: staff.password_hash,
        });
        if (!valid) return json({ error: "Current password is incorrect" }, 401);

        const { data: hash } = await supabase.rpc("hash_bcrypt_password", { password_text: newPassword });
        if (!hash) return json({ error: "Failed to hash password" }, 500);

        await supabase.from("staff_members").update({ password_hash: hash }).eq("id", staffId);
        return json({ success: true });
      }

      case "reset-password": {
        const { staffId, newPassword } = params;
        const { data: hash } = await supabase.rpc("hash_bcrypt_password", { password_text: newPassword });
        if (!hash) return json({ error: "Failed to hash password" }, 500);
        await supabase.from("staff_members").update({ password_hash: hash }).eq("id", staffId);
        return json({ success: true });
      }

      case "delete": {
        const { staffId, requesterId } = params;
        if (staffId === requesterId) return json({ error: "Cannot delete your own account" }, 400);

        await supabase.from("chat_sessions").update({ assigned_to: null }).eq("assigned_to", staffId);
        const { error } = await supabase.from("staff_members").delete().eq("id", staffId);
        if (error) return json({ error: "Failed to delete" }, 500);
        return json({ success: true });
      }

      default:
        return json({ error: "Invalid action" }, 400);
    }
  } catch (error) {
    console.error("Staff auth error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});

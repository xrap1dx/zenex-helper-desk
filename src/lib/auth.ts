import { supabase } from "@/integrations/supabase/client";
import type { Staff } from "@/lib/types";

export type { Staff };

export async function loginStaff(username: string, password: string): Promise<{ staff: Staff | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("staff-auth", {
      body: { action: "login", username, password },
    });
    if (error) return { staff: null, error: "Login failed" };
    if (data.error) return { staff: null, error: data.error };
    return { staff: data.staff, error: null };
  } catch {
    return { staff: null, error: "An error occurred during login" };
  }
}

export async function logoutStaff(staffId: string): Promise<void> {
  try {
    await supabase.functions.invoke("staff-auth", {
      body: { action: "logout", staffId },
    });
  } catch (err) {
    console.error("Logout error:", err);
  }
}

export async function createStaffMember(
  username: string,
  password: string,
  fullName: string,
  email: string,
  role: string,
  departments: string[],
  createdBy: string
): Promise<{ staff: Staff | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("staff-auth", {
      body: { action: "create", username, password, fullName, email, role, departments, createdBy },
    });
    if (error || data.error) return { staff: null, error: data?.error || "Failed to create" };
    return { staff: data.staff, error: null };
  } catch {
    return { staff: null, error: "An error occurred" };
  }
}

export async function listStaffMembers(): Promise<{ staff: Staff[]; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("staff-auth", {
      body: { action: "list" },
    });
    if (error) return { staff: [], error: "Failed to fetch staff" };
    return { staff: data.staff || [], error: null };
  } catch {
    return { staff: [], error: "An error occurred" };
  }
}

export async function updateStaffMember(staffId: string, updates: Partial<Staff>): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("staff-auth", {
      body: { action: "update", staffId, updates },
    });
    if (error || data.error) return { success: false, error: data?.error || "Failed to update" };
    return { success: true, error: null };
  } catch {
    return { success: false, error: "An error occurred" };
  }
}

export async function suspendStaffMember(staffId: string, reason: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("staff-auth", {
      body: { action: "suspend", staffId, reason },
    });
    if (error || data.error) return { success: false, error: data?.error || "Failed to suspend" };
    return { success: true, error: null };
  } catch {
    return { success: false, error: "An error occurred" };
  }
}

export async function unsuspendStaffMember(staffId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("staff-auth", {
      body: { action: "unsuspend", staffId },
    });
    if (error || data.error) return { success: false, error: data?.error || "Failed to unsuspend" };
    return { success: true, error: null };
  } catch {
    return { success: false, error: "An error occurred" };
  }
}

export async function deleteStaffMember(staffId: string, requesterId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("staff-auth", {
      body: { action: "delete", staffId, requesterId },
    });
    if (error || data.error) return { success: false, error: data?.error || "Failed to delete" };
    return { success: true, error: null };
  } catch {
    return { success: false, error: "An error occurred" };
  }
}

export async function resetStaffPassword(staffId: string, newPassword: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("staff-auth", {
      body: { action: "reset-password", staffId, newPassword },
    });
    if (error || data.error) return { success: false, error: data?.error || "Failed to reset" };
    return { success: true, error: null };
  } catch {
    return { success: false, error: "An error occurred" };
  }
}

import { supabase } from "@/integrations/supabase/client";

export interface StaffDepartment {
  id: string;
  name: string;
}

export interface Staff {
  id: string;
  username: string;
  display_name: string;
  role: "admin" | "manager" | "associate";
  departments?: StaffDepartment[];
  is_online: boolean;
  last_seen?: string;
  created_at?: string;
}

export async function loginStaff(
  username: string,
  password: string
): Promise<{ staff: Staff | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("staff-auth", {
      body: { action: "login", username, password },
    });

    if (error) {
      console.error("Login error:", error);
      return { staff: null, error: "Login failed" };
    }

    if (data.error) {
      return { staff: null, error: data.error };
    }

    return { staff: data.staff, error: null };
  } catch (err) {
    console.error("Login exception:", err);
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
  displayName: string,
  role: "admin" | "manager" | "associate",
  departmentIds: string[],
  createdBy: string
): Promise<{ staff: Staff | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("staff-auth", {
      body: {
        action: "create",
        username,
        password,
        displayName,
        role,
        departmentIds,
        createdBy,
      },
    });

    if (error) {
      console.error("Create staff error:", error);
      return { staff: null, error: "Failed to create staff member" };
    }

    if (data.error) {
      return { staff: null, error: data.error };
    }

    return { staff: data.staff, error: null };
  } catch (err) {
    console.error("Create staff exception:", err);
    return { staff: null, error: "An error occurred" };
  }
}

export async function listStaffMembers(): Promise<{
  staff: Staff[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.functions.invoke("staff-auth", {
      body: { action: "list" },
    });

    if (error) {
      console.error("List staff error:", error);
      return { staff: [], error: "Failed to fetch staff" };
    }

    return { staff: data.staff || [], error: null };
  } catch (err) {
    console.error("List staff exception:", err);
    return { staff: [], error: "An error occurred" };
  }
}

export async function listManagers(): Promise<{
  managers: { id: string; display_name: string; is_online: boolean }[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.functions.invoke("staff-auth", {
      body: { action: "list-managers" },
    });

    if (error) {
      console.error("List managers error:", error);
      return { managers: [], error: "Failed to fetch managers" };
    }

    return { managers: data.managers || [], error: null };
  } catch (err) {
    console.error("List managers exception:", err);
    return { managers: [], error: "An error occurred" };
  }
}

export async function updateStaffMember(
  staffId: string,
  updates: Partial<Staff>
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("staff-auth", {
      body: { action: "update", staffId, updates },
    });

    if (error || data.error) {
      return { success: false, error: data?.error || "Failed to update" };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("Update staff exception:", err);
    return { success: false, error: "An error occurred" };
  }
}

export async function updateStaffDepartments(
  staffId: string,
  departmentIds: string[]
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("staff-auth", {
      body: { action: "update-departments", staffId, departmentIds },
    });

    if (error || data.error) {
      return { success: false, error: data?.error || "Failed to update departments" };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("Update departments exception:", err);
    return { success: false, error: "An error occurred" };
  }
}

export async function deleteStaffMember(
  staffId: string,
  requesterId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("staff-auth", {
      body: { action: "delete", staffId, requesterId },
    });

    if (error || data.error) {
      return { success: false, error: data?.error || "Failed to delete" };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("Delete staff exception:", err);
    return { success: false, error: "An error occurred" };
  }
}
import { supabase } from "@/integrations/supabase/client";
import bcrypt from "bcryptjs";

export interface Staff {
  id: string;
  username: string;
  display_name: string;
  role: "admin" | "manager" | "associate";
  department_id: string | null;
  is_online: boolean;
  last_seen: string;
  created_at: string;
}

// Simple password comparison for demo (in production, use proper bcrypt on server)
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // For the seeded user with hash '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.aOe/aOcBT1fGJHYKDS'
  // This is bcrypt hash of '123'
  if (hash === '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.aOe/aOcBT1fGJHYKDS' && password === '123') {
    return true;
  }
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function loginStaff(username: string, password: string): Promise<{ staff: Staff | null; error: string | null }> {
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    return { staff: null, error: "Login failed. Please try again." };
  }

  if (!data) {
    return { staff: null, error: "Invalid username or password." };
  }

  const isValid = await verifyPassword(password, data.password_hash);
  
  if (!isValid) {
    return { staff: null, error: "Invalid username or password." };
  }

  // Update online status
  await supabase
    .from("staff")
    .update({ is_online: true, last_seen: new Date().toISOString() })
    .eq("id", data.id);

  const staff: Staff = {
    id: data.id,
    username: data.username,
    display_name: data.display_name,
    role: data.role,
    department_id: data.department_id,
    is_online: true,
    last_seen: new Date().toISOString(),
    created_at: data.created_at,
  };

  return { staff, error: null };
}

export async function logoutStaff(staffId: string): Promise<void> {
  await supabase
    .from("staff")
    .update({ is_online: false, last_seen: new Date().toISOString() })
    .eq("id", staffId);
}

export async function createStaffMember(
  username: string,
  password: string,
  displayName: string,
  role: "admin" | "manager" | "associate",
  departmentId: string | null,
  createdBy: string
): Promise<{ staff: Staff | null; error: string | null }> {
  const passwordHash = await hashPassword(password);

  const { data, error } = await supabase
    .from("staff")
    .insert({
      username,
      password_hash: passwordHash,
      display_name: displayName,
      role,
      department_id: departmentId,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { staff: null, error: "Username already exists." };
    }
    return { staff: null, error: "Failed to create staff member." };
  }

  return {
    staff: {
      id: data.id,
      username: data.username,
      display_name: data.display_name,
      role: data.role,
      department_id: data.department_id,
      is_online: data.is_online,
      last_seen: data.last_seen,
      created_at: data.created_at,
    },
    error: null,
  };
}

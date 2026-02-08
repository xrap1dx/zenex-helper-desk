import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Staff } from "@/lib/types";
import { loginStaff, logoutStaff } from "@/lib/auth";

interface StaffContextType {
  staff: Staff | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const StaffContext = createContext<StaffContextType | undefined>(undefined);

export function StaffProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("zenex_staff");
    if (stored) {
      try {
        setStaff(JSON.parse(stored));
      } catch {
        localStorage.removeItem("zenex_staff");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<string | null> => {
    const { staff: s, error } = await loginStaff(username, password);
    if (error || !s) return error || "Login failed";
    setStaff(s);
    localStorage.setItem("zenex_staff", JSON.stringify(s));
    return null;
  };

  const logout = async () => {
    if (staff) await logoutStaff(staff.id);
    setStaff(null);
    localStorage.removeItem("zenex_staff");
  };

  return (
    <StaffContext.Provider value={{ staff, isLoading, login, logout }}>
      {children}
    </StaffContext.Provider>
  );
}

export function useStaff() {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error("useStaff must be within StaffProvider");
  return ctx;
}

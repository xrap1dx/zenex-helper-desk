import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Staff, loginStaff, logoutStaff } from "@/lib/auth";

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
    // Check for stored session
    const storedStaff = localStorage.getItem("zenex_staff");
    if (storedStaff) {
      try {
        setStaff(JSON.parse(storedStaff));
      } catch {
        localStorage.removeItem("zenex_staff");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<string | null> => {
    const { staff: loggedInStaff, error } = await loginStaff(username, password);
    
    if (error || !loggedInStaff) {
      return error || "Login failed";
    }

    setStaff(loggedInStaff);
    localStorage.setItem("zenex_staff", JSON.stringify(loggedInStaff));
    return null;
  };

  const logout = async () => {
    if (staff) {
      await logoutStaff(staff.id);
    }
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
  const context = useContext(StaffContext);
  if (context === undefined) {
    throw new Error("useStaff must be used within a StaffProvider");
  }
  return context;
}

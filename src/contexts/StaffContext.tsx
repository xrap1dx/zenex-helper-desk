import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { Staff, loginStaff, logoutStaff } from "@/lib/auth";
import { userSupabase as supabase } from "@/lib/supabaseClient";

interface StaffContextType {
  staff: Staff | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const StaffContext = createContext<StaffContextType | undefined>(undefined);

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export function StaffProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Heartbeat to update last_seen
  useEffect(() => {
    const updatePresence = async () => {
      if (staff?.id) {
        await supabase
          .from("staff")
          .update({ is_online: true, last_seen: new Date().toISOString() })
          .eq("id", staff.id);
      }
    };

    if (staff) {
      // Initial update
      updatePresence();
      
      // Set up interval
      heartbeatRef.current = setInterval(updatePresence, HEARTBEAT_INTERVAL);
      
      // Handle visibility change
      const handleVisibility = () => {
        if (document.visibilityState === "visible") {
          updatePresence();
        }
      };
      document.addEventListener("visibilitychange", handleVisibility);

      // Handle before unload - set offline
      const handleUnload = () => {
        if (staff?.id) {
          // Use sendBeacon for reliability
          const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/staff?id=eq.${staff.id}`;
          const body = JSON.stringify({ is_online: false, last_seen: new Date().toISOString() });
          navigator.sendBeacon(url, body);
        }
      };
      window.addEventListener("beforeunload", handleUnload);

      return () => {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        document.removeEventListener("visibilitychange", handleVisibility);
        window.removeEventListener("beforeunload", handleUnload);
      };
    }
  }, [staff?.id]);

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
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
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

import { useState, useEffect } from "react";
import { MessageCircle, X, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatWindow } from "./ChatWindow";
import { cn } from "@/lib/utils";
import { userSupabase as supabase } from "@/lib/supabaseClient";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [agentsOnline, setAgentsOnline] = useState(false);

  useEffect(() => {
    const checkAgents = async () => {
      const { data } = await supabase
        .from("staff_members")
        .select("status, is_active, is_suspended")
        .eq("status", "online")
        .eq("is_active", true)
        .eq("is_suspended", false);
      setAgentsOnline((data || []).length > 0);
    };
    checkAgents();
    const interval = setInterval(checkAgents, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] rounded-2xl overflow-hidden card-shadow border border-border bg-card animate-slide-up",
            isMinimized && "h-14"
          )}
        >
          <div className="flex items-center justify-between px-4 py-3 gradient-bg">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  agentsOnline ? "bg-green-400 animate-pulse" : "bg-red-400"
                )}
              />
              <span className="font-semibold text-primary-foreground">Zenex Support</span>
              <span className="text-xs text-primary-foreground/60">Start a conversation</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {!isMinimized && <ChatWindow />}
        </div>
      )}

      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setIsMinimized(false);
        }}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full gradient-bg glow-primary flex items-center justify-center transition-all duration-300 hover:scale-105",
          isOpen && "rotate-90"
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-primary-foreground" />
        ) : (
          <MessageCircle className="h-6 w-6 text-primary-foreground" />
        )}
      </button>
    </>
  );
}

import { MessageSquare, Settings, LogOut, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStaff } from "@/contexts/StaffContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { DashboardView } from "@/pages/Dashboard";

interface SidebarProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  staffRole: string;
}

export function Sidebar({ currentView, onViewChange, staffRole }: SidebarProps) {
  const { staff, logout } = useStaff();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/staff");
  };

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold gradient-text">Zenex</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        <button
          onClick={() => onViewChange("tickets")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            currentView === "tickets"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <MessageSquare className="h-5 w-5" />
          Tickets
        </button>

        {staffRole === "admin" && (
          <button
            onClick={() => onViewChange("admin")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              currentView === "admin"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Users className="h-5 w-5" />
            Staff Management
          </button>
        )}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center">
            <span className="text-sm font-semibold text-primary-foreground">
              {staff?.display_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{staff?.display_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{staff?.role}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}

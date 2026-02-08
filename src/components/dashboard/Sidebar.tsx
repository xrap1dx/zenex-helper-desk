import { MessageSquare, LogOut, Users, BarChart3, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStaff } from "@/contexts/StaffContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { DashboardView } from "@/pages/Dashboard";

interface SidebarProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

const navItems = [
  { id: "welcome" as const, label: "Home", icon: Home },
  { id: "chats" as const, label: "Chats", icon: MessageSquare },
  { id: "stats" as const, label: "Statistics", icon: BarChart3, adminOnly: true },
  { id: "users" as const, label: "User Management", icon: Users, adminOnly: true },
];

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { staff, logout } = useStaff();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/staff");
  };

  const visible = navItems.filter((item) => !item.adminOnly || staff?.role === "admin");

  return (
    <aside className="w-16 md:w-56 border-r border-border bg-card flex flex-col shrink-0">
      <div className="p-3 md:p-4 border-b border-border">
        <div className="flex items-center gap-2 justify-center md:justify-start">
          <img src="/zenex-logo.png" alt="Zenex" className="w-8 h-8 rounded-lg object-contain" />
          <span className="text-lg font-bold gradient-text hidden md:block">Zenex</span>
        </div>
      </div>

      <nav className="flex-1 p-2 md:p-3 space-y-1 overflow-y-auto">
        {visible.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              "w-full flex items-center justify-center md:justify-start gap-3 px-2 md:px-3 py-2 rounded-lg text-xs font-medium transition-colors",
              currentView === item.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
            title={item.label}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-2 md:p-3 border-t border-border">
        <button
          onClick={() => onViewChange("account")}
          className={cn(
            "w-full flex items-center gap-2 mb-2 rounded-lg p-1 transition-colors",
            currentView === "account" ? "bg-primary/10" : "hover:bg-accent"
          )}
        >
          <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-primary-foreground">
              {staff?.full_name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0 hidden md:block text-left">
            <p className="text-sm font-medium truncate">{staff?.full_name}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{staff?.role}</p>
          </div>
        </button>
        <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={handleLogout}>
          <LogOut className="h-3.5 w-3.5 md:mr-1.5" />
          <span className="hidden md:inline">Sign Out</span>
        </Button>
      </div>
    </aside>
  );
}

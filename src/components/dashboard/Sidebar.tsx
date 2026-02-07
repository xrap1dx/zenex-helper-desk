import { MessageSquare, LogOut, Users, UserCog, BarChart3, FolderCog } from "lucide-react";
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

interface NavItem {
  id: DashboardView;
  label: string;
  icon: React.ElementType;
  roles?: string[];
  section?: string;
}

const navItems: NavItem[] = [
  { id: "tickets", label: "Tickets", icon: MessageSquare },
  { id: "account", label: "My Account", icon: UserCog },
  { id: "stats", label: "Statistics", icon: BarChart3, roles: ["admin", "manager"] },
  { id: "ticket-management", label: "Ticket Mgmt", icon: FolderCog, roles: ["admin"] },
  { id: "admin", label: "Staff Management", icon: Users, roles: ["admin"] },
];

export function Sidebar({ currentView, onViewChange, staffRole }: SidebarProps) {
  const { staff, logout } = useStaff();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/staff");
  };

  const visibleItems = navItems.filter(item => !item.roles || item.roles.includes(staffRole));

  return (
    <aside className="w-16 md:w-56 border-r border-border bg-card flex flex-col transition-all duration-200 shrink-0">
      {/* Logo */}
      <div className="p-3 md:p-4 border-b border-border">
        <div className="flex items-center gap-2 justify-center md:justify-start">
          <img 
            src="/zenex-logo.png" 
            alt="Zenex" 
            className="w-8 h-8 rounded-lg object-contain"
          />
          <span className="text-lg font-bold gradient-text hidden md:block">Zenex</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 md:p-3 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => (
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

      {/* User Info */}
      <div className="p-2 md:p-3 border-t border-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-primary-foreground">
              {staff?.display_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0 hidden md:block">
            <p className="text-sm font-medium truncate">{staff?.display_name}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{staff?.role}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={handleLogout}
        >
          <LogOut className="h-3.5 w-3.5 md:mr-1.5" />
          <span className="hidden md:inline">Sign Out</span>
        </Button>
      </div>
    </aside>
  );
}
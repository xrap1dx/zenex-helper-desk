import { MessageSquare, LogOut, Users, UserCog, BarChart3, FolderCog, ChevronDown, Home, Link2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStaff } from "@/contexts/StaffContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { DashboardView } from "@/pages/Dashboard";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
}

const mainNavItems: NavItem[] = [
  { id: "welcome", label: "Home", icon: Home },
  { id: "tickets", label: "Tickets", icon: MessageSquare, roles: ["admin", "manager", "associate"] },
  { id: "affiliates", label: "Affiliate Program", icon: Link2, roles: ["affiliate"] },
  { id: "affiliate-management", label: "Affiliate Mgmt", icon: Settings2, roles: ["admin"] },
];

const adminNavItems: NavItem[] = [
  { id: "stats", label: "Statistics", icon: BarChart3, roles: ["admin", "manager"] },
  { id: "ticket-management", label: "Ticket Mgmt", icon: FolderCog, roles: ["admin"] },
  { id: "admin", label: "Staff Management", icon: Users, roles: ["admin"] },
];

export function Sidebar({ currentView, onViewChange, staffRole }: SidebarProps) {
  const { staff, logout } = useStaff();
  const navigate = useNavigate();
  const [adminOpen, setAdminOpen] = useState(
    adminNavItems.some(item => item.id === currentView)
  );

  const handleLogout = async () => {
    await logout();
    navigate("/staff");
  };

  const visibleMain = mainNavItems.filter(item => !item.roles || item.roles.includes(staffRole));
  const visibleAdmin = adminNavItems.filter(item => !item.roles || item.roles.includes(staffRole));

  const renderNavButton = (item: NavItem) => (
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
  );

  return (
    <aside className="w-16 md:w-56 border-r border-border bg-card flex flex-col transition-all duration-200 shrink-0">
      {/* Logo */}
      <div className="p-3 md:p-4 border-b border-border">
        <div className="flex items-center gap-2 justify-center md:justify-start">
          <img src="/zenex-logo.png" alt="Zenex" className="w-8 h-8 rounded-lg object-contain" />
          <span className="text-lg font-bold gradient-text hidden md:block">Zenex</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 md:p-3 space-y-1 overflow-y-auto">
        {visibleMain.map(renderNavButton)}

        {/* Administrator Category */}
        {visibleAdmin.length > 0 && (
          <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
            <CollapsibleTrigger className="w-full flex items-center justify-center md:justify-between px-2 md:px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors mt-2">
              <span className="hidden md:inline">Administrator</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", adminOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              {visibleAdmin.map(renderNavButton)}
            </CollapsibleContent>
          </Collapsible>
        )}
      </nav>

      {/* User Info */}
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
              {staff?.display_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0 hidden md:block text-left">
            <p className="text-sm font-medium truncate">{staff?.display_name}</p>
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

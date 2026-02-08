import { useStaff } from "@/contexts/StaffContext";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock } from "lucide-react";

export function WelcomePanel() {
  const { staff } = useStaff();
  if (!staff) return null;

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-3xl mx-auto space-y-6 pt-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">
            Welcome back, <span className="gradient-text">{staff.full_name}</span>
          </h1>
          <p className="text-muted-foreground">Here's your profile overview.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Role</h2>
            </div>
            <Badge variant="outline" className="capitalize text-sm">
              {staff.role}
            </Badge>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Status</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium capitalize">{staff.status}</span>
            </div>
          </div>
        </div>

        {staff.departments && staff.departments.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="font-semibold">Departments</h2>
            <div className="flex flex-wrap gap-2">
              {staff.departments.map((dept) => (
                <Badge key={dept} variant="secondary" className="text-sm capitalize">
                  {dept.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useStaff } from "@/contexts/StaffContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, User, Building2, Loader2 } from "lucide-react";

export function AccountPanel() {
  const { staff } = useStaff();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);

  const handleChangePassword = async () => {
    if (!staff) return;
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setIsChanging(true);
    try {
      const { data, error } = await supabase.functions.invoke("staff-auth", {
        body: { action: "change-password", staffId: staff.id, currentPassword, newPassword },
      });

      if (error || data?.error) {
        toast({ title: "Error", description: data?.error || "Failed to change password.", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Password changed successfully." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      toast({ title: "Error", description: "An error occurred.", variant: "destructive" });
    }
    setIsChanging(false);
  };

  if (!staff) return null;

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Account</h1>
          <p className="text-muted-foreground text-sm">Manage your profile and security settings.</p>
        </div>

        {/* Profile Info */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Profile</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Display Name</Label>
              <p className="font-medium">{staff.display_name}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Username</Label>
              <p className="font-medium">{staff.username}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Role</Label>
              <Badge variant="outline" className="capitalize mt-1">{staff.role}</Badge>
            </div>
          </div>
        </div>

        {/* Departments */}
        {staff.departments && staff.departments.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Departments</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {staff.departments.map((dept) => (
                <Badge key={dept.id} variant="secondary">{dept.name}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Change Password */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Change Password</h2>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Current Password</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">New Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Confirm New Password</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
            </div>
            <Button onClick={handleChangePassword} disabled={isChanging || !currentPassword || !newPassword || !confirmPassword} className="w-full">
              {isChanging ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Change Password
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Trash2, UserPlus, Loader2, Info, Shield, Users, Headphones } from "lucide-react";
import { createStaffMember, listStaffMembers, updateStaffMember, updateStaffDepartments, deleteStaffMember } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface StaffMember {
  id: string;
  username: string;
  display_name: string;
  role: "admin" | "manager" | "associate";
  departments: { id: string; name: string }[];
  is_online: boolean;
  created_at: string;
}

interface Department {
  id: string;
  name: string;
}

interface RoleInfo {
  name: string;
  icon: React.ReactNode;
  description: string;
  permissions: string[];
}

const roleDetails: Record<string, RoleInfo> = {
  admin: {
    name: "Admin",
    icon: <Shield className="h-4 w-4" />,
    description: "Full system access with user management capabilities",
    permissions: [
      "Manage all staff accounts",
      "Assign roles and departments",
      "View all tickets across departments",
      "Access system settings",
      "All Manager permissions",
    ],
  },
  manager: {
    name: "Manager",
    icon: <Users className="h-4 w-4" />,
    description: "Team lead with escalation handling",
    permissions: [
      "Receive escalated tickets from Associates",
      "Respond to customer chats",
      "Transfer tickets between departments",
      "Close resolved tickets",
      "All Associate permissions",
    ],
  },
  associate: {
    name: "Associate",
    icon: <Headphones className="h-4 w-4" />,
    description: "Front-line support agent",
    permissions: [
      "Respond to customer chats",
      "Close resolved tickets",
      "Refer tickets to Managers",
      "Transfer to any department",
    ],
  },
};

export function AdminPanel() {
  const { staff: currentStaff } = useStaff();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // New staff form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("associate");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);

  useEffect(() => {
    fetchStaff();
    fetchDepartments();
  }, []);

  const fetchStaff = async () => {
    const { staff, error } = await listStaffMembers();
    if (!error) {
      setStaffMembers(staff as StaffMember[]);
    }
  };

  const fetchDepartments = async () => {
    const { data } = await supabase.from("departments").select("*");
    if (data) setDepartments(data);
  };

  const handleDepartmentToggle = (deptId: string) => {
    setSelectedDepartments((prev) => {
      if (prev.includes(deptId)) {
        return prev.filter((d) => d !== deptId);
      } else {
        return [...prev, deptId];
      }
    });
  };

  const handleCreateStaff = async () => {
    if (!newUsername || !newPassword || !newDisplayName || !currentStaff) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    const { error } = await createStaffMember(
      newUsername,
      newPassword,
      newDisplayName,
      selectedRole as "admin" | "manager" | "associate",
      selectedDepartments,
      currentStaff.id
    );

    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Staff member created successfully.",
      });
      setIsDialogOpen(false);
      resetForm();
      fetchStaff();
    }
    setIsLoading(false);
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!currentStaff) return;
    
    if (staffId === currentStaff.id) {
      toast({
        title: "Error",
        description: "You cannot delete your own account.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await deleteStaffMember(staffId, currentStaff.id);
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Staff member deleted successfully.",
      });
      fetchStaff();
    }
  };

  const handleUpdateRole = async (staffId: string, role: "admin" | "manager" | "associate") => {
    const { error } = await updateStaffMember(staffId, { role });
    if (!error) {
      toast({
        title: "Success",
        description: "Role updated successfully.",
      });
      fetchStaff();
    }
  };

  const handleUpdateDepartments = async (staffId: string, deptId: string, add: boolean) => {
    const member = staffMembers.find(m => m.id === staffId);
    if (!member) return;

    const currentDeptIds = member.departments.map(d => d.id);
    let newDeptIds: string[];

    if (add) {
      newDeptIds = [...currentDeptIds, deptId];
    } else {
      newDeptIds = currentDeptIds.filter(id => id !== deptId);
    }

    const { error } = await updateStaffDepartments(staffId, newDeptIds);
    if (!error) {
      toast({
        title: "Success",
        description: "Departments updated successfully.",
      });
      fetchStaff();
    }
  };

  const resetForm = () => {
    setNewUsername("");
    setNewPassword("");
    setNewDisplayName("");
    setSelectedRole("associate");
    setSelectedDepartments([]);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "manager":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "associate":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Staff Management</h1>
            <p className="text-muted-foreground">
              Manage staff accounts, roles, and department assignments.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg">
                <UserPlus className="h-4 w-4 mr-2 text-primary-foreground" />
                <span className="text-primary-foreground">Add Staff</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    placeholder="Enter username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    placeholder="Enter password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    placeholder="Enter display name"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    Role
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Each staff member has one role that determines their permissions.</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="space-y-3">
                    {Object.entries(roleDetails).map(([key, role]) => (
                      <div
                        key={key}
                        className={`p-3 rounded-lg border transition-all cursor-pointer ${
                          selectedRole === key
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground"
                        }`}
                        onClick={() => setSelectedRole(key)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            selectedRole === key ? "border-primary" : "border-muted-foreground"
                          }`}>
                            {selectedRole === key && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={getRoleBadgeColor(key) + " p-1 rounded"}>
                                {role.icon}
                              </span>
                              <span className="font-medium">{role.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {role.description}
                            </p>
                            <ul className="mt-2 space-y-0.5">
                              {role.permissions.slice(0, 3).map((perm, i) => (
                                <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                                  <span className="text-primary">•</span> {perm}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    Departments
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Staff can be assigned to multiple departments.</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="space-y-2">
                    {departments.map((dept) => (
                      <div
                        key={dept.id}
                        className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center gap-3 ${
                          selectedDepartments.includes(dept.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground"
                        }`}
                        onClick={() => handleDepartmentToggle(dept.id)}
                      >
                        <Checkbox
                          checked={selectedDepartments.includes(dept.id)}
                          onCheckedChange={() => handleDepartmentToggle(dept.id)}
                        />
                        <span className="font-medium">{dept.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  className="w-full gradient-bg"
                  onClick={handleCreateStaff}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  <span className="text-primary-foreground">Create Staff Member</span>
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Role Legend */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(roleDetails).map(([key, role]) => (
            <div key={key} className="p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <span className={getRoleBadgeColor(key) + " p-1.5 rounded"}>
                  {role.icon}
                </span>
                <h3 className="font-semibold">{role.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{role.description}</p>
              <ul className="space-y-1">
                {role.permissions.map((perm, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="text-primary">✓</span> {perm}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Staff Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Staff Member</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Departments</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary-foreground">
                          {member.display_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium">{member.display_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.username}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={member.role}
                      onValueChange={(v) => handleUpdateRole(member.id, v as "admin" | "manager" | "associate")}
                      disabled={member.id === currentStaff?.id}
                    >
                      <SelectTrigger className="w-[140px]">
                        <div className="flex items-center gap-2">
                          <span className={getRoleBadgeColor(member.role) + " p-1 rounded"}>
                            {roleDetails[member.role]?.icon}
                          </span>
                          <span className="capitalize">{member.role}</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleDetails).map(([key, role]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              {role.icon}
                              <span>{role.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {member.departments?.length > 0 ? (
                        member.departments.map((dept) => (
                          <Badge
                            key={dept.id}
                            variant="secondary"
                            className="text-xs cursor-pointer hover:bg-destructive/20"
                            onClick={() => handleUpdateDepartments(member.id, dept.id, false)}
                          >
                            {dept.name} ×
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">No departments</span>
                      )}
                      <Select onValueChange={(v) => handleUpdateDepartments(member.id, v, true)}>
                        <SelectTrigger className="w-8 h-6 p-0 border-dashed">
                          <Plus className="h-3 w-3" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments
                            .filter((d) => !member.departments?.some((md) => md.id === d.id))
                            .map((dept) => (
                              <SelectItem key={dept.id} value={dept.id}>
                                {dept.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          member.is_online ? "bg-green-500" : "bg-muted-foreground"
                        }`}
                      />
                      <span className="text-sm text-muted-foreground">
                        {member.is_online ? "Online" : "Offline"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteStaff(member.id)}
                      disabled={member.id === currentStaff?.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
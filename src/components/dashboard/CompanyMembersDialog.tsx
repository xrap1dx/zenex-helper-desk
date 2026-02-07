import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Member {
  id: string;
  staff_id: string;
  display_name: string;
  username: string;
}

interface AffiliateStaff {
  id: string;
  display_name: string;
  username: string;
}

interface Props {
  companyId: string;
  companyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanyMembersDialog({ companyId, companyName, open, onOpenChange }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [availableStaff, setAvailableStaff] = useState<AffiliateStaff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchMembers();
      fetchAvailableStaff();
    }
  }, [open, companyId]);

  const fetchMembers = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("affiliate_members")
      .select("id, staff_id")
      .eq("company_id", companyId);

    if (data && data.length > 0) {
      // Get staff details from staff_public view
      const staffIds = data.map((m) => m.staff_id);
      const { data: staffData } = await supabase
        .from("staff_public")
        .select("id, display_name, username")
        .in("id", staffIds);

      const enriched: Member[] = data.map((m) => {
        const s = staffData?.find((st) => st.id === m.staff_id);
        return {
          id: m.id,
          staff_id: m.staff_id,
          display_name: s?.display_name || "Unknown",
          username: s?.username || "",
        };
      });
      setMembers(enriched);
    } else {
      setMembers([]);
    }
    setIsLoading(false);
  };

  const fetchAvailableStaff = async () => {
    // Get all affiliate-role staff
    const { data: allAffiliates } = await supabase
      .from("staff_public")
      .select("id, display_name, username")
      .eq("role", "affiliate");

    // Get staff already assigned to any company
    const { data: existingMembers } = await supabase
      .from("affiliate_members")
      .select("staff_id");

    const assignedIds = new Set((existingMembers || []).map((m) => m.staff_id));
    const available = (allAffiliates || []).filter(
      (s) => s.id && !assignedIds.has(s.id)
    ) as AffiliateStaff[];

    setAvailableStaff(available);
  };

  const handleAdd = async () => {
    if (!selectedStaffId) return;
    setIsAdding(true);
    const { error } = await supabase.from("affiliate_members").insert({
      company_id: companyId,
      staff_id: selectedStaffId,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Added", description: "Member linked to company." });
      setSelectedStaffId("");
      fetchMembers();
      fetchAvailableStaff();
    }
    setIsAdding(false);
  };

  const handleRemove = async (memberId: string) => {
    const { error } = await supabase.from("affiliate_members").delete().eq("id", memberId);
    if (!error) {
      toast({ title: "Removed", description: "Member unlinked." });
      fetchMembers();
      fetchAvailableStaff();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {companyName} — Members
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Add member */}
          <div className="flex gap-2">
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select affiliate staff..." />
              </SelectTrigger>
              <SelectContent>
                {availableStaff.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No unassigned affiliates
                  </SelectItem>
                ) : (
                  availableStaff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.display_name} (@{s.username})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              size="icon"
              className="gradient-bg shrink-0"
              onClick={handleAdd}
              disabled={!selectedStaffId || isAdding}
            >
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 text-primary-foreground" />}
            </Button>
          </div>

          {/* Members list */}
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No members assigned yet. Add affiliate staff above.
            </p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{m.display_name}</p>
                    <p className="text-xs text-muted-foreground">@{m.username}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(m.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Only staff with the <Badge variant="outline" className="text-[10px] px-1.5 py-0">affiliate</Badge> role can be assigned.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { extractApiError } from "@/lib/api";
import { createStaff, updateStaff } from "@/services/staffService";
import {
  STAFF_ROLES,
  STAFF_ROLE_LABEL,
  type StaffMember,
  type StaffRole,
} from "@/types/staff";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  restaurantId: number | null;
  staff: StaffMember | null;
}

export function StaffDialog({ open, onOpenChange, restaurantId, staff }: Props) {
  const qc = useQueryClient();
  const isEdit = !!staff;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<StaffRole>("waiter");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (staff) {
      setEmail(staff.email ?? staff.user?.email ?? "");
      setFirstName(staff.first_name ?? staff.user?.first_name ?? "");
      setLastName(staff.last_name ?? staff.user?.last_name ?? "");
      setRole(staff.role);
      setIsActive(staff.is_active);
      setPassword("");
    } else {
      setEmail("");
      setPassword("");
      setFirstName("");
      setLastName("");
      setRole("waiter");
      setIsActive(true);
    }
  }, [open, staff]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit && staff) {
        return updateStaff(staff.id, { role, is_active: isActive });
      }
      if (!restaurantId) throw new Error("No restaurant selected");
      return createStaff({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        role,
        restaurant: restaurantId,
        is_active: isActive,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: isEdit ? "Staff updated" : "Staff invited" });
      onOpenChange(false);
    },
    onError: (err) =>
      toast({ title: "Error", description: extractApiError(err), variant: "destructive" }),
  });

  const canSubmit = isEdit
    ? true
    : email.trim() && password.length >= 6 && firstName.trim() && lastName.trim() && restaurantId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit staff member" : "Invite staff"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update role and access for this team member."
              : "Create an account so this person can sign in."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {!isEdit && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="fname">First name</Label>
                  <Input id="fname" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lname">Last name</Label>
                  <Input id="lname" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Temporary password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
                <p className="text-xs text-muted-foreground">
                  Share this with the staff member so they can sign in.
                </p>
              </div>
            </>
          )}

          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as StaffRole)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAFF_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {STAFF_ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="active" className="text-sm">Active</Label>
              <p className="text-xs text-muted-foreground">Inactive staff can't sign in.</p>
            </div>
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
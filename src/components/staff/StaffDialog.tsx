import { FieldError, FormError } from "@/components/workspace/FormFeedback";
import { apiFieldErrors, focusApiError } from "@/lib/form-errors";
import { useEffect, useRef, useState } from "react";
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
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!staff;

  const [email, setEmail] = useState("");
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
    } else {
      setEmail("");
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
    onError: (err) => {
      focusApiError(err, formRef.current);
      toast({ title: "Check the form", description: extractApiError(err), variant: "destructive" });
    },
  });

  const canSubmit = isEdit
    ? true
    : email.trim() && firstName.trim() && lastName.trim() && restaurantId;

  const fieldErrors = apiFieldErrors(mutation.error);

  return (
    <Dialog open={open} onOpenChange={value => { if (!mutation.isPending) { if (!value) mutation.reset(); onOpenChange(value); } }}>
      <DialogContent className="max-w-md">
        <form ref={formRef} className="dialog-form" onSubmit={event => { event.preventDefault(); mutation.mutate(); }}>
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
                  <Input id="fname" name="first_name" required aria-invalid={!!fieldErrors.first_name} aria-describedby="fname-error" value={firstName} onChange={(e) => setFirstName(e.target.value)} /><FieldError id="fname-error" message={fieldErrors.first_name} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lname">Last name</Label>
                  <Input id="lname" name="last_name" required aria-invalid={!!fieldErrors.last_name} aria-describedby="lname-error" value={lastName} onChange={(e) => setLastName(e.target.value)} /><FieldError id="lname-error" message={fieldErrors.last_name} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email" name="email" required aria-invalid={!!fieldErrors.email} aria-describedby="email-error"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                /><FieldError id="email-error" message={fieldErrors.email} />
              </div>
              <p className="text-xs text-muted-foreground">An activation link will be emailed to this address. They will choose their password before they can sign in.</p>
            </>
          )}

          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select name="role" value={role} onValueChange={(v) => setRole(v as StaffRole)}>
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

        <FormError error={mutation.error} />
        <DialogFooter>
          <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => { mutation.reset(); onOpenChange(false); }}>Cancel</Button>
          <Button type="submit" disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Invite"}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

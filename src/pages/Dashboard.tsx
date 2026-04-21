import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user?.first_name || user?.email?.split("@")[0]}</h1>
        <p className="text-sm text-muted-foreground">Here's a quick look at your restaurant today.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["Orders today", "Revenue today", "Active deliveries", "Pending orders"].map((label) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">—</div>
              <p className="text-xs text-muted-foreground mt-1">Coming in slice 2</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Next up</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Slice 1 (Auth + App Shell) is live. The Orders, Menu, Staff and Analytics modules will be wired in upcoming slices.
        </CardContent>
      </Card>
    </div>
  );
}
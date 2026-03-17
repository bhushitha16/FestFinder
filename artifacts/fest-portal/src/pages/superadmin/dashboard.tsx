import { AppLayout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useGetPlatformStats, useGetPendingAdmins, useApproveAdmin, useRejectAdmin } from "@workspace/api-client-react";
import { Card, Badge, Button } from "@/components/ui-components";
import { Users, Building2, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const { data: stats } = useGetPlatformStats();
  const { data: pendingAdmins = [] } = useGetPendingAdmins();
  const queryClient = useQueryClient();

  const approveMutation = useApproveAdmin();
  const rejectMutation = useRejectAdmin();

  if (!user || user.role !== "super_admin") return null;

  const handleAction = (id: number, action: 'approve'|'reject') => {
    const mut = action === 'approve' ? approveMutation : rejectMutation;
    mut.mutate({ adminId: id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/superadmin/admins/pending"] });
        queryClient.invalidateQueries({ queryKey: ["/api/superadmin/stats"] });
      }
    });
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl font-display font-bold mb-8">Platform Administration</h1>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard icon={<Users/>} title="Total Students" value={stats?.totalStudents} />
          <StatCard icon={<Building2/>} title="Colleges" value={stats?.totalColleges} />
          <StatCard icon={<Calendar/>} title="Active Events" value={stats?.totalEvents} />
          <StatCard icon={<CheckCircle2/>} title="Registrations" value={stats?.totalRegistrations} />
        </div>

        {/* Pending Approvals */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-semibold">Pending College Approvals</h2>
            <Badge variant="warning">{pendingAdmins.length}</Badge>
          </div>

          {pendingAdmins.length === 0 ? (
            <Card className="text-center py-10"><p className="text-muted-foreground">No pending requests.</p></Card>
          ) : (
            <div className="grid gap-4">
              {pendingAdmins.map(admin => (
                <Card key={admin.id} className="flex justify-between items-center p-5">
                  <div>
                    <h3 className="text-lg font-bold text-primary">{admin.collegeName}</h3>
                    <p className="text-sm text-foreground/80 mt-1">{admin.name} • {admin.email} • {admin.contactNumber}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="destructive" size="sm" onClick={() => handleAction(admin.id, 'reject')}><XCircle className="w-4 h-4 mr-1"/> Reject</Button>
                    <Button variant="primary" size="sm" onClick={() => handleAction(admin.id, 'approve')}><CheckCircle2 className="w-4 h-4 mr-1"/> Approve</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ icon, title, value }: any) {
  return (
    <div className="bg-card border border-white/5 rounded-xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -z-10" />
      <div className="text-primary mb-3">{icon}</div>
      <p className="text-3xl font-display font-bold text-white mb-1">{value ?? '-'}</p>
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{title}</p>
    </div>
  );
}

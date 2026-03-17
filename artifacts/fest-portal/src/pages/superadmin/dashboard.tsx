import { AppLayout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useGetPlatformStats, useGetPendingAdmins, useApproveAdmin, useRejectAdmin, useSuspendAdmin, useGetAllColleges, useGetAllEvents } from "@workspace/api-client-react";
import { Card, Badge, Button } from "@/components/ui-components";
import { Check, X, Ban, Building2, Calendar, Users, Activity } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"pending" | "colleges" | "events">("pending");
  
  const { data: stats } = useGetPlatformStats();
  const { data: pendingAdmins = [] } = useGetPendingAdmins();
  const { data: colleges = [] } = useGetAllColleges({ query: { enabled: activeTab === 'colleges' } });
  const { data: events = [] } = useGetAllEvents({ query: { enabled: activeTab === 'events' } });

  const queryClient = useQueryClient();
  const approveMutation = useApproveAdmin({ onSuccess: () => invalidate() });
  const rejectMutation = useRejectAdmin({ onSuccess: () => invalidate() });
  const suspendMutation = useSuspendAdmin({ onSuccess: () => invalidate() });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/superadmin/admins/pending"] });
    queryClient.invalidateQueries({ queryKey: ["/api/superadmin/colleges"] });
    queryClient.invalidateQueries({ queryKey: ["/api/superadmin/stats"] });
  };

  if (!user || user.role !== "super_admin") {
    return <AppLayout><div className="p-8 text-center">Unauthorized access</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-10 w-full">
        <div className="mb-10">
          <h1 className="text-4xl font-display font-bold text-white mb-2">Master Console</h1>
          <p className="text-primary tracking-widest uppercase text-sm">Platform Administration</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <StatCard icon={<Users />} title="Total Students" value={stats?.totalStudents || 0} />
          <StatCard icon={<Building2 />} title="Colleges" value={stats?.totalColleges || 0} />
          <StatCard icon={<Calendar />} title="Events" value={stats?.totalEvents || 0} />
          <StatCard icon={<Activity />} title="Registrations" value={stats?.totalRegistrations || 0} />
        </div>

        <div className="flex gap-4 mb-8 border-b border-white/5 pb-4 overflow-x-auto">
          <TabButton active={activeTab === 'pending'} onClick={() => setActiveTab('pending')}>
            Pending Requests {pendingAdmins.length > 0 && <span className="ml-2 bg-destructive text-white text-[10px] px-2 py-0.5 rounded-full">{pendingAdmins.length}</span>}
          </TabButton>
          <TabButton active={activeTab === 'colleges'} onClick={() => setActiveTab('colleges')}>Active Colleges</TabButton>
          <TabButton active={activeTab === 'events'} onClick={() => setActiveTab('events')}>All Events</TabButton>
        </div>

        {/* Pending Admins */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {pendingAdmins.length === 0 ? (
              <div className="text-center py-20 glass-panel rounded-xl">
                <p className="text-muted-foreground">No pending admin requests.</p>
              </div>
            ) : pendingAdmins.map(admin => (
              <Card key={admin.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 gap-6 border-l-4 border-l-warning">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">{admin.collegeName}</h3>
                    <Badge variant="warning">Pending Approval</Badge>
                  </div>
                  <p className="text-muted-foreground"><strong className="text-white/80">Applicant:</strong> {admin.name} {admin.designation ? `(${admin.designation})` : ''}</p>
                  <p className="text-sm text-muted-foreground mt-1">{admin.email} • {admin.contactNumber}</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <Button 
                    className="flex-1 md:flex-none bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border border-emerald-500/30"
                    onClick={() => approveMutation.mutate({ adminId: admin.id })}
                    isLoading={approveMutation.isPending}
                  >
                    <Check className="w-4 h-4 mr-2" /> Approve
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 md:flex-none text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => rejectMutation.mutate({ adminId: admin.id })}
                    isLoading={rejectMutation.isPending}
                  >
                    <X className="w-4 h-4 mr-2" /> Reject
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Colleges */}
        {activeTab === 'colleges' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {colleges.map(college => (
              <Card key={college.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <Badge variant={college.status === 'active' ? 'success' : 'destructive'}>{college.status}</Badge>
                </div>
                <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{college.name}</h3>
                <p className="text-sm text-muted-foreground mb-6">Admin: {college.adminName || 'Unassigned'}</p>
                <p className="text-xs text-muted-foreground/50 border-t border-white/5 pt-4">Joined {format(new Date(college.createdAt), 'MMM yyyy')}</p>
              </Card>
            ))}
          </div>
        )}

        {/* Events */}
        {activeTab === 'events' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => (
              <Card key={event.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <Badge variant="outline">{event.category}</Badge>
                  <Badge variant={event.eventStatus === 'completed' ? 'default' : 'warning'}>{event.eventStatus}</Badge>
                </div>
                <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{event.title}</h3>
                <p className="text-sm text-primary/80 mb-6 line-clamp-1">{event.collegeName}</p>
                
                <div className="space-y-2 text-sm text-muted-foreground mb-6">
                  <p className="flex justify-between"><span>Date:</span> <span className="text-white/80">{format(new Date(event.eventDate), 'MMM dd, yyyy')}</span></p>
                  <p className="flex justify-between"><span>Registrations:</span> <span className="text-white/80">{event.registeredCount}</span></p>
                </div>
              </Card>
            ))}
          </div>
        )}

      </div>
    </AppLayout>
  );
}

function StatCard({ icon, title, value }: { icon: React.ReactNode, title: string, value: number }) {
  return (
    <Card className="p-6 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-primary mb-4 border border-white/5">
        {icon}
      </div>
      <p className="text-3xl font-display font-bold text-white mb-1">{value}</p>
      <p className="text-xs text-muted-foreground uppercase tracking-widest">{title}</p>
    </Card>
  );
}

function TabButton({ active, onClick, children }: { active: boolean, onClick: () => void, children: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={`px-6 py-3 font-semibold transition-all whitespace-nowrap border-b-2 flex items-center ${active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-white hover:border-white/20'}`}
    >
      {children}
    </button>
  );
}

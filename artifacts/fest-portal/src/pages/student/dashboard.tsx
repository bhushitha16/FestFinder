import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useListEvents, useGetStudentRegistrations, useRegisterForEvent } from "@workspace/api-client-react";
import { Card, Badge, Button, Input } from "@/components/ui-components";
import { format } from "date-fns";
import { Calendar, MapPin, Users, Search, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"discover" | "my-registrations">("discover");
  const [search, setSearch] = useState("");

  const { data: events = [], isLoading: loadingEvents } = useListEvents({ 
    search: search || undefined 
  });
  
  const { data: registrations = [], isLoading: loadingRegs } = useGetStudentRegistrations();

  if (!user || user.role !== "student") {
    return <AppLayout><div className="p-8 text-center">Unauthorized access</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-8 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Welcome, {user.name}</h1>
            <p className="text-muted-foreground mt-1">Discover and manage your college fest experiences.</p>
          </div>
          
          <div className="flex p-1 bg-secondary rounded-lg border border-white/5">
            <button 
              onClick={() => setActiveTab("discover")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "discover" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-white"}`}
            >
              Discover Events
            </button>
            <button 
              onClick={() => setActiveTab("my-registrations")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "my-registrations" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-white"}`}
            >
              My Registrations
            </button>
          </div>
        </div>

        {activeTab === "discover" && (
          <div className="space-y-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                placeholder="Search events or colleges..." 
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {loadingEvents ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3].map(i => <div key={i} className="h-[300px] rounded-xl bg-secondary animate-pulse" />)}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-20 border border-white/5 rounded-xl bg-card/30">
                <p className="text-muted-foreground">No events found matching your criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map(event => {
                  const isRegistered = registrations.some(r => r.eventId === event.id);
                  const isFull = event.maxParticipants && event.registeredCount >= event.maxParticipants;
                  
                  return (
                    <EventCard 
                      key={event.id} 
                      event={event} 
                      isRegistered={isRegistered}
                      isFull={isFull as boolean}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "my-registrations" && (
          <div className="space-y-6">
            {loadingRegs ? (
              <div className="animate-pulse space-y-4">
                {[1,2].map(i => <div key={i} className="h-24 bg-secondary rounded-xl" />)}
              </div>
            ) : registrations.length === 0 ? (
              <div className="text-center py-20 border border-white/5 rounded-xl bg-card/30">
                <p className="text-muted-foreground">You haven't registered for any events yet.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {registrations.map(reg => (
                  <Card key={reg.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{reg.eventTitle}</h3>
                      <p className="text-sm text-muted-foreground mt-1">Registered on {format(new Date(reg.registeredAt), 'MMM dd, yyyy')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {reg.status === 'approved' && <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1"/> Approved</Badge>}
                      {reg.status === 'pending' && <Badge variant="warning"><Clock className="w-3 h-3 mr-1"/> Pending</Badge>}
                      {reg.status === 'rejected' && <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1"/> Rejected</Badge>}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function EventCard({ event, isRegistered, isFull }: { event: any, isRegistered: boolean, isFull: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const registerMutation = useRegisterForEvent({
    mutation: {
      onSuccess: () => {
        toast({ title: "Registration Submitted", description: "Waiting for college admin approval." });
        queryClient.invalidateQueries({ queryKey: ["/api/student/registrations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      },
      onError: (error: any) => {
        toast({ title: "Failed", description: error?.response?.data?.message || "Could not register", variant: "destructive" });
      }
    }
  });

  return (
    <Card hover className="flex flex-col h-full relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 z-10">
        <Badge variant="outline" className="bg-background/80 backdrop-blur-md">{event.category}</Badge>
      </div>
      
      <div className="h-40 -mt-6 -mx-6 mb-6 overflow-hidden bg-secondary relative">
        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent z-10" />
        {/* Placeholder abstract pattern for event banner */}
        <div className="w-full h-full opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMDAwIj48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDBMOCA4Wk04IDBMMCA4WiIgc3Ryb2tlPSIjRDRBRjM3IiBzdHJva2Utd2lkdGg9IjAuNSI+PC9wYXRoPgo8L3N2Zz4=')]" />
      </div>

      <div className="flex-1 flex flex-col">
        <h3 className="text-xl font-display font-bold text-white mb-1 group-hover:text-primary transition-colors">{event.title}</h3>
        <p className="text-sm text-primary/80 mb-4">{event.collegeName}</p>
        
        <p className="text-sm text-muted-foreground line-clamp-2 mb-6 flex-1">
          {event.description}
        </p>

        <div className="space-y-2 mb-6 text-sm text-foreground/80">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span>{format(new Date(event.eventDate), 'MMM dd, yyyy - h:mm a')}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span>{event.venue}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span>{event.registeredCount} {event.maxParticipants ? `/ ${event.maxParticipants}` : ''} Registered</span>
          </div>
        </div>

        <Button 
          className="w-full" 
          disabled={isRegistered || isFull || registerMutation.isPending}
          onClick={() => registerMutation.mutate({ eventId: event.id })}
          isLoading={registerMutation.isPending}
        >
          {isRegistered ? "Already Registered" : isFull ? "Event Full" : "Register Now"}
        </Button>
      </div>
    </Card>
  );
}

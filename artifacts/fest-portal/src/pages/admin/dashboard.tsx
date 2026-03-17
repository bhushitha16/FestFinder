import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useGetAdminEvents, useCreateEvent, useDeleteEvent, useGetEventRegistrations, useUpdateRegistrationStatus } from "@workspace/api-client-react";
import { Card, Button, Input, Select, Dialog, Badge } from "@/components/ui-components";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Settings, Trash2, Users, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const eventSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.string().min(2),
  venue: z.string().min(2),
  eventDate: z.string(),
  registrationDeadline: z.string(),
  maxParticipants: z.coerce.number().optional().nullable(),
});

type EventForm = z.infer<typeof eventSchema>;

export default function AdminDashboard() {
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  
  const { data: events = [], isLoading } = useGetAdminEvents();
  
  if (!user || user.role !== "college_admin") {
    return <AppLayout><div className="p-8 text-center">Unauthorized access</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-8 w-full">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold">College Admin Dashboard</h1>
            <p className="text-primary mt-1">{user.collegeName}</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Create Event
          </Button>
        </div>

        {selectedEventId ? (
          <EventRegistrationsView 
            eventId={selectedEventId} 
            onBack={() => setSelectedEventId(null)} 
            eventTitle={events.find(e => e.id === selectedEventId)?.title || ""}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-semibold mb-4">Manage Events</h2>
              {isLoading ? (
                 <div className="animate-pulse space-y-4">
                   {[1,2].map(i => <div key={i} className="h-32 bg-secondary rounded-xl" />)}
                 </div>
              ) : events.length === 0 ? (
                <Card className="text-center py-12">
                  <p className="text-muted-foreground">No events created yet.</p>
                  <Button onClick={() => setIsCreateOpen(true)} variant="outline" className="mt-4">Create your first event</Button>
                </Card>
              ) : (
                events.map(event => (
                  <Card key={event.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold">{event.title}</h3>
                        <Badge variant="outline">{event.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{event.description}</p>
                      <div className="flex items-center gap-4 text-xs text-foreground/70">
                        <span>{format(new Date(event.eventDate), 'MMM dd, yyyy')}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3"/> {event.registeredCount} Regs</span>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button variant="secondary" size="sm" onClick={() => setSelectedEventId(event.id)}>
                        View Registrations
                      </Button>
                      <DeleteEventButton eventId={event.id} />
                    </div>
                  </Card>
                ))
              )}
            </div>
            
            <div>
               <Card className="sticky top-24">
                 <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
                 <div className="space-y-4">
                   <div className="bg-secondary p-4 rounded-lg border border-white/5">
                     <p className="text-sm text-muted-foreground mb-1">Total Active Events</p>
                     <p className="text-3xl font-display font-bold text-primary">{events.length}</p>
                   </div>
                   <div className="bg-secondary p-4 rounded-lg border border-white/5">
                     <p className="text-sm text-muted-foreground mb-1">Total Registrations</p>
                     <p className="text-3xl font-display font-bold text-white">
                       {events.reduce((acc, curr) => acc + curr.registeredCount, 0)}
                     </p>
                   </div>
                 </div>
               </Card>
            </div>
          </div>
        )}

        <CreateEventDialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      </div>
    </AppLayout>
  );
}

function DeleteEventButton({ eventId }: { eventId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteEvent({
    mutation: {
      onSuccess: () => {
        toast({ title: "Event deleted" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      }
    }
  });

  return (
    <Button 
      variant="destructive" 
      size="sm" 
      onClick={() => { if(confirm('Are you sure?')) deleteMutation.mutate({ eventId }) }}
      isLoading={deleteMutation.isPending}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}

function CreateEventDialog({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<EventForm>({
    resolver: zodResolver(eventSchema)
  });

  const createMutation = useCreateEvent({
    mutation: {
      onSuccess: () => {
        toast({ title: "Event created successfully!" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
        reset();
        onClose();
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  });

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Create New Event">
      <form onSubmit={handleSubmit((d) => createMutation.mutate({ data: d }))} className="space-y-4">
        <Input label="Event Title" {...register("title")} error={errors.title?.message} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Category" placeholder="e.g. Cultural, Technical" {...register("category")} error={errors.category?.message} />
          <Input label="Venue" {...register("venue")} error={errors.venue?.message} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground/80">Description</label>
          <textarea 
            className="w-full bg-black/50 border border-white/10 rounded-md px-4 py-3 text-sm text-foreground focus:border-primary/50 min-h-[100px]"
            {...register("description")}
          />
          {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Event Date" type="datetime-local" {...register("eventDate")} error={errors.eventDate?.message} />
          <Input label="Reg. Deadline" type="datetime-local" {...register("registrationDeadline")} error={errors.registrationDeadline?.message} />
        </div>
        <Input label="Max Participants (Optional)" type="number" {...register("maxParticipants")} error={errors.maxParticipants?.message} />
        
        <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-6">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={createMutation.isPending}>Create Event</Button>
        </div>
      </form>
    </Dialog>
  );
}

function EventRegistrationsView({ eventId, onBack, eventTitle }: { eventId: number, onBack: () => void, eventTitle: string }) {
  const { data: regs = [], isLoading } = useGetEventRegistrations(eventId);
  const queryClient = useQueryClient();
  const statusMutation = useUpdateRegistrationStatus();

  const handleStatus = (regId: number, status: 'approved'|'rejected') => {
    statusMutation.mutate({ registrationId: regId, data: { status } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/events", eventId, "registrations"] })
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>← Back</Button>
        <h2 className="text-xl font-semibold">Registrations: {eventTitle}</h2>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground bg-secondary/50 uppercase border-b border-white/5">
            <tr>
              <th className="px-6 py-4">Student Name</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">ID Number</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading...</td></tr> : 
             regs.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No registrations yet.</td></tr> :
             regs.map(reg => (
              <tr key={reg.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4 font-medium">{reg.studentName}</td>
                <td className="px-6 py-4 text-muted-foreground">{reg.studentEmail}</td>
                <td className="px-6 py-4">{reg.studentCollegeIdNumber}</td>
                <td className="px-6 py-4">
                  <Badge variant={reg.status === 'approved' ? 'success' : reg.status === 'rejected' ? 'destructive' : 'warning'}>
                    {reg.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  {reg.status === 'pending' && (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" className="h-8 w-8 p-0 text-emerald-500" onClick={() => handleStatus(reg.id, 'approved')}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="secondary" className="h-8 w-8 p-0 text-destructive" onClick={() => handleStatus(reg.id, 'rejected')}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

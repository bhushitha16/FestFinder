import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { 
  useGetAdminEvents, 
  useCreateEvent, 
  useUpdateEvent,
  useDeleteEvent, 
  useGetEventRegistrations, 
  useUpdateRegistrationStatus,
  useGetEventPhotos,
  useAddEventPhoto,
  useDeleteEventPhoto
} from "@workspace/api-client-react";
import { Card, Button, Input, Select, Dialog, Badge, Textarea } from "@/components/ui-components";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Trash2, Users, Check, X, Image as ImageIcon, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/utils";
import type { Event } from "@workspace/api-client-react/src/generated/api.schemas";

const CATEGORIES = ["Cultural", "Technical", "Sports", "Literary", "Management", "Workshop", "Other"];

const eventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(2, "Category is required"),
  venue: z.string().min(2, "Venue is required"),
  eventDate: z.string().min(1, "Event date is required"),
  registrationDeadline: z.string().min(1, "Deadline is required"),
  maxParticipants: z.coerce.number().optional().nullable(),
  thumbnailUrl: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")),
});

type EventForm = z.infer<typeof eventSchema>;

export default function AdminDashboard() {
  const { user } = useAuth();
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [photosEventId, setPhotosEventId] = useState<number | null>(null);
  
  const { data: events = [], isLoading } = useGetAdminEvents();
  
  if (!user || user.role !== "college_admin") {
    return <AppLayout><div className="p-8 text-center">Unauthorized access</div></AppLayout>;
  }

  const openEdit = (event: Event) => {
    setEditingEvent(event);
    setIsCreateOpen(true);
  };

  const closeDialog = () => {
    setIsCreateOpen(false);
    setEditingEvent(null);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-10 w-full flex-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-display font-bold mb-2">Admin Dashboard</h1>
            <p className="text-primary tracking-widest uppercase text-sm font-semibold">{user.collegeName}</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shrink-0 h-12 px-6">
            <Plus className="w-5 h-5" /> Create Event
          </Button>
        </div>

        {selectedEventId ? (
          <EventRegistrationsView 
            eventId={selectedEventId} 
            onBack={() => setSelectedEventId(null)} 
            eventTitle={events.find(e => e.id === selectedEventId)?.title || ""}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-2xl font-display font-semibold mb-6">Manage Events</h2>
              {isLoading ? (
                 <div className="animate-pulse space-y-4">
                   {[1,2].map(i => <div key={i} className="h-40 bg-secondary rounded-xl" />)}
                 </div>
              ) : events.length === 0 ? (
                <div className="text-center py-20 glass-panel rounded-xl">
                  <p className="text-muted-foreground text-lg mb-4">No events created yet.</p>
                  <Button onClick={() => setIsCreateOpen(true)} variant="outline">Create your first event</Button>
                </div>
              ) : (
                events.map(event => (
                  <Card key={event.id} className="p-0 overflow-hidden flex flex-col sm:flex-row group">
                    <div className="w-full sm:w-48 h-48 sm:h-auto bg-secondary relative shrink-0">
                      {event.thumbnailUrl ? (
                        <img src={event.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-card">
                          <span className="font-display font-bold text-white/10 text-2xl uppercase tracking-widest">{event.category.substring(0,3)}</span>
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <Badge variant={event.eventStatus === 'completed' ? 'default' : 'warning'}>{event.eventStatus}</Badge>
                      </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-bold text-white">{event.title}</h3>
                          <Badge variant="outline">{event.category}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                          <span>{format(new Date(event.eventDate), 'MMM dd, yyyy')}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-primary"/> {event.registeredCount} Regs</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-white/5">
                        <Button variant="secondary" size="sm" onClick={() => setSelectedEventId(event.id)}>Registrations</Button>
                        <Button variant="outline" size="sm" onClick={() => openEdit(event)}><Edit2 className="w-4 h-4 mr-2" /> Edit</Button>
                        {event.eventStatus === 'completed' && (
                          <Button variant="primary" size="sm" className="bg-primary/20 text-primary border-none hover:bg-primary/40" onClick={() => setPhotosEventId(event.id)}>
                            <ImageIcon className="w-4 h-4 mr-2" /> Gallery
                          </Button>
                        )}
                        <div className="ml-auto">
                          <DeleteEventButton eventId={event.id} />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
            
            <div>
               <Card className="sticky top-28 p-8 glass-panel border-t-primary/30">
                 <h3 className="text-xl font-display font-semibold mb-6">Quick Stats</h3>
                 <div className="space-y-4">
                   <div className="bg-background/50 p-5 rounded-xl border border-white/5">
                     <p className="text-sm text-muted-foreground font-medium mb-1 uppercase tracking-wider">Total Events</p>
                     <p className="text-4xl font-display font-bold text-primary">{events.length}</p>
                   </div>
                   <div className="bg-background/50 p-5 rounded-xl border border-white/5">
                     <p className="text-sm text-muted-foreground font-medium mb-1 uppercase tracking-wider">Total Registrations</p>
                     <p className="text-4xl font-display font-bold text-white">
                       {events.reduce((acc, curr) => acc + curr.registeredCount, 0)}
                     </p>
                   </div>
                 </div>
               </Card>
            </div>
          </div>
        )}

        <EventFormDialog isOpen={isCreateOpen} onClose={closeDialog} event={editingEvent} />
        <ManagePhotosDialog isOpen={!!photosEventId} eventId={photosEventId!} onClose={() => setPhotosEventId(null)} />
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
      onClick={() => { if(confirm('Are you sure you want to delete this event?')) deleteMutation.mutate({ eventId }) }}
      isLoading={deleteMutation.isPending}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}

function EventFormDialog({ isOpen, onClose, event }: { isOpen: boolean, onClose: () => void, event: Event | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Format dates for inputs
  const defaultVals = event ? {
    ...event,
    eventDate: new Date(event.eventDate).toISOString().slice(0, 16),
    registrationDeadline: new Date(event.registrationDeadline).toISOString().slice(0, 16),
    maxParticipants: event.maxParticipants || undefined,
    thumbnailUrl: event.thumbnailUrl || ""
  } : {};

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    values: defaultVals as any
  });

  const createMutation = useCreateEvent({
    mutation: {
      onSuccess: () => {
        toast({ title: "Event created successfully!" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
        reset();
        onClose();
      },
      onError: (err) => toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
    }
  });

  const updateMutation = useUpdateEvent({
    mutation: {
      onSuccess: () => {
        toast({ title: "Event updated successfully!" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
        onClose();
      },
      onError: (err) => toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
    }
  });

  const onSubmit = (data: EventForm) => {
    if (event) {
      updateMutation.mutate({ eventId: event.id, data });
    } else {
      createMutation.mutate({ data });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={event ? "Edit Event" : "Create New Event"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input label="Event Title" {...register("title")} error={errors.title?.message} />
        
        <div className="grid grid-cols-2 gap-5">
          <Select 
            label="Category" 
            options={CATEGORIES.map(c => ({ value: c, label: c }))} 
            {...register("category")} 
            error={errors.category?.message} 
          />
          <Input label="Venue" {...register("venue")} error={errors.venue?.message} />
        </div>

        <Textarea label="Description" {...register("description")} error={errors.description?.message} />

        <div className="grid grid-cols-2 gap-5">
          <Input label="Event Date" type="datetime-local" {...register("eventDate")} error={errors.eventDate?.message} />
          <Input label="Reg. Deadline" type="datetime-local" {...register("registrationDeadline")} error={errors.registrationDeadline?.message} />
        </div>
        
        <div className="grid grid-cols-2 gap-5">
          <Input label="Max Participants (Optional)" type="number" {...register("maxParticipants")} error={errors.maxParticipants?.message} />
          <Input label="Thumbnail URL (Optional)" placeholder="https://..." {...register("thumbnailUrl")} error={errors.thumbnailUrl?.message} />
        </div>
        
        <div className="flex justify-end gap-3 pt-6 mt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isPending}>{event ? "Save Changes" : "Create Event"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function ManagePhotosDialog({ isOpen, eventId, onClose }: { isOpen: boolean, eventId: number, onClose: () => void }) {
  const { data: photos = [], isLoading } = useGetEventPhotos(eventId, { query: { enabled: isOpen && !!eventId } });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");

  const addPhoto = useAddEventPhoto({
    mutation: {
      onSuccess: () => {
        toast({ title: "Photo added" });
        queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "photos"] });
        setUrl("");
        setCaption("");
      },
      onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" })
    }
  });

  const deletePhoto = useDeleteEventPhoto({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "photos"] })
    }
  });

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Manage Event Photos">
      <div className="space-y-6">
        <div className="bg-secondary/50 p-4 rounded-lg border border-white/5 space-y-4">
          <h4 className="text-sm font-semibold">Upload New Photo</h4>
          <Input placeholder="Photo URL (https://...)" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Input placeholder="Caption (Optional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
          <Button 
            className="w-full" 
            disabled={!url || addPhoto.isPending} 
            onClick={() => addPhoto.mutate({ eventId, data: { photoUrl: url, caption: caption || undefined } })}
            isLoading={addPhoto.isPending}
          >
            Add Photo
          </Button>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Gallery ({photos.length})</h4>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : 
           photos.length === 0 ? <p className="text-sm text-muted-foreground">No photos uploaded yet.</p> : (
             <div className="grid grid-cols-2 gap-3">
               {photos.map(p => (
                 <div key={p.id} className="relative group rounded-md overflow-hidden bg-secondary aspect-video">
                   <img src={p.photoUrl} alt="Event" className="w-full h-full object-cover" />
                   <button 
                     onClick={() => deletePhoto.mutate({ eventId, photoId: p.id })}
                     className="absolute top-2 right-2 w-8 h-8 bg-destructive/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                   {p.caption && <div className="absolute bottom-0 w-full bg-black/80 p-1 text-[10px] text-white truncate">{p.caption}</div>}
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
    </Dialog>
  );
}

function EventRegistrationsView({ eventId, onBack, eventTitle }: { eventId: number, onBack: () => void, eventTitle: string }) {
  const { data: regs = [], isLoading } = useGetEventRegistrations(eventId);
  const queryClient = useQueryClient();
  const statusMutation = useUpdateRegistrationStatus();

  const handleStatus = (regId: number, status: 'approved'|'rejected') => {
    statusMutation.mutate({ registrationId: regId, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/events", eventId, "registrations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 border-b border-white/5 pb-6">
        <Button variant="outline" onClick={onBack} className="rounded-full px-4">← Back to Events</Button>
        <div>
          <h2 className="text-2xl font-display font-semibold">Registrations</h2>
          <p className="text-primary text-sm mt-1">{eventTitle}</p>
        </div>
      </div>

      <Card className="overflow-hidden p-0 border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-black/40 uppercase tracking-widest border-b border-white/10">
              <tr>
                <th className="px-6 py-5 font-semibold">Student Name</th>
                <th className="px-6 py-5 font-semibold">Email</th>
                <th className="px-6 py-5 font-semibold">ID Number</th>
                <th className="px-6 py-5 font-semibold">Status</th>
                <th className="px-6 py-5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading registrations...</td></tr> : 
               regs.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No registrations yet.</td></tr> :
               regs.map(reg => (
                <tr key={reg.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{reg.studentName}</td>
                  <td className="px-6 py-4 text-muted-foreground">{reg.studentEmail}</td>
                  <td className="px-6 py-4 text-primary/80">{reg.studentCollegeIdNumber}</td>
                  <td className="px-6 py-4">
                    <Badge variant={reg.status === 'approved' ? 'success' : reg.status === 'rejected' ? 'destructive' : 'warning'} className="uppercase">
                      {reg.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {reg.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" className="h-9 w-9 p-0 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => handleStatus(reg.id, 'approved')}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-9 w-9 p-0 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleStatus(reg.id, 'rejected')}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

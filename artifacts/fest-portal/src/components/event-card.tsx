import React from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Calendar, MapPin, Users, Heart } from "lucide-react";
import { Card, Badge, Button } from "./ui-components";
import type { Event } from "@workspace/api-client-react/src/generated/api.schemas";
import { useAuth } from "@/hooks/use-auth";
import { useGetStudentRegistrations, useRegisterForEvent, useAddBookmark, useRemoveBookmark, useGetBookmarks } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/utils";

export function EventCard({ event, hideActions = false }: { event: Event, hideActions?: boolean }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isStudent = user?.role === "student";

  const { data: bookmarks } = useGetBookmarks({ query: { enabled: isStudent && !hideActions } });
  const { data: registrations } = useGetStudentRegistrations({ query: { enabled: isStudent && !hideActions } });

  const isBookmarked = bookmarks?.some(b => b.id === event.id) ?? false;
  const isRegistered = registrations?.some(r => r.eventId === event.id) ?? false;
  const isFull = event.maxParticipants ? event.registeredCount >= event.maxParticipants : false;
  const isPastDeadline = new Date(event.registrationDeadline) < new Date();
  const isCompleted = event.eventStatus === "completed";

  const addBookmark = useAddBookmark({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] }),
      onError: () => toast({ title: "Failed to bookmark", variant: "destructive" })
    }
  });

  const removeBookmark = useRemoveBookmark({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] })
    }
  });

  const registerEvent = useRegisterForEvent({
    mutation: {
      onSuccess: () => {
        toast({ title: "Registration Submitted", description: "Your registration is pending approval." });
        queryClient.invalidateQueries({ queryKey: ["/api/student/registrations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      },
      onError: (err) => {
        toast({ title: "Registration Failed", description: getErrorMessage(err), variant: "destructive" });
      }
    }
  });

  const handleBookmarkToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isStudent) return toast({ description: "Please log in as a student to bookmark events." });
    if (isBookmarked) removeBookmark.mutate({ eventId: event.id });
    else addBookmark.mutate({ eventId: event.id });
  };

  const handleRegister = (e: React.MouseEvent) => {
    e.stopPropagation();
    registerEvent.mutate({ eventId: event.id });
  };

  return (
    <Card 
      hover 
      onClick={() => setLocation(`/events/${event.id}`)}
      className="flex flex-col h-full relative overflow-hidden group p-0 border-white/10"
    >
      {/* Thumbnail Section */}
      <div className="relative h-48 w-full overflow-hidden bg-secondary">
        {event.thumbnailUrl ? (
          <img src={event.thumbnailUrl} alt={event.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        ) : (
          <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMDAwIj48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDBMOCA4Wk04IDBMMCA4WiIgc3Ryb2tlPSIjRDRBRjM3IiBzdHJva2Utd2lkdGg9IjAuMSI+PC9wYXRoPgo8L3N2Zz4=')] opacity-50 flex items-center justify-center">
            <span className="font-display text-4xl text-white/20 uppercase font-bold tracking-widest">{event.category.substring(0, 3)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
        
        {/* Badges Overlay */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <Badge variant="primary" className="bg-background/80 backdrop-blur-md px-3 py-1 font-semibold">{event.category}</Badge>
          {!hideActions && isStudent && (
            <button 
              onClick={handleBookmarkToggle}
              className="w-8 h-8 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center hover:bg-primary/20 transition-colors border border-white/10"
            >
              <Heart className={`w-4 h-4 transition-colors ${isBookmarked ? 'fill-primary text-primary' : 'text-white hover:text-primary'}`} />
            </button>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-xl font-display font-bold text-white mb-1 group-hover:text-primary transition-colors">{event.title}</h3>
        <p className="text-sm text-primary/80 font-medium mb-4">{event.collegeName}</p>
        
        <div className="space-y-2.5 mb-6 text-sm text-muted-foreground flex-1">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-primary" />
            <span>{format(new Date(event.eventDate), 'MMM dd, yyyy • h:mm a')}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="truncate">{event.venue}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-primary" />
            <span>{event.registeredCount} {event.maxParticipants ? `/ ${event.maxParticipants}` : ''} Registered</span>
          </div>
        </div>

        {/* Action Button */}
        {!hideActions && isStudent && (
          <Button 
            className="w-full font-semibold tracking-wide" 
            variant={isRegistered || isCompleted || isPastDeadline || isFull ? "secondary" : "primary"}
            disabled={isRegistered || isCompleted || isPastDeadline || isFull || registerEvent.isPending}
            onClick={handleRegister}
            isLoading={registerEvent.isPending}
          >
            {isRegistered ? "Already Registered" 
              : isCompleted ? "Event Completed" 
              : isPastDeadline ? "Deadline Passed" 
              : isFull ? "Event Full" 
              : "Register Now"}
          </Button>
        )}
      </div>
    </Card>
  );
}

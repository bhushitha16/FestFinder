import { useRoute, Link } from "wouter";
import { AppLayout } from "@/components/layout";
import { useGetEvent, useGetStudentRegistrations, useRegisterForEvent, useAddEventReview, useAddBookmark, useRemoveBookmark, useGetBookmarks } from "@workspace/api-client-react";
import { Card, Badge, Button, StarRating, Textarea } from "@/components/ui-components";
import { format } from "date-fns";
import { Calendar, MapPin, Users, Heart, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/utils";
import { EventCard } from "@/components/event-card";

export default function EventDetail({ id }: { id?: string }) {
  const [, params] = useRoute("/events/:id");
  const eventId = parseInt(id || params?.id || "0");

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isStudent = user?.role === "student";

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  // ── All hooks MUST be called unconditionally before any early return ──
  const { data: event, isLoading } = useGetEvent(eventId, { query: { enabled: !!eventId } });
  const { data: myRegs } = useGetStudentRegistrations({ query: { enabled: isStudent } });
  const { data: bookmarks } = useGetBookmarks({ query: { enabled: isStudent } });

  const registerEvent = useRegisterForEvent({
    mutation: {
      onSuccess: () => {
        toast({ title: "Registration Submitted", description: "Your registration is pending approval." });
        queryClient.invalidateQueries({ queryKey: ["/api/student/registrations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      },
      onError: (err) => toast({ title: "Registration Failed", description: getErrorMessage(err), variant: "destructive" }),
    },
  });

  const submitReview = useAddEventReview({
    mutation: {
      onSuccess: () => {
        toast({ title: "Review Submitted", description: "Thank you for your feedback!" });
        queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
        setReviewRating(0);
        setReviewText("");
      },
      onError: (err) => toast({ title: "Failed to submit", description: getErrorMessage(err), variant: "destructive" }),
    },
  });

  const addBookmark = useAddBookmark({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] }) },
  });
  const removeBookmark = useRemoveBookmark({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] }) },
  });

  // ── Early return AFTER all hooks ──
  if (isLoading || !event) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const isRegistered = myRegs?.some((r) => r.eventId === event.id) ?? false;
  const hasAttended = myRegs?.some((r) => r.eventId === event.id && r.status === "approved") ?? false;
  const isBookmarked = bookmarks?.some((b) => b.id === event.id) ?? false;
  const isCompleted = event.eventStatus === "completed";
  const isPastDeadline = new Date(event.registrationDeadline) < new Date();
  const isFull = event.maxParticipants ? event.registeredCount >= event.maxParticipants : false;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 w-full">
        <Link
          href={isStudent ? "/student/dashboard" : "/"}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Link>

        {/* Hero */}
        <div className="relative h-[40vh] md:h-[50vh] w-full rounded-2xl overflow-hidden mb-10 border border-white/10 shadow-2xl">
          {event.thumbnailUrl ? (
            <img src={event.thumbnailUrl} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-secondary to-accent flex items-center justify-center">
              <span className="font-display text-7xl text-white/10 uppercase font-bold tracking-widest">{event.category}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

          <div className="absolute bottom-0 left-0 p-8 w-full">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Badge variant="primary" className="px-4 py-1.5 text-sm">{event.category}</Badge>
              <Badge variant={isCompleted ? "default" : "warning"} className="px-4 py-1.5 text-sm uppercase tracking-wider">
                {event.eventStatus}
              </Badge>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-2">{event.title}</h1>
            <Link href={`/colleges/${event.collegeId}`} className="text-xl text-primary font-medium hover:underline inline-block">
              {event.collegeName}
            </Link>
          </div>

          {isStudent && (
            <div className="absolute top-6 right-6">
              <button
                onClick={() =>
                  isBookmarked
                    ? removeBookmark.mutate({ eventId: event.id })
                    : addBookmark.mutate({ eventId: event.id })
                }
                className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <Heart className={`w-6 h-6 ${isBookmarked ? "fill-primary text-primary" : "text-white"}`} />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="md:col-span-2 space-y-10">
            <section>
              <h2 className="text-2xl font-display font-semibold mb-4 text-white">About the Event</h2>
              <div className="prose prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {event.description}
              </div>
            </section>

            {/* Sub-Events */}
            {event.subEvents && event.subEvents.length > 0 && (
              <section className="pt-6">
                <h2 className="text-2xl font-display font-semibold mb-6 text-white border-b border-white/5 pb-4">
                  Venture Events under {event.title}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {event.subEvents.map(sub => (
                    <EventCard key={sub.id} event={sub} hideActions={true} />
                  ))}
                </div>
              </section>
            )}

            {/* Gallery */}
            {isCompleted && event.photos && event.photos.length > 0 && (
              <section className="pt-6">
                <h2 className="text-2xl font-display font-semibold mb-6 text-white border-b border-white/5 pb-4">
                  Event Gallery
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {event.photos.map((photo) => (
                    <div key={photo.id} className="relative aspect-video rounded-xl overflow-hidden group bg-secondary">
                      <img
                        src={photo.photoUrl}
                        alt="Event"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      {photo.caption && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 translate-y-2 group-hover:translate-y-0 transition-transform">
                          <p className="text-sm text-white">{photo.caption}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Reviews */}
            <section className="pt-6">
              <div className="flex items-end justify-between mb-6 border-b border-white/5 pb-4">
                <h2 className="text-2xl font-display font-semibold text-white">Reviews</h2>
                  {event.averageRating && (
                    <div className="flex items-center gap-2">
                      <StarRating rating={Math.round(event.averageRating)} readonly />
                      <span className="text-muted-foreground font-medium">
                        ({event.averageRating.toFixed(1)}) &bull; {event.reviewCount} reviews
                      </span>
                    </div>
                  )}
                </div>

              {isStudent && (
                <Card className="mb-8 p-6 bg-secondary/30">
                  <h4 className="font-semibold mb-4">Leave your feedback</h4>
                  {!hasAttended ? (
                    <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm">
                      You must attend this event to leave a review.
                    </div>
                  ) : !isCompleted ? (
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm">
                      You can leave your feedback once the event is completed!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <StarRating rating={reviewRating} onChange={setReviewRating} />
                      <Textarea
                        placeholder="Share your experience (optional)"
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                      />
                      <Button
                        disabled={reviewRating === 0 || submitReview.isPending}
                        onClick={() =>
                          submitReview.mutate({ eventId: event.id, data: { rating: reviewRating, review: reviewText } })
                        }
                        isLoading={submitReview.isPending}
                      >
                        Submit Review
                      </Button>
                    </div>
                  )}
                </Card>
              )}

                <div className="space-y-4">
                  {event.reviews && event.reviews.length > 0 ? (
                    event.reviews.map((review) => (
                      <div key={review.id} className="p-6 rounded-xl bg-card border border-white/5">
                        <div className="flex justify-between items-start mb-3">
                          <span className="font-medium text-white">{review.studentName}</span>
                          <StarRating rating={review.rating} readonly />
                        </div>
                        {review.review && (
                          <p className="text-muted-foreground text-sm italic">"{review.review}"</p>
                        )}
                        <p className="text-xs text-muted-foreground/50 mt-4">
                          {format(new Date(review.createdAt), "MMMM dd, yyyy")}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No reviews yet.</p>
                  )}
                </div>
              </section>
          </div>

          {/* Sidebar */}
          <div>
            <Card className="sticky top-28 p-6 space-y-6">
              <h3 className="font-display font-semibold text-xl border-b border-white/10 pb-4">Event Details</h3>

              <div className="space-y-4">
                <div className="flex items-start gap-4 text-sm">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Date & Time</p>
                    <p className="text-muted-foreground mt-0.5">
                      {format(new Date(event.eventDate), "EEEE, MMMM dd, yyyy")}
                    </p>
                    <p className="text-muted-foreground">{format(new Date(event.eventDate), "h:mm a")}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 text-sm">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Venue</p>
                    <p className="text-muted-foreground mt-0.5">{event.venue}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 text-sm">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Registration</p>
                    <p className="text-muted-foreground mt-0.5">
                      {event.registeredCount}
                      {event.maxParticipants ? ` / ${event.maxParticipants}` : ""} Attending
                    </p>
                    <p className="text-xs text-destructive mt-1">
                      Closes: {format(new Date(event.registrationDeadline), "MMM dd, h:mm a")}
                    </p>
                  </div>
                </div>
              </div>

              {isStudent ? (
                <div className="pt-6 border-t border-white/10">
                  <Button
                    className="w-full"
                    size="lg"
                    variant={isRegistered || isCompleted || isPastDeadline || isFull ? "secondary" : "primary"}
                    disabled={isRegistered || isCompleted || isPastDeadline || isFull || registerEvent.isPending}
                    onClick={() => registerEvent.mutate({ eventId: event.id })}
                    isLoading={registerEvent.isPending}
                  >
                    {isRegistered
                      ? "Already Registered"
                      : isCompleted
                      ? "Event Completed"
                      : isPastDeadline
                      ? "Registration Closed"
                      : isFull
                      ? "Event Full"
                      : "Register Now"}
                  </Button>
                </div>
              ) : !user ? (
                <div className="pt-6 border-t border-white/10 text-center">
                  <Link href="/student/login">
                    <Button className="w-full" variant="outline">
                      Login to Register
                    </Button>
                  </Link>
                </div>
              ) : null}
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

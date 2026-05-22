import { useRoute } from "wouter";
import { AppLayout } from "@/components/layout";
import { useGetCollege } from "@workspace/api-client-react";
import { EventCard } from "@/components/event-card";
import { useState } from "react";
import { Building2 } from "lucide-react";

export default function CollegeDetail({ id }: { id?: string }) {
  const [match, params] = useRoute("/colleges/:id");
  const collegeId = parseInt(id || params?.id || "0");
  
  const { data: college, isLoading } = useGetCollege(collegeId, { query: { enabled: !!collegeId } });
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  if (isLoading || !college) {
    return <AppLayout><div className="flex-1 flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"/></div></AppLayout>;
  }

  const events = activeTab === "upcoming" ? college.upcomingEvents : college.pastEvents;

  return (
    <AppLayout>
      <div className="w-full bg-secondary/50 border-b border-white/5 py-16">
        <div className="max-w-7xl mx-auto px-4 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-background rounded-2xl flex items-center justify-center border border-primary/20 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)] mb-6">
            <Building2 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">{college.name}</h1>
          <p className="text-primary tracking-widest uppercase text-sm">Official College Page</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 w-full">
        <div className="flex justify-center gap-4 mb-12">
          <button 
            onClick={() => setActiveTab("upcoming")}
            className={`px-8 py-3 rounded-full text-sm font-semibold transition-all ${activeTab === 'upcoming' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-white/5 hover:text-white'}`}
          >
            Upcoming Events ({college.upcomingEvents.length})
          </button>
          <button 
            onClick={() => setActiveTab("past")}
            className={`px-8 py-3 rounded-full text-sm font-semibold transition-all ${activeTab === 'past' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-white/5 hover:text-white'}`}
          >
            Past Events ({college.pastEvents.length})
          </button>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-20 glass-panel rounded-2xl">
            <p className="text-muted-foreground text-lg">No {activeTab} events found for this college.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map(event => <EventCard key={event.id} event={event as any} />)}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

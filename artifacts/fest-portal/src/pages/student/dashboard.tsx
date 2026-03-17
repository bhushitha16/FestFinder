import { useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useListEvents, useGetStudentRegistrations, useGetBookmarks, useListCategories } from "@workspace/api-client-react";
import { Input, Select } from "@/components/ui-components";
import { EventCard } from "@/components/event-card";
import { Search } from "lucide-react";
import type { ListEventsStatus } from "@workspace/api-client-react/src/generated/api.schemas";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"discover" | "my-registrations" | "bookmarks">("discover");
  
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("upcoming");

  const { data: categories = [] } = useListCategories();

  const { data: events = [], isLoading: loadingEvents } = useListEvents({ 
    query: { enabled: activeTab === "discover" },
    search: search || undefined,
    category: category || undefined,
    status: statusFilter && statusFilter !== "all" ? statusFilter as ListEventsStatus : undefined
  });
  
  const { data: registrations = [], isLoading: loadingRegs } = useGetStudentRegistrations({
    query: { enabled: activeTab === "my-registrations" }
  });

  const { data: bookmarks = [], isLoading: loadingBookmarks } = useGetBookmarks({
    query: { enabled: activeTab === "bookmarks" }
  });

  if (!user || user.role !== "student") {
    return <AppLayout><div className="p-8 text-center">Unauthorized access</div></AppLayout>;
  }

  const categoryOptions = categories.map(c => ({ value: c, label: c }));
  const statusOptions = [
    { value: "all", label: "All Events" },
    { value: "upcoming", label: "Upcoming" },
    { value: "completed", label: "Completed" }
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-10 w-full flex-1 flex flex-col">
        <div className="mb-10">
          <h1 className="text-4xl font-display font-bold">Welcome, <span className="gold-gradient-text">{user.name}</span></h1>
          <p className="text-muted-foreground mt-2 text-lg">Curate your perfect college festival experience.</p>
        </div>
          
        <div className="flex flex-col md:flex-row gap-8 mb-8">
          {/* Tabs Sidebar (Desktop) or Top (Mobile) */}
          <div className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 md:w-64 shrink-0">
            {[
              { id: "discover", label: "Discover Events" },
              { id: "my-registrations", label: "My Registrations" },
              { id: "bookmarks", label: "Saved Events" }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-3 rounded-lg text-sm font-semibold transition-all text-left whitespace-nowrap ${
                  activeTab === tab.id 
                    ? "bg-primary text-primary-foreground shadow-[0_0_15px_-3px_hsl(var(--primary)/0.3)]" 
                    : "bg-secondary text-muted-foreground hover:bg-white/5 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1">
            {activeTab === "discover" && (
              <div className="space-y-6">
                <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row gap-4 mb-8">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input 
                      placeholder="Search events or colleges..." 
                      className="pl-10 bg-black/30 border-none"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="w-full md:w-48 shrink-0">
                    <Select options={categoryOptions} value={category} onChange={(e) => setCategory(e.target.value)} className="bg-black/30 border-none">
                      <option value="">All Categories</option>
                    </Select>
                  </div>
                  <div className="w-full md:w-48 shrink-0">
                    <Select options={statusOptions} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-black/30 border-none" />
                  </div>
                </div>

                {loadingEvents ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[1,2,3].map(i => <div key={i} className="h-[450px] rounded-xl bg-secondary animate-pulse" />)}
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-32 glass-panel rounded-xl">
                    <p className="text-muted-foreground text-lg">No events found matching your criteria.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {events.map(event => <EventCard key={event.id} event={event} />)}
                  </div>
                )}
              </div>
            )}

            {activeTab === "my-registrations" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-display font-semibold border-b border-white/5 pb-4">My Registrations</h2>
                {loadingRegs ? (
                  <div className="animate-pulse space-y-4">
                    {[1,2].map(i => <div key={i} className="h-24 bg-secondary rounded-xl" />)}
                  </div>
                ) : registrations.length === 0 ? (
                  <div className="text-center py-32 glass-panel rounded-xl">
                    <p className="text-muted-foreground text-lg">You haven't registered for any events yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {registrations.map(reg => (
                      <div 
                        key={reg.id} 
                        onClick={() => setLocation(`/events/${reg.eventId}`)}
                        className="glass-panel hover:bg-white/5 cursor-pointer transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 gap-4 rounded-xl border-l-4 border-l-primary"
                      >
                        <div>
                          <h3 className="text-lg font-bold text-white mb-1">{reg.eventTitle}</h3>
                          <p className="text-sm text-muted-foreground">Registered on {new Date(reg.registeredAt).toLocaleDateString()}</p>
                        </div>
                        <div className={`px-4 py-1.5 rounded-full text-sm font-semibold uppercase tracking-wider ${
                          reg.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                          reg.status === 'rejected' ? 'bg-destructive/10 text-destructive border border-destructive/20' : 
                          'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                        }`}>
                          {reg.status}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "bookmarks" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-display font-semibold border-b border-white/5 pb-4">Saved Events</h2>
                {loadingBookmarks ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[1,2].map(i => <div key={i} className="h-[450px] rounded-xl bg-secondary animate-pulse" />)}
                  </div>
                ) : bookmarks.length === 0 ? (
                  <div className="text-center py-32 glass-panel rounded-xl">
                    <p className="text-muted-foreground text-lg">Your bookmark list is empty.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {bookmarks.map(event => <EventCard key={event.id} event={event} />)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

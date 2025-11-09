import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Activity } from "lucide-react";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface ActivityLog {
  id: string;
  activity_type: string;
  description: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
  metadata: any;
}

export const RecentActions = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivities();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel("user_activity_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_activity_log",
        },
        () => {
          fetchRecentActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRecentActivities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_activity_log")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      login: "bg-green-500/10 text-green-700 dark:text-green-400",
      logout: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
      ticket_created: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      ticket_updated: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
      asset_viewed: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
      asset_assigned: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
      asset_returned: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
      profile_updated: "bg-pink-500/10 text-pink-700 dark:text-pink-400",
      service_added: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
      request_created: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
      request_updated: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    };
    return colors[type] || "bg-muted text-muted-foreground";
  };

  const formatActivityType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Activity className="h-5 w-5" />
          {activities.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
              {activities.length > 9 ? "9+" : activities.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Actions
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-100px)] mt-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Loading activities...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32">
              <Activity className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No recent activities</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <Card key={activity.id} className="border-l-4 border-l-primary/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <Badge variant="secondary" className={getActivityColor(activity.activity_type)}>
                          {formatActivityType(activity.activity_type)}
                        </Badge>
                        <p className="text-sm text-foreground">{activity.description}</p>
                        {activity.entity_type && (
                          <p className="text-xs text-muted-foreground">
                            {activity.entity_type}: {activity.entity_id?.slice(0, 8)}...
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                        <Clock className="h-3 w-3" />
                        {format(new Date(activity.created_at), "MMM d, HH:mm")}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

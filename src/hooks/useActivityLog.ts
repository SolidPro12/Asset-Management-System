import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ActivityType =
  | "login"
  | "logout"
  | "ticket_created"
  | "ticket_updated"
  | "asset_viewed"
  | "asset_assigned"
  | "asset_returned"
  | "asset_status_changed"
  | "asset_location_changed"
  | "profile_updated"
  | "service_added"
  | "request_created"
  | "request_updated";

interface LogActivityParams {
  activityType: ActivityType;
  description: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

export const useActivityLog = () => {
  const { toast } = useToast();

  const logActivity = async ({
    activityType,
    description,
    entityType,
    entityId,
    metadata,
  }: LogActivityParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("No user found for activity logging");
        return;
      }

      const { error } = await supabase.from("user_activity_log").insert({
        user_id: user.id,
        activity_type: activityType,
        description,
        entity_type: entityType,
        entity_id: entityId,
        metadata,
      });

      if (error) {
        console.error("Error logging activity:", error);
      }
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  };

  return { logActivity };
};

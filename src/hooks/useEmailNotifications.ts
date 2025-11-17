import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useEmailNotifications = () => {
  const sendWelcomeEmail = async (userEmail: string, userName: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-welcome-email', {
        body: { userEmail, userName }
      });

      if (error) {
        console.error('Error sending welcome email:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  };

  const sendAssetAssignmentEmail = async (params: {
    userEmail: string;
    userName: string;
    assetName: string;
    assetId?: string;
    assignedBy?: string;
    assignedDate?: string;
  }) => {
    try {
      const { error } = await supabase.functions.invoke('send-asset-assignment-email', {
        body: params
      });

      if (error) {
        console.error('Error sending asset assignment email:', error);
        toast.error('Failed to send notification email');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error sending asset assignment email:', error);
      return false;
    }
  };

  const sendTransferApprovalEmail = async (params: {
    recipientEmail: string;
    recipientName: string;
    assetName: string;
    fromUser?: string;
    toUser: string;
    transferStatus: string;
    actionRequired?: boolean;
  }) => {
    try {
      const { error } = await supabase.functions.invoke('send-transfer-approval-email', {
        body: params
      });

      if (error) {
        console.error('Error sending transfer approval email:', error);
        toast.error('Failed to send notification email');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error sending transfer approval email:', error);
      return false;
    }
  };

  const sendMaintenanceReminderEmail = async (params: {
    recipientEmail: string;
    recipientName: string;
    assetName: string;
    maintenanceType: string;
    scheduledDate?: string;
    frequency?: string;
    notes?: string;
  }) => {
    try {
      const { error } = await supabase.functions.invoke('send-maintenance-reminder-email', {
        body: params
      });

      if (error) {
        console.error('Error sending maintenance reminder email:', error);
        toast.error('Failed to send notification email');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error sending maintenance reminder email:', error);
      return false;
    }
  };

  const sendTicketAssignmentEmail = async (params: {
    recipientEmail: string;
    recipientName: string;
    ticketId?: string;
    ticketTitle: string;
    ticketDescription?: string;
    priority?: string;
    assetName?: string;
    location?: string;
    createdBy?: string;
  }) => {
    try {
      const { error } = await supabase.functions.invoke('send-ticket-assignment-email', {
        body: params
      });

      if (error) {
        console.error('Error sending ticket assignment email:', error);
        toast.error('Failed to send notification email');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error sending ticket assignment email:', error);
      return false;
    }
  };

  return {
    sendWelcomeEmail,
    sendAssetAssignmentEmail,
    sendTransferApprovalEmail,
    sendMaintenanceReminderEmail,
    sendTicketAssignmentEmail,
  };
};

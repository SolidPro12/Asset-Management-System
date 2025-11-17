import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Helper function to check if notification type is enabled
const isNotificationEnabled = async (notificationType: string): Promise<boolean> => {
  try {
    const { data } = await supabase
      .from('email_notification_settings')
      .select('enabled')
      .eq('notification_type', notificationType)
      .single();
    
    return data?.enabled ?? true;
  } catch (error) {
    console.error('Error checking notification settings:', error);
    return true; // Default to enabled if check fails
  }
};

// Helper function to log email
const logEmail = async (params: {
  notificationType: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
  metadata?: any;
}) => {
  try {
    await supabase.from('email_logs').insert({
      notification_type: params.notificationType,
      recipient_email: params.recipientEmail,
      recipient_name: params.recipientName,
      subject: params.subject,
      status: params.status,
      error_message: params.errorMessage,
      metadata: params.metadata,
    });
  } catch (error) {
    console.error('Error logging email:', error);
  }
};

export const useEmailNotifications = () => {
  const sendWelcomeEmail = async (userEmail: string, userName: string) => {
    if (!(await isNotificationEnabled('welcome_email'))) {
      console.log('Welcome email notifications are disabled');
      return false;
    }

    try {
      const { error } = await supabase.functions.invoke('send-welcome-email', {
        body: { userEmail, userName }
      });

      const subject = 'Welcome to Asset Management System';
      
      if (error) {
        console.error('Error sending welcome email:', error);
        await logEmail({
          notificationType: 'welcome_email',
          recipientEmail: userEmail,
          recipientName: userName,
          subject,
          status: 'failed',
          errorMessage: error.message,
        });
        return false;
      }
      
      await logEmail({
        notificationType: 'welcome_email',
        recipientEmail: userEmail,
        recipientName: userName,
        subject,
        status: 'sent',
      });
      return true;
    } catch (error: any) {
      console.error('Error sending welcome email:', error);
      await logEmail({
        notificationType: 'welcome_email',
        recipientEmail: userEmail,
        recipientName: userName,
        subject: 'Welcome to Asset Management System',
        status: 'failed',
        errorMessage: error.message,
      });
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
    if (!(await isNotificationEnabled('asset_assignment'))) {
      console.log('Asset assignment email notifications are disabled');
      return false;
    }

    try {
      const { error } = await supabase.functions.invoke('send-asset-assignment-email', {
        body: params
      });

      const subject = `Asset Assigned: ${params.assetName}`;

      if (error) {
        console.error('Error sending asset assignment email:', error);
        toast.error('Failed to send notification email');
        await logEmail({
          notificationType: 'asset_assignment',
          recipientEmail: params.userEmail,
          recipientName: params.userName,
          subject,
          status: 'failed',
          errorMessage: error.message,
          metadata: { assetName: params.assetName, assetId: params.assetId },
        });
        return false;
      }
      
      await logEmail({
        notificationType: 'asset_assignment',
        recipientEmail: params.userEmail,
        recipientName: params.userName,
        subject,
        status: 'sent',
        metadata: { assetName: params.assetName, assetId: params.assetId },
      });
      return true;
    } catch (error: any) {
      console.error('Error sending asset assignment email:', error);
      await logEmail({
        notificationType: 'asset_assignment',
        recipientEmail: params.userEmail,
        recipientName: params.userName,
        subject: `Asset Assigned: ${params.assetName}`,
        status: 'failed',
        errorMessage: error.message,
        metadata: { assetName: params.assetName, assetId: params.assetId },
      });
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
    if (!(await isNotificationEnabled('transfer_approval'))) {
      console.log('Transfer approval email notifications are disabled');
      return false;
    }

    try {
      const { error } = await supabase.functions.invoke('send-transfer-approval-email', {
        body: params
      });

      const subject = `Asset Transfer ${params.actionRequired ? 'Approval Required' : 'Update'}: ${params.assetName}`;

      if (error) {
        console.error('Error sending transfer approval email:', error);
        toast.error('Failed to send notification email');
        await logEmail({
          notificationType: 'transfer_approval',
          recipientEmail: params.recipientEmail,
          recipientName: params.recipientName,
          subject,
          status: 'failed',
          errorMessage: error.message,
          metadata: { assetName: params.assetName, transferStatus: params.transferStatus },
        });
        return false;
      }
      
      await logEmail({
        notificationType: 'transfer_approval',
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        subject,
        status: 'sent',
        metadata: { assetName: params.assetName, transferStatus: params.transferStatus },
      });
      return true;
    } catch (error: any) {
      console.error('Error sending transfer approval email:', error);
      await logEmail({
        notificationType: 'transfer_approval',
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        subject: `Asset Transfer Update: ${params.assetName}`,
        status: 'failed',
        errorMessage: error.message,
        metadata: { assetName: params.assetName, transferStatus: params.transferStatus },
      });
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
    if (!(await isNotificationEnabled('maintenance_reminder'))) {
      console.log('Maintenance reminder email notifications are disabled');
      return false;
    }

    try {
      const { error } = await supabase.functions.invoke('send-maintenance-reminder-email', {
        body: params
      });

      const subject = `Maintenance Reminder: ${params.assetName} - ${params.maintenanceType}`;

      if (error) {
        console.error('Error sending maintenance reminder email:', error);
        toast.error('Failed to send notification email');
        await logEmail({
          notificationType: 'maintenance_reminder',
          recipientEmail: params.recipientEmail,
          recipientName: params.recipientName,
          subject,
          status: 'failed',
          errorMessage: error.message,
          metadata: { assetName: params.assetName, maintenanceType: params.maintenanceType },
        });
        return false;
      }
      
      await logEmail({
        notificationType: 'maintenance_reminder',
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        subject,
        status: 'sent',
        metadata: { assetName: params.assetName, maintenanceType: params.maintenanceType },
      });
      return true;
    } catch (error: any) {
      console.error('Error sending maintenance reminder email:', error);
      await logEmail({
        notificationType: 'maintenance_reminder',
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        subject: `Maintenance Reminder: ${params.assetName}`,
        status: 'failed',
        errorMessage: error.message,
        metadata: { assetName: params.assetName, maintenanceType: params.maintenanceType },
      });
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
    if (!(await isNotificationEnabled('ticket_assignment'))) {
      console.log('Ticket assignment email notifications are disabled');
      return false;
    }

    try {
      const { error } = await supabase.functions.invoke('send-ticket-assignment-email', {
        body: params
      });

      const subject = `Ticket Assigned: ${params.ticketTitle} [${params.priority?.toUpperCase()}]`;

      if (error) {
        console.error('Error sending ticket assignment email:', error);
        toast.error('Failed to send notification email');
        await logEmail({
          notificationType: 'ticket_assignment',
          recipientEmail: params.recipientEmail,
          recipientName: params.recipientName,
          subject,
          status: 'failed',
          errorMessage: error.message,
          metadata: { ticketId: params.ticketId, ticketTitle: params.ticketTitle },
        });
        return false;
      }
      
      await logEmail({
        notificationType: 'ticket_assignment',
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        subject,
        status: 'sent',
        metadata: { ticketId: params.ticketId, ticketTitle: params.ticketTitle },
      });
      return true;
    } catch (error: any) {
      console.error('Error sending ticket assignment email:', error);
      await logEmail({
        notificationType: 'ticket_assignment',
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        subject: `Ticket Assigned: ${params.ticketTitle}`,
        status: 'failed',
        errorMessage: error.message,
        metadata: { ticketId: params.ticketId, ticketTitle: params.ticketTitle },
      });
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

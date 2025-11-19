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

// Helper function to log email directly to database
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

// Helper function to send status emails via edge function
const sendStatusEmail = async (params: {
  recipientEmail: string;
  recipientName: string;
  status: 'approved' | 'rejected';
  message: string;
  subject: string;
  notificationType: string;
  metadata?: any;
}) => {
  try {
    const { error } = await supabase.functions.invoke('send-status-email', {
      body: params
    });

    if (error) {
      console.error('Error sending status email:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error invoking send-status-email:', error);
    return false;
  }
};

export const useEmailNotifications = () => {
  const sendWelcomeEmail = async (userEmail: string, userName: string) => {
    if (!(await isNotificationEnabled('welcome_email'))) {
      console.log('Welcome email notifications are disabled');
      return false;
    }

    const subject = 'Welcome to Asset Management System';
    const message = `Hi ${userName}, welcome to the Asset Management System! Your account has been created successfully.`;
    
    try {
      const success = await sendStatusEmail({
        recipientEmail: userEmail,
        recipientName: userName,
        status: 'approved',
        message,
        subject,
        notificationType: 'welcome_email'
      });

      if (!success) {
        await logEmail({
          notificationType: 'welcome_email',
          recipientEmail: userEmail,
          recipientName: userName,
          subject,
          status: 'failed',
          errorMessage: 'Failed to send email',
        });
        return false;
      }

      return true;
    } catch (error: any) {
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

    const subject = `Asset Assigned: ${params.assetName}`;
    const message = `Hi ${params.userName}, the asset "${params.assetName}" has been assigned to you${params.assignedBy ? ' by ' + params.assignedBy : ''}.`;

    try {
      const success = await sendStatusEmail({
        recipientEmail: params.userEmail,
        recipientName: params.userName,
        status: 'approved',
        message,
        subject,
        notificationType: 'asset_assignment',
        metadata: { assetName: params.assetName, assetId: params.assetId }
      });

      if (!success) {
        toast.error('Failed to send notification email');
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('Error sending asset assignment email:', error);
      toast.error('Failed to send notification email');
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

    const subject = params.actionRequired 
      ? `Action Required: Asset Transfer Approval - ${params.assetName}`
      : `Asset Transfer ${params.transferStatus} - ${params.assetName}`;
    
    const message = params.actionRequired
      ? `Hi ${params.recipientName}, your approval is required for the transfer of "${params.assetName}" to ${params.toUser}.`
      : `Hi ${params.recipientName}, the transfer of "${params.assetName}" has been ${params.transferStatus}.`;

    try {
      const success = await sendStatusEmail({
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        status: params.transferStatus === 'approved' ? 'approved' : 'rejected',
        message,
        subject,
        notificationType: 'transfer_approval',
        metadata: { assetName: params.assetName, transferStatus: params.transferStatus }
      });

      if (!success) {
        toast.error('Failed to send notification email');
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('Error sending transfer approval email:', error);
      toast.error('Failed to send notification email');
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

    const subject = `Maintenance Reminder: ${params.assetName}`;
    const message = `Hi ${params.recipientName}, this is a reminder about ${params.maintenanceType} maintenance for "${params.assetName}"${params.scheduledDate ? ' scheduled for ' + params.scheduledDate : ''}.`;

    try {
      const success = await sendStatusEmail({
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        status: 'approved',
        message,
        subject,
        notificationType: 'maintenance_reminder',
        metadata: { 
          assetName: params.assetName, 
          maintenanceType: params.maintenanceType,
          scheduledDate: params.scheduledDate 
        }
      });

      if (!success) {
        toast.error('Failed to send notification email');
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('Error sending maintenance reminder email:', error);
      toast.error('Failed to send notification email');
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

    const subject = `Ticket Assigned: ${params.ticketTitle}`;
    const message = `Hi ${params.recipientName}, ticket "${params.ticketTitle}" has been assigned to you${params.priority ? ' with ' + params.priority + ' priority' : ''}.`;

    try {
      const success = await sendStatusEmail({
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        status: 'approved',
        message,
        subject,
        notificationType: 'ticket_assignment',
        metadata: { 
          ticketId: params.ticketId,
          ticketTitle: params.ticketTitle,
          priority: params.priority 
        }
      });

      if (!success) {
        toast.error('Failed to send notification email');
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('Error sending ticket assignment email:', error);
      toast.error('Failed to send notification email');
      return false;
    }
  };

  const sendPasswordChangeEmail = async (params: {
    recipientEmail: string;
    recipientName: string;
  }) => {
    if (!(await isNotificationEnabled('password_change'))) {
      console.log('Password change email notifications are disabled');
      return false;
    }

    const subject = 'Password Successfully Updated';
    const message = `Hi ${params.recipientName}, your password has been successfully updated. If you did not make this change, please contact your administrator immediately.`;

    try {
      const success = await sendStatusEmail({
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        status: 'approved',
        message,
        subject,
        notificationType: 'password_change',
        metadata: { timestamp: new Date().toISOString() }
      });

      if (!success) {
        console.error('Failed to send password change notification');
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('Error sending password change email:', error);
      return false;
    }
  };

  return {
    sendWelcomeEmail,
    sendAssetAssignmentEmail,
    sendTransferApprovalEmail,
    sendMaintenanceReminderEmail,
    sendTicketAssignmentEmail,
    sendPasswordChangeEmail,
  };
};

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Clock, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowUpCircle,
  UserCog,
  FileText,
  Activity
} from 'lucide-react';

interface TicketHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  ticketNumber: string;
}

interface HistoryEntry {
  id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  remarks: string | null;
  created_at: string;
  changed_by: string | null;
  user_name?: string;
}

export function TicketHistoryModal({
  open,
  onOpenChange,
  ticketId,
  ticketNumber,
}: TicketHistoryModalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && ticketId) {
      fetchHistory();
    }
  }, [open, ticketId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ticket_history')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user names for each history entry
      const historyWithNames = await Promise.all(
        (data || []).map(async (entry) => {
          if (entry.changed_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', entry.changed_by)
              .single();
            return { ...entry, user_name: profile?.full_name || 'Unknown User' };
          }
          return { ...entry, user_name: 'System' };
        })
      );

      setHistory(historyWithNames);
    } catch (error) {
      console.error('Error fetching ticket history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    const iconMap: Record<string, any> = {
      created: <FileText className="h-4 w-4" />,
      status_change: <Activity className="h-4 w-4" />,
      assignment_change: <UserCog className="h-4 w-4" />,
      priority_change: <ArrowUpCircle className="h-4 w-4" />,
      cancelled: <XCircle className="h-4 w-4" />,
      resolved: <CheckCircle2 className="h-4 w-4" />,
    };
    return iconMap[action] || <AlertCircle className="h-4 w-4" />;
  };

  const getActionColor = (action: string) => {
    const colorMap: Record<string, string> = {
      created: 'bg-blue-500',
      status_change: 'bg-purple-500',
      assignment_change: 'bg-green-500',
      priority_change: 'bg-orange-500',
      cancelled: 'bg-red-500',
      resolved: 'bg-emerald-500',
    };
    return colorMap[action] || 'bg-gray-500';
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, any> = {
      created: 'default',
      status_change: 'secondary',
      assignment_change: 'outline',
      priority_change: 'destructive',
      cancelled: 'destructive',
      resolved: 'default',
    };
    return (
      <Badge variant={variants[action] || 'default'} className="capitalize">
        {action.replace('_', ' ')}
      </Badge>
    );
  };

  const getUserInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Ticket History - {ticketNumber}</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No history available for this ticket
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="relative">
              {/* Timeline vertical line */}
              <div className="absolute left-[29px] top-0 bottom-0 w-0.5 bg-border" />
              
              {/* Timeline entries */}
              <div className="space-y-6">
                {history.map((entry, index) => (
                  <div key={entry.id} className="relative pl-16">
                    {/* Timeline dot with icon */}
                    <div 
                      className={`absolute left-0 flex items-center justify-center w-[60px] h-[60px] rounded-full ${getActionColor(entry.action)} text-white shadow-lg`}
                    >
                      {getActionIcon(entry.action)}
                    </div>
                    
                    {/* Activity card */}
                    <div className="border rounded-lg p-4 bg-card hover:shadow-md transition-all duration-200">
                      {/* Header with action and time */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getActionBadge(entry.action)}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(entry.created_at), 'MMM dd, HH:mm')}</span>
                        </div>
                      </div>

                      {/* Main content */}
                      <div className="space-y-3">
                        <p className="text-sm font-medium">{entry.remarks}</p>
                        
                        {/* Value changes */}
                        {entry.old_value && entry.new_value && (
                          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                            <span className="px-3 py-1.5 bg-destructive/20 text-destructive text-sm rounded-md font-medium">
                              {entry.old_value}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="px-3 py-1.5 bg-primary/20 text-primary text-sm rounded-md font-medium">
                              {entry.new_value}
                            </span>
                          </div>
                        )}

                        {/* User info */}
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getUserInitials(entry.user_name || 'System')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">{entry.user_name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {entry.changed_by ? 'User Action' : 'System Generated'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

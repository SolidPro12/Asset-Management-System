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
import { format } from 'date-fns';
import { Clock, User } from 'lucide-react';

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

  const getActionBadge = (action: string) => {
    const variants: Record<string, any> = {
      created: 'default',
      status_change: 'secondary',
      assignment_change: 'outline',
      priority_change: 'destructive',
    };
    return <Badge variant={variants[action] || 'default'}>{action.replace('_', ' ')}</Badge>;
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
            <div className="space-y-4">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="border rounded-lg p-4 space-y-2 hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        {getActionBadge(entry.action)}
                        <span className="text-sm font-medium">{entry.remarks}</span>
                      </div>
                      
                      {entry.old_value && entry.new_value && (
                        <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                          <span className="px-2 py-1 bg-destructive/10 text-destructive rounded">
                            {entry.old_value}
                          </span>
                          <span>→</span>
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded">
                            {entry.new_value}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{entry.user_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(entry.created_at), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

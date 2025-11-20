import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, User, Package, MessageSquare, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { AssetAllocation } from "@/hooks/useAssetAllocations";

interface AssetAllocationHistoryModalProps {
  allocation: AssetAllocation;
  open: boolean;
  onClose: () => void;
}

interface HistoryEntry {
  id: string;
  type: 'assignment' | 'ticket';
  title: string;
  description: string;
  date: string;
  status?: string;
  priority?: string;
  icon: typeof Package | typeof MessageSquare;
}

const priorityColors: Record<string, string> = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-700",
  on_hold: "bg-orange-100 text-orange-700",
  cancelled: "bg-red-100 text-red-700",
};

export function AssetAllocationHistoryModal({
  allocation,
  open,
  onClose,
}: AssetAllocationHistoryModalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && allocation.asset_id) {
      fetchHistory();
    }
  }, [open, allocation.asset_id]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const entries: HistoryEntry[] = [];

      // Add assignment entry
      entries.push({
        id: allocation.id,
        type: 'assignment',
        title: 'Asset Assigned',
        description: `Assigned to ${allocation.employee_name}${allocation.department ? ` (${allocation.department})` : ''}`,
        date: allocation.allocated_date,
        icon: Package,
      });

      // Add return entry if exists
      if (allocation.return_date) {
        entries.push({
          id: `${allocation.id}-return`,
          type: 'assignment',
          title: 'Asset Returned',
          description: `Returned by ${allocation.employee_name}`,
          date: allocation.return_date,
          icon: Package,
        });
      }

      // Fetch tickets for this asset
      if (allocation.asset_id) {
        const { data: tickets, error } = await supabase
          .from('tickets')
          .select('*')
          .eq('asset_id', allocation.asset_id)
          .order('created_at', { ascending: false });

        if (!error && tickets) {
          tickets.forEach((ticket) => {
            entries.push({
              id: ticket.id,
              type: 'ticket',
              title: `Ticket Raised: ${ticket.title}`,
              description: ticket.description,
              date: ticket.created_at,
              status: ticket.status,
              priority: ticket.priority,
              icon: MessageSquare,
            });
          });
        }
      }

      // Sort by date (newest first)
      entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setHistory(entries);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Asset Activity History
          </DialogTitle>
        </DialogHeader>

        {/* Asset Header Info */}
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Asset Name</p>
              <p className="font-medium">{allocation.asset_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Category</p>
              <Badge variant="outline">{allocation.category}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Assigned To</p>
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground" />
                <p className="text-sm">{allocation.employee_name}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Assigned Date</p>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                <p className="text-sm">{format(new Date(allocation.allocated_date), "MMM d, yyyy")}</p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Timeline */}
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No history available yet for this asset.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => {
                const Icon = entry.icon;
                return (
                  <div key={entry.id} className="relative">
                    {/* Timeline line */}
                    {index < history.length - 1 && (
                      <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-border" />
                    )}
                    
                    {/* Timeline entry */}
                    <div className="flex gap-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        entry.type === 'assignment' ? 'bg-primary/10' : 'bg-blue-100'
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          entry.type === 'assignment' ? 'text-primary' : 'text-blue-600'
                        }`} />
                      </div>
                      
                      <div className="flex-1 pb-4">
                        <div className="bg-card border rounded-lg p-4 shadow-sm">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm">{entry.title}</h4>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(entry.date), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {entry.description}
                          </p>
                          
                          {entry.type === 'ticket' && (
                            <div className="flex gap-2 mt-3">
                              {entry.priority && (
                                <Badge className={priorityColors[entry.priority] || "bg-gray-100"}>
                                  {entry.priority}
                                </Badge>
                              )}
                              {entry.status && (
                                <Badge className={statusColors[entry.status] || "bg-gray-100"}>
                                  {entry.status.replace('_', ' ')}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

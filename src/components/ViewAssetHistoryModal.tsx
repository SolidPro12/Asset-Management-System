import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, User, Package, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import type { AssetHistoryRecord } from "@/types/assetHistory";

interface ViewAssetHistoryModalProps {
  record: AssetHistoryRecord;
  open: boolean;
  onClose: () => void;
}

const actionColors: Record<string, string> = {
  assigned: "bg-blue-100 text-blue-700",
  returned: "bg-gray-100 text-gray-700",
  maintenance: "bg-indigo-100 text-indigo-700",
  transfer: "bg-amber-100 text-amber-700",
  repair: "bg-red-100 text-red-700",
};

const conditionColors: Record<string, string> = {
  excellent: "bg-green-100 text-green-700",
  good: "bg-blue-100 text-blue-700",
  fair: "bg-orange-100 text-orange-700",
};

export function ViewAssetHistoryModal({
  record,
  open,
  onClose,
}: ViewAssetHistoryModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Asset Movement Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Asset Information */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              Asset Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Asset Name</p>
                <p className="font-medium">{record.asset_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Asset Code</p>
                <p className="font-medium">{record.asset_code || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Category</p>
                <Badge variant="outline">{record.category || 'N/A'}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Condition</p>
                <Badge className={conditionColors[record.condition || ''] || "bg-gray-100"}>
                  {record.condition ? record.condition.charAt(0).toUpperCase() + record.condition.slice(1) : 'N/A'}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Action Information */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              Action Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Action Type</p>
                  <Badge className={actionColors[record.action || ''] || "bg-gray-100"}>
                    {record.action ? record.action.charAt(0).toUpperCase() + record.action.slice(1) : 'N/A'}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Action Date</p>
                  <p className="font-medium">
                    {record.action_date ? format(new Date(record.action_date), "MMMM d, yyyy") : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Performed By</p>
                  <p className="font-medium">
                    {record.performed_by_email || 'System'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Details */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              Details
            </h3>
            <p className="text-sm leading-relaxed">{record.details || 'No details available'}</p>
          </div>

          {/* Notes */}
          {record.notes && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  Additional Notes
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {record.notes}
                </p>
              </div>
            </>
          )}

          {/* Metadata */}
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              Record created: {format(new Date(record.created_at), "PPpp")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

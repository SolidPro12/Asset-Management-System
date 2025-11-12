import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import type { AssetHistoryRecord } from "@/pages/AssetMovementHistory";

interface AssetHistoryTableProps {
  records: AssetHistoryRecord[];
  loading: boolean;
  onViewRecord: (record: AssetHistoryRecord) => void;
}

const actionColors: Record<string, string> = {
  assigned: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  returned: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  maintenance: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200",
  transfer: "bg-amber-100 text-amber-700 hover:bg-amber-200",
  repair: "bg-red-100 text-red-700 hover:bg-red-200",
};

const conditionColors: Record<string, string> = {
  excellent: "bg-green-100 text-green-700 hover:bg-green-200",
  good: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  fair: "bg-orange-100 text-orange-700 hover:bg-orange-200",
};

export function AssetHistoryTable({
  records,
  loading,
  onViewRecord,
}: AssetHistoryTableProps) {
  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Asset Movement History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Fetching asset history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (records.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Asset Movement History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-lg">No asset records found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Try adjusting your filters or check back later
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Asset Movement History</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Showing {records.length} record{records.length !== 1 ? 's' : ''}
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Asset</TableHead>
                <TableHead className="font-semibold">Action</TableHead>
                <TableHead className="font-semibold">Details</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Performed By</TableHead>
                <TableHead className="font-semibold">Condition</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record, index) => (
                <TableRow
                  key={record.id}
                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{record.asset_name || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">
                        {record.asset_code || 'N/A'}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {record.category || 'N/A'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={actionColors[record.action || ''] || "bg-gray-100"}
                    >
                      {record.action ? record.action.charAt(0).toUpperCase() + record.action.slice(1) : 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm line-clamp-2">{record.details || 'No details'}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      {record.action_date ? format(new Date(record.action_date), "yyyy-MM-dd") : 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{record.performed_by_email || 'System'}</p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={conditionColors[record.condition || ''] || "bg-gray-100"}
                    >
                      {record.condition ? record.condition.charAt(0).toUpperCase() + record.condition.slice(1) : 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewRecord(record)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

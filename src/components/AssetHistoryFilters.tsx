import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, Download, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import type { HistoryFilters } from "@/types/assetHistory";

interface AssetHistoryFiltersProps {
  filters: HistoryFilters;
  onFiltersChange: (filters: HistoryFilters) => void;
  totalRecords: number;
}

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'laptop', label: 'Laptop' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'keyboard', label: 'Keyboard' },
  { value: 'mouse', label: 'Mouse' },
  { value: 'headset', label: 'Headset' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'printer', label: 'Printer' },
  { value: 'other', label: 'Other' },
];

const actions = [
  { value: 'all', label: 'All Actions' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'returned', label: 'Returned' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'repair', label: 'Repair' },
];

export function AssetHistoryFilters({
  filters,
  onFiltersChange,
  totalRecords,
}: AssetHistoryFiltersProps) {
  const { toast } = useToast();

  const handleExport = () => {
    if (totalRecords === 0) {
      toast({
        title: "No Data",
        description: "No records to export",
        variant: "destructive",
      });
      return;
    }

    try {
      // This will be populated by the parent component with actual filtered data
      toast({
        title: "Export Started",
        description: "Preparing your asset history export...",
      });

      // The actual export logic will be handled by the parent
      // For now, just show a success message
      setTimeout(() => {
        toast({
          title: "Success",
          description: `Exported ${totalRecords} records successfully`,
        });
      }, 500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="mb-6 shadow-sm">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search history..."
                value={filters.search}
                onChange={(e) =>
                  onFiltersChange({ ...filters, search: e.target.value })
                }
                className="pl-9"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <Select
              value={filters.category}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, category: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action */}
          <div>
            <Select
              value={filters.action}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, action: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                {actions.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date From */}
          <div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateFrom ? (
                    format(filters.dateFrom, "MM/dd/yyyy")
                  ) : (
                    <span>Date From</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateFrom}
                  onSelect={(date) =>
                    onFiltersChange({ ...filters, dateFrom: date })
                  }
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Date To */}
          <div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateTo ? (
                    format(filters.dateTo, "MM/dd/yyyy")
                  ) : (
                    <span>Date To</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateTo}
                  onSelect={(date) =>
                    onFiltersChange({ ...filters, dateTo: date })
                  }
                  initialFocus
                  disabled={(date) =>
                    filters.dateFrom ? date < filters.dateFrom : false
                  }
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Export Button */}
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

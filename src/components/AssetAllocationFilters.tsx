import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Button } from "@/components/ui/button";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { AllocationFilters } from "@/hooks/useAssetAllocations";

interface AssetAllocationFiltersProps {
  filters: AllocationFilters;
  onFilterChange: (filters: AllocationFilters) => void;
}

const categories = [
  { value: "all", label: "All Categories" },
  { value: "laptop", label: "Laptop" },
  { value: "desktop", label: "Desktop" },
  { value: "monitor", label: "Monitor" },
  { value: "keyboard", label: "Keyboard" },
  { value: "mouse", label: "Mouse" },
  { value: "headset", label: "Headset" },
  { value: "printer", label: "Printer" },
  { value: "phone", label: "Phone" },
  { value: "tablet", label: "Tablet" },
  { value: "other", label: "Other" },
];

const statuses = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "returned", label: "Returned" },
];

const departments = [
  { value: "all", label: "All Departments" },
  { value: "IT", label: "IT" },
  { value: "HR", label: "HR" },
  { value: "Finance", label: "Finance" },
  { value: "Operations", label: "Operations" },
  { value: "Sales", label: "Sales" },
  { value: "Marketing", label: "Marketing" },
];

export function AssetAllocationFilters({
  filters,
  onFilterChange,
}: AssetAllocationFiltersProps) {
  return (
    <div className="bg-card border rounded-lg p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            placeholder="Asset name or employee..."
            value={filters.search}
            onChange={(e) =>
              onFilterChange({ ...filters, search: e.target.value })
            }
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={filters.category}
            onValueChange={(value) =>
              onFilterChange({ ...filters, category: value })
            }
          >
            <SelectTrigger id="category">
              <SelectValue />
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

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) =>
              onFilterChange({ ...filters, status: value })
            }
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Department */}
        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Select
            value={filters.department}
            onValueChange={(value) =>
              onFilterChange({ ...filters, department: value })
            }
          >
            <SelectTrigger id="department">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.value} value={dept.value}>
                  {dept.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div className="space-y-2">
          <Label>Date From</Label>
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
                  format(filters.dateFrom, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateFrom}
                onSelect={(date) =>
                  onFilterChange({ ...filters, dateFrom: date })
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Date To */}
        <div className="space-y-2">
          <Label>Date To</Label>
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
                  format(filters.dateTo, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateTo}
                onSelect={(date) =>
                  onFilterChange({ ...filters, dateTo: date })
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Clear Filters */}
      {(filters.search ||
        filters.category !== "all" ||
        filters.status !== "all" ||
        filters.department !== "all" ||
        filters.dateFrom ||
        filters.dateTo) && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onFilterChange({
                search: "",
                category: "all",
                status: "all",
                department: "all",
                dateFrom: undefined,
                dateTo: undefined,
              })
            }
          >
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}

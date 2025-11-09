import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useParams, useNavigate } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  MapPin,
  User,
  Wrench,
  Package,
  AlertCircle,
  ArrowLeft,
  FileDown,
} from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

interface ActivityLog {
  id: string;
  asset_id: string;
  activity_type: string;
  description: string;
  performed_by: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: any;
  created_at: string;
  performer_name?: string;
}

interface Asset {
  id: string;
  asset_name: string;
  asset_tag: string;
  category: string;
  brand: string | null;
  model: string | null;
  status: string;
  location: string | null;
  purchase_date: string | null;
  warranty_end_date: string | null;
}

interface ServiceRecord {
  id: string;
  service_type: string;
  service_date: string;
  description: string | null;
  cost: number | null;
  vendor: string | null;
  performed_by: string | null;
  performer_name?: string;
}

interface TicketRecord {
  id: string;
  ticket_id: string;
  title: string;
  issue_category: string;
  status: string;
  priority: string;
  created_at: string;
  completed_at: string | null;
}

const AssetHistory = () => {
  const { toast } = useToast();
  const { assetId } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (assetId) {
      fetchAssetData();
      logAssetView();
    }
  }, [assetId]);

  const logAssetView = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && assetId) {
        await supabase.from("user_activity_log").insert({
          user_id: user.id,
          activity_type: "asset_viewed",
          description: `Viewed asset history`,
          entity_type: "asset",
          entity_id: assetId,
        });
      }
    } catch (error) {
      console.error("Failed to log asset view:", error);
    }
  };

  const fetchAssetData = async () => {
    try {
      setLoading(true);

      // Fetch asset details
      const { data: assetData, error: assetError } = await supabase
        .from("assets")
        .select("*")
        .eq("id", assetId)
        .single();

      if (assetError) throw assetError;
      setAsset(assetData);

      // Fetch activity logs with performer names
      const { data: activitiesData, error: activitiesError } = await supabase
        .from("asset_activity_log")
        .select(`
          *,
          performer:profiles(full_name)
        `)
        .eq("asset_id", assetId)
        .order("created_at", { ascending: false });

      if (activitiesError) throw activitiesError;
      
      const enrichedActivities = activitiesData?.map((activity: any) => ({
        ...activity,
        performer_name: activity.performer?.full_name || "System",
      })) || [];
      
      setActivities(enrichedActivities);

      // Fetch service history
      const { data: serviceData, error: serviceError } = await supabase
        .from("service_history")
        .select(`
          *,
          performer:profiles(full_name)
        `)
        .eq("asset_id", assetId)
        .order("service_date", { ascending: false });

      if (serviceError) throw serviceError;
      
      const enrichedServices = serviceData?.map((service: any) => ({
        ...service,
        performer_name: service.performer?.full_name || "Unknown",
      })) || [];
      
      setServiceRecords(enrichedServices);

      // Fetch related tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from("tickets")
        .select("*")
        .eq("asset_id", assetId)
        .order("created_at", { ascending: false });

      if (ticketsError) throw ticketsError;
      setTickets(ticketsData || []);

    } catch (error: any) {
      console.error("Error fetching asset data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch asset history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, any> = {
      created: Package,
      assignment_change: User,
      status_change: AlertCircle,
      location_change: MapPin,
      service_record: Wrench,
    };
    const Icon = icons[type] || AlertCircle;
    return <Icon className="h-4 w-4" />;
  };

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      created: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      assignment_change: "bg-green-500/10 text-green-700 dark:text-green-400",
      status_change: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
      location_change: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
      service_record: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    };
    return colors[type] || "bg-muted text-muted-foreground";
  };

  const handleExport = () => {
    if (!asset) return;

    try {
      const exportData = [
        { Section: "Asset Details", Data: "" },
        { Section: "Asset Name", Data: asset.asset_name },
        { Section: "Asset Tag", Data: asset.asset_tag },
        { Section: "Category", Data: asset.category },
        { Section: "Status", Data: asset.status },
        { Section: "Location", Data: asset.location || "N/A" },
        { Section: "", Data: "" },
        { Section: "Activity History", Data: "" },
        ...activities.map((activity) => ({
          Date: format(new Date(activity.created_at), "MMM d, yyyy HH:mm"),
          Type: activity.activity_type,
          Description: activity.description,
          "Performed By": activity.performer_name,
        })),
        { Section: "", Data: "" },
        { Section: "Service Records", Data: "" },
        ...serviceRecords.map((service) => ({
          Date: format(new Date(service.service_date), "MMM d, yyyy"),
          Type: service.service_type,
          Description: service.description || "",
          Cost: service.cost ? `$${service.cost}` : "N/A",
          Vendor: service.vendor || "N/A",
        })),
      ];

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Asset History");

      const fileName = `asset_history_${asset.asset_tag}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Success",
        description: "Asset history exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  if (!assetId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">No asset ID provided</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/assets">Assets</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Asset History</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate("/assets")}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assets
          </Button>
          <h1 className="text-3xl font-bold">Asset History</h1>
        </div>
        <Button onClick={handleExport} variant="outline" size="sm">
          <FileDown className="mr-2 h-4 w-4" />
          Export History
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading asset history...</p>
        </div>
      ) : !asset ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Asset not found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Asset Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Asset Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Asset Name</p>
                  <p className="font-medium">{asset.asset_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Asset Tag</p>
                  <p className="font-medium">{asset.asset_tag}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <Badge>{asset.category}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="outline">{asset.status}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{asset.location || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Brand/Model</p>
                  <p className="font-medium">
                    {asset.brand || "N/A"} {asset.model || ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {activities.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No activity records found
                  </p>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity, index) => (
                      <div key={activity.id}>
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div
                              className={`rounded-full p-2 ${getActivityColor(
                                activity.activity_type
                              )}`}
                            >
                              {getActivityIcon(activity.activity_type)}
                            </div>
                            {index < activities.length - 1 && (
                              <div className="w-px h-full bg-border mt-2" />
                            )}
                          </div>
                          <div className="flex-1 pb-8">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{activity.description}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  By {activity.performer_name}
                                </p>
                                {activity.old_value && activity.new_value && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Changed from <Badge variant="outline" className="text-xs">{activity.old_value}</Badge> to{" "}
                                    <Badge variant="outline" className="text-xs">{activity.new_value}</Badge>
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(new Date(activity.created_at), "MMM d, yyyy HH:mm")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Service Records */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Maintenance & Service Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              {serviceRecords.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No service records found
                </p>
              ) : (
                <div className="space-y-4">
                  {serviceRecords.map((service) => (
                    <Card key={service.id} className="border-l-4 border-l-orange-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge>{service.service_type}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(service.service_date), "MMM d, yyyy")}
                              </span>
                            </div>
                            <p className="text-sm">{service.description || "No description"}</p>
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              {service.vendor && <span>Vendor: {service.vendor}</span>}
                              {service.cost && <span>Cost: ${service.cost}</span>}
                              <span>By: {service.performer_name}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Related Tickets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Related Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tickets.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No tickets found for this asset
                </p>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <Card key={ticket.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{ticket.ticket_id}</span>
                              <Badge variant="outline">{ticket.priority}</Badge>
                              <Badge>{ticket.status}</Badge>
                            </div>
                            <p className="text-sm font-medium">{ticket.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Category: {ticket.issue_category}
                            </p>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <p>{format(new Date(ticket.created_at), "MMM d, yyyy")}</p>
                            {ticket.completed_at && (
                              <p className="text-green-600">
                                Resolved: {format(new Date(ticket.completed_at), "MMM d")}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lifecycle Information */}
          {(asset.purchase_date || asset.warranty_end_date) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Lifecycle Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {asset.purchase_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Purchase Date</p>
                      <p className="font-medium">
                        {format(new Date(asset.purchase_date), "MMMM d, yyyy")}
                      </p>
                    </div>
                  )}
                  {asset.warranty_end_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Warranty End Date</p>
                      <p className="font-medium">
                        {format(new Date(asset.warranty_end_date), "MMMM d, yyyy")}
                      </p>
                      {new Date(asset.warranty_end_date) < new Date() ? (
                        <Badge variant="destructive" className="mt-1">Expired</Badge>
                      ) : (
                        <Badge variant="outline" className="mt-1">Active</Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default AssetHistory;

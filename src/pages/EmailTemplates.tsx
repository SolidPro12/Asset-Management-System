import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Plus, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EmailTemplate {
  id: string;
  template_name: string;
  subject: string;
  html_template: string;
  variables: any;
  created_at: string;
  updated_at: string;
}

interface NotificationSetting {
  id: string;
  notification_type: string;
  description: string | null;
}

export default function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [notificationTypes, setNotificationTypes] = useState<NotificationSetting[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedHtml, setEditedHtml] = useState("");
  const [editedVariables, setEditedVariables] = useState<Record<string, string>>({});
  const [newVariableKey, setNewVariableKey] = useState("");
  const [newVariableValue, setNewVariableValue] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    checkUserRole();
    loadTemplates();
    loadNotificationTypes();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    setIsSuperAdmin(roleData?.role === "super_admin");
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("template_name");

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast({
        title: "Error",
        description: "Failed to load email templates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotificationTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("email_notification_settings")
        .select("id, notification_type, description")
        .order("notification_type");

      if (error) throw error;
      setNotificationTypes(data || []);
    } catch (error) {
      console.error("Error loading notification types:", error);
    }
  };

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditedSubject(template.subject);
    setEditedHtml(template.html_template);
    setEditedVariables(template.variables || {});
  };

  const handleAddVariable = () => {
    if (!newVariableKey || !newVariableValue) {
      toast({
        title: "Error",
        description: "Please provide both key and description",
        variant: "destructive",
      });
      return;
    }

    setEditedVariables({
      ...editedVariables,
      [newVariableKey]: newVariableValue,
    });
    setNewVariableKey("");
    setNewVariableValue("");
  };

  const handleRemoveVariable = (key: string) => {
    const updated = { ...editedVariables };
    delete updated[key];
    setEditedVariables(updated);
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate || !isSuperAdmin) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("email_templates")
        .update({
          subject: editedSubject,
          html_template: editedHtml,
          variables: editedVariables,
        })
        .eq("id", selectedTemplate.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Email template updated successfully",
      });

      // Reload templates
      await loadTemplates();
      
      // Update selected template
      const updatedTemplate = templates.find(t => t.id === selectedTemplate.id);
      if (updatedTemplate) {
        setSelectedTemplate({
          ...updatedTemplate,
          subject: editedSubject,
          html_template: editedHtml,
          variables: editedVariables,
        });
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: "Failed to save email template",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTemplate = async (notificationType: string) => {
    if (!isSuperAdmin) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .insert({
          template_name: notificationType,
          subject: `${notificationType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Notification`,
          html_template: `<html>
  <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px;">
      <h1 style="color: #333;">${notificationType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h1>
      <p style="color: #666; line-height: 1.6;">This is a notification email.</p>
      <p style="color: #666; line-height: 1.6;">Add your template content here using variables like {{variable_name}}.</p>
    </div>
  </body>
</html>`,
          variables: {
            "example_variable": "Description of this variable",
          },
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Email template created successfully",
      });

      await loadTemplates();
      if (data) {
        handleSelectTemplate(data);
      }
    } catch (error) {
      console.error("Error creating template:", error);
      toast({
        title: "Error",
        description: "Failed to create email template",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            Only super administrators can manage email templates.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getAvailableNotificationTypes = () => {
    const existingTemplateNames = templates.map(t => t.template_name);
    return notificationTypes.filter(nt => !existingTemplateNames.includes(nt.notification_type));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Templates</h1>
        <p className="text-muted-foreground mt-2">
          Customize email templates for different notification types
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Templates</CardTitle>
            <CardDescription>Select a template to edit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {templates.map((template) => (
              <Button
                key={template.id}
                variant={selectedTemplate?.id === template.id ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => handleSelectTemplate(template)}
              >
                {template.template_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Button>
            ))}

            {getAvailableNotificationTypes().length > 0 && (
              <>
                <Separator className="my-4" />
                <Label className="text-sm font-medium">Create New Template</Label>
                <Select onValueChange={handleCreateTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select notification type" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableNotificationTypes().map((nt) => (
                      <SelectItem key={nt.id} value={nt.notification_type}>
                        {nt.notification_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </CardContent>
        </Card>

        {/* Template Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedTemplate 
                ? selectedTemplate.template_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                : "Select a Template"}
            </CardTitle>
            <CardDescription>
              {selectedTemplate 
                ? "Edit the email template below"
                : "Choose a template from the list to edit"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedTemplate ? (
              <>
                {/* Subject Line */}
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject Line</Label>
                  <Input
                    id="subject"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    placeholder="Email subject"
                  />
                </div>

                {/* HTML Template */}
                <div className="space-y-2">
                  <Label htmlFor="html">HTML Template</Label>
                  <Textarea
                    id="html"
                    value={editedHtml}
                    onChange={(e) => setEditedHtml(e.target.value)}
                    placeholder="HTML email template"
                    className="min-h-[300px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {`{{variable_name}}`} to insert variables defined below
                  </p>
                </div>

                {/* Variables */}
                <div className="space-y-4">
                  <div>
                    <Label>Template Variables</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Define variables that can be used in the template
                    </p>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(editedVariables).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-2 p-3 border rounded-lg">
                        <div className="flex-1 space-y-1">
                          <Badge variant="secondary" className="font-mono">
                            {`{{${key}}}`}
                          </Badge>
                          <p className="text-sm text-muted-foreground">{value}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveVariable(key)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Variable name (e.g., user_name)"
                        value={newVariableKey}
                        onChange={(e) => setNewVariableKey(e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Description"
                        value={newVariableValue}
                        onChange={(e) => setNewVariableValue(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleAddVariable} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleSaveTemplate}
                  disabled={isSaving}
                  className="w-full"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Template
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Select a template from the list to start editing
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

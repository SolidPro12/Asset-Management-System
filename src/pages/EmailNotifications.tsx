import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Settings, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface NotificationSetting {
  id: string;
  notification_type: string;
  enabled: boolean;
  description: string;
}

export default function EmailNotifications() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkUserRole();
    loadSettings();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      setIsSuperAdmin(roleData?.role === 'super_admin');
    } catch (error) {
      console.error('Error checking role:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('email_notification_settings')
        .select('*')
        .order('notification_type');

      if (error) throw error;
      setSettings(data || []);
    } catch (error: any) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    if (!isSuperAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only Super Admins can modify notification settings',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('email_notification_settings')
        .update({ enabled })
        .eq('id', id);

      if (error) throw error;

      setSettings(settings.map(s => s.id === id ? { ...s, enabled } : s));
      
      toast({
        title: 'Success',
        description: 'Notification setting updated',
      });
    } catch (error: any) {
      console.error('Error updating setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification setting',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes('welcome')) return '👋';
    if (type.includes('asset')) return '📦';
    if (type.includes('transfer')) return '🔄';
    if (type.includes('maintenance')) return '🔧';
    if (type.includes('ticket')) return '🎫';
    if (type.includes('digest')) return '📊';
    return '📧';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Email Notifications</h1>
          <p className="text-muted-foreground">
            Manage email notification preferences for the system
          </p>
        </div>

        {!isSuperAdmin && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You are viewing notification settings in read-only mode. Only Super Administrators can modify these settings.
            </AlertDescription>
          </Alert>
        )}

        <Alert className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            <strong>Note:</strong> Email notifications are logged to the database. To enable actual email delivery, configure SMTP settings in your Supabase project's Auth settings.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-1 max-w-md">
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Notification Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Notification Types</CardTitle>
                <CardDescription>
                  Enable or disable specific types of email notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings.map((setting) => (
                  <div
                    key={setting.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <span className="text-2xl">
                        {getNotificationIcon(setting.notification_type)}
                      </span>
                      <div>
                        <Label htmlFor={setting.id} className="text-base font-medium">
                          {setting.notification_type.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </Label>
                        {setting.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {setting.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <Switch
                      id={setting.id}
                      checked={setting.enabled}
                      onCheckedChange={(enabled) => handleToggle(setting.id, enabled)}
                      disabled={saving || !isSuperAdmin}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

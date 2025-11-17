import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Settings, Bell } from 'lucide-react';
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

  const handleTestDigest = async () => {
    if (!isSuperAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only Super Admins can send test digests',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.functions.invoke('send-email-digest');

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Test digest email sent successfully',
      });
    } catch (error: any) {
      console.error('Error sending test digest:', error);
      toast({
        title: 'Error',
        description: 'Failed to send test digest',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'welcome_email': return '👋';
      case 'asset_assignment': return '📦';
      case 'transfer_approval': return '🔄';
      case 'maintenance_reminder': return '🔧';
      case 'ticket_assignment': return '🎫';
      case 'email_digest': return '📊';
      default: return '📧';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Email Notifications</h1>
            <p className="text-muted-foreground mt-2">
              Manage email notification settings and preferences
            </p>
          </div>
          <Bell className="h-8 w-8 text-muted-foreground" />
        </div>

        {!isSuperAdmin && (
          <Alert>
            <AlertDescription>
              You are viewing notification settings in read-only mode. Only Super Admins can modify these settings.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="digest">
              <Mail className="h-4 w-4 mr-2" />
              Digest
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Types</CardTitle>
                <CardDescription>
                  Enable or disable specific notification types
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {settings.map((setting) => (
                  <div key={setting.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-start space-x-4 flex-1">
                      <span className="text-3xl">{getNotificationIcon(setting.notification_type)}</span>
                      <div className="flex-1">
                        <Label htmlFor={setting.id} className="text-base font-medium capitalize cursor-pointer">
                          {setting.notification_type.replace(/_/g, ' ')}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {setting.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      id={setting.id}
                      checked={setting.enabled}
                      onCheckedChange={(checked) => handleToggle(setting.id, checked)}
                      disabled={!isSuperAdmin || saving}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="digest" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Digest</CardTitle>
                <CardDescription>
                  Daily summary emails for administrators
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <h4 className="font-medium mb-2">📊 What's included in the digest:</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-4">
                      <li>• Pending transfer approvals</li>
                      <li>• Upcoming maintenance (next 7 days)</li>
                      <li>• Open support tickets</li>
                      <li>• Pending asset requests</li>
                    </ul>
                  </div>

                  <div className="p-4 border rounded-lg bg-muted/30">
                    <h4 className="font-medium mb-2">⏰ Schedule:</h4>
                    <p className="text-sm text-muted-foreground">
                      Email digests are automatically sent daily at 8:00 AM to all administrators and super administrators.
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <Button 
                      onClick={handleTestDigest}
                      disabled={!isSuperAdmin || saving}
                      className="flex-1"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Test Digest Now
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

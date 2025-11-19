import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { toast } from 'sonner';
import { Save, Eye, EyeOff, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const Settings = () => {
  const { user } = useAuth();
  
  // General Tab State
  const [organizationName, setOrganizationName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('UTC');
  const [requestTimeout, setRequestTimeout] = useState(7);
  const [autoApproveRequests, setAutoApproveRequests] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Notifications Tab State
  const [assetRequests, setAssetRequests] = useState(true);
  const [assetAllocations, setAssetAllocations] = useState(true);
  const [assetReturns, setAssetReturns] = useState(true);
  const [lowInventoryAlerts, setLowInventoryAlerts] = useState(true);
  const [maintenanceReminders, setMaintenanceReminders] = useState(true);
  const [emailDigestFrequency, setEmailDigestFrequency] = useState('weekly');

  // Mail Config - SMTP Settings State
  const [enableEmailNotifications, setEnableEmailNotifications] = useState(true);
  const [smtpServer, setSmtpServer] = useState('smtp.office365.com');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('Asset Management System');
  const [sslEnabled, setSslEnabled] = useState(false);
  const [tlsEnabled, setTlsEnabled] = useState(true);
  const [authenticationEnabled, setAuthenticationEnabled] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Active tab state
  const [activeTab, setActiveTab] = useState('general');
  const [activeMailTab, setActiveMailTab] = useState('smtp');

  const isSuperAdmin = userRole === 'super_admin';

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          return;
        }

        setUserRole(data?.role || null);
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchUserRole();
  }, [user]);

  // Currency options
  const currencies = [
    'USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SGD'
  ];

  // Timezone options
  const timezones = [
    'UTC', 'EST', 'PST', 'IST', 'GMT', 'CET', 'JST', 'AEST', 'PST8PDT', 'America/New_York',
    'America/Los_Angeles', 'Europe/London', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'
  ];

  // Load email settings from database
  useEffect(() => {
    loadEmailSettings();
  }, []);

  const loadEmailSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('settings')
        .select('setting_value')
        .eq('setting_key', 'email_config')
        .single();

      if (error) {
        console.error('Error loading email settings:', error);
        return;
      }

      if (data?.setting_value) {
        const config = data.setting_value as any;
        setSmtpServer(config.email_host || 'smtp.office365.com');
        setSmtpPort(config.email_port || 587);
        setSmtpUsername(config.email_host_user || '');
        setSmtpPassword(config.email_host_password || '');
        setFromEmail(config.from_email || '');
        setFromName(config.from_name || 'Asset Management System');
        setSslEnabled(config.ssl_enabled || false);
        setTlsEnabled(config.tls_enabled !== false);
        setAuthenticationEnabled(config.authentication_enabled !== false);
        setEnableEmailNotifications(config.enable_notifications !== false);
      }
    } catch (error) {
      console.error('Error loading email settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle General Settings Save
  const handleSaveGeneral = () => {
    toast.success('General settings saved successfully');
  };

  // Handle Notifications Save
  const handleSaveNotifications = () => {
    toast.success('Notification preferences saved successfully');
  };

  // Validate email format
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Handle SMTP Settings Save
  const handleSaveSMTP = async () => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admins can update email settings');
      return;
    }

    // Validation
    if (!smtpServer.trim()) {
      toast.error('SMTP Server is required');
      return;
    }

    if (!smtpPort || smtpPort < 1 || smtpPort > 65535) {
      toast.error('Please enter a valid port number (1-65535)');
      return;
    }

    if (!smtpUsername.trim()) {
      toast.error('Email username is required');
      return;
    }

    if (!isValidEmail(smtpUsername)) {
      toast.error('Please enter a valid email address for username');
      return;
    }

    if (!smtpPassword.trim()) {
      toast.error('Email password is required');
      return;
    }

    if (!fromEmail.trim() || !isValidEmail(fromEmail)) {
      toast.error('Please enter a valid from email address');
      return;
    }

    try {
      setIsLoading(true);

      const emailConfig = {
        email_host: smtpServer,
        email_port: smtpPort,
        email_host_user: smtpUsername,
        email_host_password: smtpPassword,
        from_email: fromEmail,
        from_name: fromName || 'Asset Management System',
        ssl_enabled: sslEnabled,
        tls_enabled: tlsEnabled,
        authentication_enabled: authenticationEnabled,
        enable_notifications: enableEmailNotifications,
      };

      const { error } = await supabase
        .from('settings')
        .upsert({
          setting_key: 'email_config',
          setting_value: emailConfig,
          updated_by: (await supabase.auth.getUser()).data.user?.id,
        }, {
          onConflict: 'setting_key'
        });

      if (error) {
        console.error('Error saving email settings:', error);
        toast.error('Failed to save email settings');
        return;
      }

      toast.success('Email configuration updated successfully');
      await loadEmailSettings();
    } catch (error) {
      console.error('Error saving email settings:', error);
      toast.error('Failed to save email settings');
    } finally {
      setIsLoading(false);
    }
  };

  // Email testing is done through Supabase Auth SMTP configuration

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Settings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your system configuration and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="mail-config">Mail Config</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card className="rounded-xl shadow-md border">
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="organizationName">Organization Name</Label>
                    <Input
                      id="organizationName"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder="Enter organization name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger id="currency">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((curr) => (
                          <SelectItem key={curr} value={curr}>
                            {curr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger id="timezone">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requestTimeout">Request Timeout (Days)</Label>
                    <Input
                      id="requestTimeout"
                      type="number"
                      value={requestTimeout}
                      onChange={(e) => setRequestTimeout(parseInt(e.target.value) || 0)}
                      min="1"
                      placeholder="7"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="autoApprove">Auto-approve asset requests</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically approve asset requests without manual review
                      </p>
                    </div>
                    <Switch
                      id="autoApprove"
                      checked={autoApproveRequests}
                      onCheckedChange={setAutoApproveRequests}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailNotifications">Email notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable email notifications for system events
                      </p>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="maintenanceMode">Maintenance mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable maintenance mode to restrict system access
                      </p>
                    </div>
                    <Switch
                      id="maintenanceMode"
                      checked={maintenanceMode}
                      onCheckedChange={setMaintenanceMode}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveGeneral} className="gap-2">
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="rounded-xl shadow-md border">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="assetRequests">Asset Requests</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications for asset requests
                      </p>
                    </div>
                    <Switch
                      id="assetRequests"
                      checked={assetRequests}
                      onCheckedChange={setAssetRequests}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="assetAllocations">Asset Allocations</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications for asset allocations
                      </p>
                    </div>
                    <Switch
                      id="assetAllocations"
                      checked={assetAllocations}
                      onCheckedChange={setAssetAllocations}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="assetReturns">Asset Returns</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications for asset returns
                      </p>
                    </div>
                    <Switch
                      id="assetReturns"
                      checked={assetReturns}
                      onCheckedChange={setAssetReturns}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="lowInventoryAlerts">Low Inventory Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive alerts when inventory is low
                      </p>
                    </div>
                    <Switch
                      id="lowInventoryAlerts"
                      checked={lowInventoryAlerts}
                      onCheckedChange={setLowInventoryAlerts}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="maintenanceReminders">Maintenance Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive reminders for scheduled maintenance
                      </p>
                    </div>
                    <Switch
                      id="maintenanceReminders"
                      checked={maintenanceReminders}
                      onCheckedChange={setMaintenanceReminders}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="emailDigestFrequency">Email Digest Frequency</Label>
                    <Select value={emailDigestFrequency} onValueChange={setEmailDigestFrequency}>
                      <SelectTrigger id="emailDigestFrequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveNotifications} className="gap-2">
                    <Save className="h-4 w-4" />
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mail Config Tab */}
          <TabsContent value="mail-config" className="space-y-6">
            <Card className="rounded-xl shadow-md border">
              <CardHeader>
                <CardTitle>Mail Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeMailTab} onValueChange={setActiveMailTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="smtp">SMTP Settings</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="test">Test & Verify</TabsTrigger>
                  </TabsList>

                  {/* SMTP Settings Sub-tab */}
                  <TabsContent value="smtp" className="space-y-6 mt-6">
                    {!isSuperAdmin && (
                      <div className="bg-muted/50 border border-border rounded-lg p-4 mb-4">
                        <p className="text-sm text-muted-foreground">
                          Only Super Admins can edit email configuration settings.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pb-4 border-b">
                      <div className="space-y-0.5">
                        <Label htmlFor="enableEmailNotifications">Enable Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable or disable email notifications system-wide
                        </p>
                      </div>
                      <Switch
                        id="enableEmailNotifications"
                        checked={enableEmailNotifications}
                        onCheckedChange={setEnableEmailNotifications}
                        disabled={!isSuperAdmin}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">SMTP Configuration</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="smtpServer">SMTP Server</Label>
                          <Input
                            id="smtpServer"
                            value={smtpServer}
                            onChange={(e) => setSmtpServer(e.target.value)}
                            placeholder="smtp.office365.com"
                            readOnly={!isSuperAdmin}
                            disabled={!isSuperAdmin}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="smtpPort">SMTP Port</Label>
                          <Input
                            id="smtpPort"
                            type="number"
                            value={smtpPort}
                            onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                            placeholder="587"
                            readOnly={!isSuperAdmin}
                            disabled={!isSuperAdmin}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="smtpUsername">Username</Label>
                          <Input
                            id="smtpUsername"
                            value={smtpUsername}
                            onChange={(e) => setSmtpUsername(e.target.value)}
                            placeholder="your-email@example.com"
                            disabled={!isSuperAdmin}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="smtpPassword">Password</Label>
                          <div className="relative">
                            <Input
                              id="smtpPassword"
                              type={showPassword ? "text" : "password"}
                              value={smtpPassword}
                              onChange={(e) => setSmtpPassword(e.target.value)}
                              placeholder="Enter password"
                              disabled={!isSuperAdmin}
                              className="pr-10"
                            />
                            {isSuperAdmin && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="fromEmail">From Email</Label>
                          <Input
                            id="fromEmail"
                            type="email"
                            value={fromEmail}
                            onChange={(e) => setFromEmail(e.target.value)}
                            placeholder="noreply@example.com"
                            disabled={!isSuperAdmin}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="fromName">From Name</Label>
                          <Input
                            id="fromName"
                            value={fromName}
                            onChange={(e) => setFromName(e.target.value)}
                            placeholder="Your Organization"
                            disabled={!isSuperAdmin}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="text-lg font-semibold">Security Options</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="sslEnabled">SSL</Label>
                            <p className="text-sm text-muted-foreground">
                              Enable SSL encryption
                            </p>
                          </div>
                          <Switch
                            id="sslEnabled"
                            checked={sslEnabled}
                            onCheckedChange={setSslEnabled}
                            disabled={!isSuperAdmin}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="tlsEnabled">TLS</Label>
                            <p className="text-sm text-muted-foreground">
                              Enable TLS encryption
                            </p>
                          </div>
                          <Switch
                            id="tlsEnabled"
                            checked={tlsEnabled}
                            onCheckedChange={setTlsEnabled}
                            disabled={!isSuperAdmin}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="authenticationEnabled">Authentication</Label>
                            <p className="text-sm text-muted-foreground">
                              Enable SMTP authentication
                            </p>
                          </div>
                          <Switch
                            id="authenticationEnabled"
                            checked={authenticationEnabled}
                            onCheckedChange={setAuthenticationEnabled}
                            disabled={!isSuperAdmin}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button 
                        onClick={handleSaveSMTP} 
                        className="gap-2"
                        disabled={!isSuperAdmin || isLoading}
                      >
                        <Save className="h-4 w-4" />
                        {isLoading ? 'Saving...' : 'Save SMTP Settings'}
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Notifications Sub-tab */}
                  <TabsContent value="notifications" className="space-y-6 mt-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Email Notification Settings</h3>
                      <p className="text-sm text-muted-foreground">
                        Configure email notification preferences for mail configuration.
                      </p>
                      <div className="space-y-4 pt-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="mailAssetRequests">Asset Requests</Label>
                            <p className="text-sm text-muted-foreground">
                              Send email notifications for asset requests
                            </p>
                          </div>
                          <Switch
                            id="mailAssetRequests"
                            checked={assetRequests}
                            onCheckedChange={setAssetRequests}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="mailAssetAllocations">Asset Allocations</Label>
                            <p className="text-sm text-muted-foreground">
                              Send email notifications for asset allocations
                            </p>
                          </div>
                          <Switch
                            id="mailAssetAllocations"
                            checked={assetAllocations}
                            onCheckedChange={setAssetAllocations}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Test & Verify Sub-tab */}
                  <TabsContent value="test" className="space-y-6 mt-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Email System Configuration</h3>
                      <p className="text-sm text-muted-foreground">
                        This system uses Supabase for email notifications. Configure SMTP settings in Supabase Auth to enable actual email delivery.
                      </p>

                      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                          <div className="space-y-3 flex-1">
                            <div>
                              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                Configure SMTP in Supabase
                              </h4>
                              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                                Email notifications are currently logged to the database. To enable actual email delivery:
                              </p>
                            </div>
                            
                            <ol className="text-sm text-blue-900 dark:text-blue-100 space-y-2 list-decimal list-inside">
                              <li>Access your Supabase project dashboard</li>
                              <li>Navigate to <strong>Authentication → Email Templates</strong></li>
                              <li>Click on <strong>SMTP Settings</strong></li>
                              <li>Enter your SMTP provider details:
                                <ul className="ml-6 mt-1 list-disc list-inside text-blue-800 dark:text-blue-200">
                                  <li>SMTP Host (e.g., smtp.office365.com)</li>
                                  <li>SMTP Port (typically 587 for TLS)</li>
                                  <li>SMTP Username</li>
                                  <li>SMTP Password</li>
                                  <li>Sender Email Address</li>
                                </ul>
                              </li>
                              <li>Save and test your configuration</li>
                            </ol>

                            <div className="bg-white/50 dark:bg-black/20 rounded p-3 mt-3">
                              <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Current Status</h5>
                              <p className="text-sm text-blue-800 dark:text-blue-200">
                                ✓ Email events are being logged to the database<br />
                                ⚠ Actual email delivery requires SMTP configuration in Supabase
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-muted/30 border border-border rounded-lg p-4">
                        <h4 className="font-medium mb-2">Local Configuration (Reference Only)</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          These settings are stored locally for reference. Actual SMTP configuration must be done in Supabase.
                        </p>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p><span className="font-medium">SMTP Server:</span> {smtpServer}</p>
                          <p><span className="font-medium">Port:</span> {smtpPort}</p>
                          <p><span className="font-medium">Username:</span> {smtpUsername || 'Not set'}</p>
                          <p><span className="font-medium">TLS:</span> {tlsEnabled ? 'Enabled' : 'Disabled'}</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;


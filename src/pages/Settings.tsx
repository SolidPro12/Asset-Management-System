import { useState } from 'react';
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
import { Save } from 'lucide-react';

const Settings = () => {
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
  const [smtpServer, setSmtpServer] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [sslEnabled, setSslEnabled] = useState(false);
  const [tlsEnabled, setTlsEnabled] = useState(true);
  const [authenticationEnabled, setAuthenticationEnabled] = useState(true);

  // Active tab state
  const [activeTab, setActiveTab] = useState('general');
  const [activeMailTab, setActiveMailTab] = useState('smtp');

  // Currency options
  const currencies = [
    'USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SGD'
  ];

  // Timezone options
  const timezones = [
    'UTC', 'EST', 'PST', 'IST', 'GMT', 'CET', 'JST', 'AEST', 'PST8PDT', 'America/New_York',
    'America/Los_Angeles', 'Europe/London', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'
  ];

  // Handle General Settings Save
  const handleSaveGeneral = () => {
    // Placeholder - no backend integration
    toast.success('General settings saved successfully');
  };

  // Handle Notifications Save
  const handleSaveNotifications = () => {
    // Placeholder - no backend integration
    toast.success('Notification preferences saved successfully');
  };

  // Handle SMTP Settings Save
  const handleSaveSMTP = () => {
    // Placeholder - no backend integration
    toast.success('SMTP settings saved successfully');
  };

  // Handle Test Email
  const handleTestEmail = () => {
    // Placeholder - no backend integration
    toast.success('Test email sent successfully');
  };

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
                            placeholder="smtp.example.com"
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
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="smtpUsername">Username</Label>
                          <Input
                            id="smtpUsername"
                            value={smtpUsername}
                            onChange={(e) => setSmtpUsername(e.target.value)}
                            placeholder="your-email@example.com"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="smtpPassword">Password</Label>
                          <Input
                            id="smtpPassword"
                            type="password"
                            value={smtpPassword}
                            onChange={(e) => setSmtpPassword(e.target.value)}
                            placeholder="Enter password"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="fromEmail">From Email</Label>
                          <Input
                            id="fromEmail"
                            type="email"
                            value={fromEmail}
                            onChange={(e) => setFromEmail(e.target.value)}
                            placeholder="noreply@example.com"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="fromName">From Name</Label>
                          <Input
                            id="fromName"
                            value={fromName}
                            onChange={(e) => setFromName(e.target.value)}
                            placeholder="Your Organization"
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
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button onClick={handleSaveSMTP} className="gap-2">
                        <Save className="h-4 w-4" />
                        Save SMTP Settings
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
                      <h3 className="text-lg font-semibold">Test Email Configuration</h3>
                      <p className="text-sm text-muted-foreground">
                        Test your SMTP configuration by sending a test email.
                      </p>

                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label htmlFor="testEmail">Test Email Address</Label>
                          <Input
                            id="testEmail"
                            type="email"
                            placeholder="test@example.com"
                          />
                        </div>

                        <div className="flex items-center gap-4">
                          <Button onClick={handleTestEmail} variant="default">
                            Send Test Email
                          </Button>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-muted"></div>
                            <span className="text-sm text-muted-foreground">
                              Status: Not tested
                            </span>
                          </div>
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


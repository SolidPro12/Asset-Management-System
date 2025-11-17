import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Mail, RefreshCw, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

interface EmailLog {
  id: string;
  notification_type: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  status: string;
  error_message: string | null;
  metadata: any;
  sent_at: string;
}

export default function EmailLogs() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (typeFilter !== 'all') {
        query = query.eq('notification_type', typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error('Error loading email logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (log: EmailLog) => {
    toast({
      title: 'Info',
      description: 'Resend functionality will be available in the next update',
    });
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Email Logs</h1>
            <p className="text-muted-foreground mt-2">
              Track and monitor all email notifications sent from the system
            </p>
          </div>
          <Button onClick={loadLogs} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email History
            </CardTitle>
            <CardDescription>
              View details of all emails sent by the system (last 100 records)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by recipient or subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="welcome_email">Welcome Email</SelectItem>
                    <SelectItem value="asset_assignment">Asset Assignment</SelectItem>
                    <SelectItem value="transfer_approval">Transfer Approval</SelectItem>
                    <SelectItem value="maintenance_reminder">Maintenance Reminder</SelectItem>
                    <SelectItem value="ticket_assignment">Ticket Assignment</SelectItem>
                    <SelectItem value="email_digest">Email Digest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No email logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getTypeIcon(log.notification_type)}</span>
                              <span className="text-sm capitalize">
                                {log.notification_type.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{log.recipient_name || 'N/A'}</div>
                              <div className="text-sm text-muted-foreground">{log.recipient_email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate" title={log.subject}>
                              {log.subject}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {getStatusBadge(log.status)}
                              {log.status === 'failed' && log.error_message && (
                                <div className="text-xs text-destructive max-w-xs truncate" title={log.error_message}>
                                  {log.error_message}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(log.sent_at), 'MMM dd, yyyy')}
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(log.sent_at), 'hh:mm a')}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {log.status === 'failed' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleResend(log)}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Resend
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {logs.filter(l => l.status === 'sent').length}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Sent Successfully</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600">
                        {logs.filter(l => l.status === 'failed').length}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Failed</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {logs.length}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Total Emails</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

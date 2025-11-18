import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users as UsersIcon, Shield, Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DEPARTMENTS } from '@/lib/constants';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  phone: string | null;
  employee_id: string;
  created_at: string;
  is_active: boolean | null;
  user_roles: { role: string }[];
}

const Users = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', email: '', department: '', phone: '', employee_id: '', role: 'user' });
  const [addForm, setAddForm] = useState({ full_name: '', email: '', password: '', confirm_password: '', department: '', phone: '', employee_id: '', role: 'user' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
  const { user } = useAuth();
  const { toast } = useToast();
  const sortedDepartments = [...DEPARTMENTS].sort((a, b) => a.localeCompare(b));

  useEffect(() => { if (user) { checkUserRole(); fetchUsers(); } }, [user]);

  const checkUserRole = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
    setUserRole(data?.role || null);
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase.from('profiles').select('*').order('full_name');
      if (error) throw error;
      const usersWithRoles = await Promise.all((profiles || []).map(async (profile) => {
        const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', profile.id);
        return { ...profile, employee_id: profile.employee_id, user_roles: roles || [] };
      }));
      setUsers(usersWithRoles);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to load users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive';
      case 'admin': return 'default';
      case 'financer': return 'secondary';
      case 'hr': return 'outline';
      case 'department_head': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'financer': return 'Finance';
      case 'hr': return 'HR';
      case 'department_head': return 'Department Head';
      default: return 'User';
    }
  };

  const handleEditUser = (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    setEditForm({ full_name: userProfile.full_name, email: userProfile.email, department: userProfile.department || '', phone: userProfile.phone || '', employee_id: userProfile.employee_id || '', role: userProfile.user_roles?.[0]?.role || 'user' });
    setEditFormErrors({});
    setEditDialogOpen(true);
  };

  const validateEditForm = () => {
    const errors: Record<string, string> = {};
    if (!editForm.full_name.trim() || editForm.full_name.trim().length < 2) errors.full_name = 'Name must be at least 2 characters';
    const employeeIdTrimmed = (editForm.employee_id || '').trim();
    if (!employeeIdTrimmed) errors.employee_id = 'Employee ID is required';
    else if (employeeIdTrimmed.length !== 7 || !/^[0-9]+$/.test(employeeIdTrimmed)) errors.employee_id = 'Employee ID must be exactly 7 digits';
    const phoneDigits = (editForm.phone || '').replace(/\D/g, '');
    if (phoneDigits && phoneDigits.length !== 10) errors.phone = 'Phone must be exactly 10 digits';
    if (!editForm.department) errors.department = 'Department is required';
    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveEditUser = async () => {
    if (!selectedUser || !validateEditForm()) { setSavingEdit(false); return; }
    try {
      setSavingEdit(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast({ title: 'Error', description: 'You must be logged in', variant: 'destructive' }); setSavingEdit(false); return; }
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-user`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedUser.id, email: editForm.email, full_name: editForm.full_name, employee_id: editForm.employee_id?.trim() || null, department: editForm.department || null, phone: editForm.phone || null, role: editForm.role })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update user');
      toast({ title: 'Success', description: 'User updated successfully' });
      setEditDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update user', variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddUser = async () => {
    if (savingAdd) return;
    try {
      setSavingAdd(true);
      const nameTrimmed = (addForm.full_name || '').trim();
      if (!nameTrimmed || !/^[A-Za-z ]+$/.test(nameTrimmed) || nameTrimmed.length > 25) { toast({ title: 'Invalid name', variant: 'destructive' }); setSavingAdd(false); return; }
      const phoneDigits = (addForm.phone || '').replace(/\D/g, '');
      if (phoneDigits && phoneDigits.length !== 10) { toast({ title: 'Invalid phone', variant: 'destructive' }); setSavingAdd(false); return; }
      const normalizedEmployeeId = (addForm.employee_id || '').trim();
      if (!normalizedEmployeeId || normalizedEmployeeId.length !== 7 || !/^[0-9]+$/.test(normalizedEmployeeId)) { toast({ title: 'Invalid Employee ID', variant: 'destructive' }); setSavingAdd(false); return; }
      const emailLower = addForm.email.trim().toLowerCase();
      if (!emailLower || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) { toast({ title: 'Invalid email', variant: 'destructive' }); setSavingAdd(false); return; }
      if (!addForm.department) { toast({ title: 'Department required', variant: 'destructive' }); setSavingAdd(false); return; }
      const pwd = addForm.password;
      if (!pwd || pwd.length < 8 || !/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/[0-9]/.test(pwd) || !/[^A-Za-z0-9]/.test(pwd)) { toast({ title: 'Weak password', description: 'Must have 8+ chars with uppercase, lowercase, number, and special character', variant: 'destructive' }); setSavingAdd(false); return; }
      if (pwd !== addForm.confirm_password) { toast({ title: 'Passwords do not match', variant: 'destructive' }); setSavingAdd(false); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast({ title: 'Error', description: 'You must be logged in', variant: 'destructive' }); setSavingAdd(false); return; }
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLower, password: pwd, full_name: nameTrimmed, employee_id: normalizedEmployeeId, department: addForm.department, phone: phoneDigits || null, role: addForm.role })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create user');
      toast({ title: 'Success', description: 'User created successfully' });
      setAddForm({ full_name: '', email: '', password: '', confirm_password: '', department: '', phone: '', employee_id: '', role: 'user' });
      setAddDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to add user', variant: 'destructive' });
    } finally {
      setSavingAdd(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      setDeletingUser(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast({ title: 'Error', description: 'You must be logged in', variant: 'destructive' }); setDeletingUser(false); return; }
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedUser.id })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete user');
      toast({ title: 'Success', description: `User ${selectedUser.full_name} deleted` });
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete user', variant: 'destructive' });
    } finally {
      setDeletingUser(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (userRole !== 'super_admin') return <div className="flex flex-col items-center justify-center min-h-screen p-6"><Shield className="h-16 w-16 text-destructive mb-4" /><h1 className="text-2xl font-bold mb-2">Access Denied</h1></div>;

  const activeUsers = users.filter(u => u.is_active !== false);

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>User Management</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
      <div className="flex items-center justify-between"><div><h1 className="text-3xl font-bold">User Management</h1><p className="text-muted-foreground">Manage user accounts</p></div><Button onClick={() => setAddDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add User</Button></div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><UsersIcon className="h-5 w-5" />All Users</CardTitle><CardDescription>Total: {activeUsers.length} users</CardDescription></CardHeader>
        <CardContent><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Employee ID</TableHead><TableHead>Department</TableHead><TableHead>Phone</TableHead><TableHead>Role</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>{activeUsers.map((u) => (<TableRow key={u.id}><TableCell className="font-medium">{u.full_name}</TableCell><TableCell>{u.email}</TableCell><TableCell>{u.employee_id || '-'}</TableCell><TableCell>{u.department || '-'}</TableCell><TableCell>{u.phone || '-'}</TableCell>
                  <TableCell><Badge variant={getRoleBadgeVariant(u.user_roles?.[0]?.role || 'user')}>{getRoleDisplayName(u.user_roles?.[0]?.role || 'user')}</Badge></TableCell><TableCell>{format(new Date(u.created_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm">Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleEditUser(u)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem><DropdownMenuItem onClick={() => { setSelectedUser(u); setDeleteDialogOpen(true); }} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Full Name *</Label><Input value={addForm.full_name} onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })} /></div><div className="space-y-2"><Label>Employee ID *</Label><Input value={addForm.employee_id} onChange={(e) => setAddForm({ ...addForm, employee_id: e.target.value })} /></div></div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Password *</Label><Input type="password" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} /></div><div className="space-y-2"><Label>Confirm Password *</Label><Input type="password" value={addForm.confirm_password} onChange={(e) => setAddForm({ ...addForm, confirm_password: e.target.value })} /></div></div>
            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Department *</Label><Select value={addForm.department} onValueChange={(v) => setAddForm({ ...addForm, department: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{sortedDepartments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Phone</Label><Input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} /></div></div>
            <div className="space-y-2"><Label>Role *</Label><Select value={addForm.role} onValueChange={(v) => setAddForm({ ...addForm, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="user">User</SelectItem><SelectItem value="hr">HR</SelectItem><SelectItem value="financer">Finance</SelectItem><SelectItem value="department_head">Department Head</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="super_admin">Super Admin</SelectItem></SelectContent></Select></div>
          </div><DialogFooter><Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button><Button onClick={handleAddUser} disabled={savingAdd}>{savingAdd ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create User'}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Full Name *</Label><Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />{editFormErrors.full_name && <p className="text-sm text-destructive">{editFormErrors.full_name}</p>}</div><div className="space-y-2"><Label>Employee ID *</Label><Input value={editForm.employee_id} onChange={(e) => setEditForm({ ...editForm, employee_id: e.target.value })} />{editFormErrors.employee_id && <p className="text-sm text-destructive">{editFormErrors.employee_id}</p>}</div></div>
            <div className="space-y-2"><Label>Email (read-only)</Label><Input value={editForm.email} disabled /></div>
            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Department *</Label><Select value={editForm.department} onValueChange={(v) => setEditForm({ ...editForm, department: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{sortedDepartments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>{editFormErrors.department && <p className="text-sm text-destructive">{editFormErrors.department}</p>}</div><div className="space-y-2"><Label>Phone</Label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />{editFormErrors.phone && <p className="text-sm text-destructive">{editFormErrors.phone}</p>}</div></div>
            <div className="space-y-2"><Label>Role *</Label><Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="user">User</SelectItem><SelectItem value="hr">HR</SelectItem><SelectItem value="financer">Finance</SelectItem><SelectItem value="department_head">Department Head</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="super_admin">Super Admin</SelectItem></SelectContent></Select></div>
          </div><DialogFooter><Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button><Button onClick={saveEditUser} disabled={savingEdit}>{savingEdit ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}</Button></DialogFooter></DialogContent></Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete User</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete <strong>{selectedUser?.full_name}</strong>? This will permanently remove their account.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteUser} disabled={deletingUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{deletingUser ? 'Deleting...' : 'Delete User'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
};

export default Users;

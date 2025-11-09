import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users as UsersIcon, Shield, Loader2, Plus, Pencil, Trash2, Upload, Download, X, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DEPARTMENTS } from '@/lib/constants';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  phone: string | null;
  employee_id: string;
  created_at: string;
  user_roles: { role: string }[];
}

interface ImportUserRow {
  employee_id: string;
  full_name: string;
  email: string;
  password: string;
  department: string;
  phone: string;
  role: string;
  rowNumber: number;
  errors: string[];
  isValid: boolean;
}

const Users = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [importData, setImportData] = useState<ImportUserRow[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    department: '',
    phone: '',
    employee_id: '',
    role: 'user'
  });
  const [addForm, setAddForm] = useState({
    full_name: '',
    email: '',
    password: '',
    department: '',
    phone: '',
    employee_id: '',
    role: 'user'
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const sortedDepartments = [...DEPARTMENTS].sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    if (user) {
      checkUserRole();
      fetchUsers();
    }
  }, [user]);

  const checkUserRole = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    setUserRole(data?.role || null);
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;

      // Fetch roles separately for each user
      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);
          
          return {
            ...profile,
            employee_id: profile.employee_id,
            user_roles: roles || []
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      // Use secure database function with server-side validation
      const { error } = await supabase.rpc('update_user_role', {
        target_user_id: userId,
        new_role: newRole as any
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User role updated successfully',
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user role',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'financer':
        return 'secondary';
      case 'hr':
        return 'outline';
      case 'department_head':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'financer':
        return 'Finance Admin';
      case 'hr':
        return 'HR';
      case 'department_head':
        return 'Department Head';
      default:
        return 'User';
    }
  };

  const handleEditUser = (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    setEditForm({
      full_name: userProfile.full_name,
      email: userProfile.email,
      department: userProfile.department || '',
      phone: userProfile.phone || '',
      employee_id: userProfile.employee_id || '',
      role: userProfile.user_roles?.[0]?.role || 'user'
    });
    setEditDialogOpen(true);
  };

  const handleDeleteUser = (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('delete-user', {
        body: { userId: selectedUser.id },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });

      setDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const saveEditUser = async () => {
    if (!selectedUser) return;

    try {
      const nameTrimmed = (editForm.full_name || '').trim();
      if (!nameTrimmed || !/^[A-Za-z ]+$/.test(nameTrimmed) || nameTrimmed.length > 25) {
        toast({ title: 'Invalid name', description: 'Name must be letters and spaces only, max 25 characters', variant: 'destructive' });
        return;
      }
      if (!editForm.employee_id) {
        toast({ title: 'Employee ID required', description: 'Please enter employee ID', variant: 'destructive' });
        return;
      }
      const phoneDigits = (editForm.phone || '').replace(/\D/g, '');
      if (phoneDigits && phoneDigits.length !== 10) {
        toast({ title: 'Invalid phone', description: 'Phone must be exactly 10 digits', variant: 'destructive' });
        return;
      }

      // Validate department head assignment
      if (editForm.role === 'department_head') {
        if (!editForm.department) {
          toast({ 
            title: 'Department Required', 
            description: 'Please select a department for the department head', 
            variant: 'destructive' 
          });
          return;
        }

        // Check if another user is already department head for this department
        const { data: existingHeads } = await supabase
          .from('profiles')
          .select('id, full_name, user_roles!inner(role)')
          .eq('department', editForm.department)
          .eq('user_roles.role', 'department_head')
          .neq('id', selectedUser.id);

        if (existingHeads && existingHeads.length > 0) {
          toast({ 
            title: 'Department Head Exists', 
            description: `${existingHeads[0].full_name} is already the department head for ${editForm.department}`, 
            variant: 'destructive' 
          });
          return;
        }
      }

      const normalizedDepartment = editForm.department && editForm.department.trim() ? editForm.department.trim() : null;
      const normalizedEmployeeId = editForm.employee_id ? editForm.employee_id.trim().toUpperCase() : '';

      const updatePayload = {
        full_name: nameTrimmed,
        department: normalizedDepartment,
        phone: phoneDigits || null,
        is_department_head: editForm.role === 'department_head',
        employee_id: normalizedEmployeeId
      };
      // Skip update if no changes
      const oldDept = selectedUser.department || null;
      const oldEmpId = selectedUser.employee_id || '';
      if (
        nameTrimmed === selectedUser.full_name &&
        normalizedDepartment === oldDept &&
        phoneDigits === (selectedUser.phone || '') &&
        normalizedEmployeeId === oldEmpId &&
        (editForm.role === selectedUser.user_roles?.[0]?.role)
      ) {
        toast({ title: 'No Changes', description: 'No changes to save.', variant: 'default' });
        return;
      }
      const { error: profileError } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', selectedUser.id);

      if (profileError) {
        let userMsg = profileError.message;
        if (profileError.code === '23505') userMsg = 'Employee ID must be unique.'; // Postgres duplicate error
        toast({
          title: 'Error',
          description: userMsg || 'Failed to update user',
          variant: 'destructive',
        });
        return;
      }

      // Update role if changed
      if (editForm.role !== selectedUser.user_roles?.[0]?.role) {
        await updateUserRole(selectedUser.id, editForm.role);
      }

      toast({
        title: 'Success',
        description: 'User updated successfully',
      });

      setEditDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    }
  };

  const handleAddUser = async () => {
    // Preserve current admin session so we can restore it after creating the user
    const { data: orig } = await supabase.auth.getSession();
    const originalSession = orig?.session;

    try {
      const nameTrimmed = (addForm.full_name || '').trim();
      if (!nameTrimmed || !/^[A-Za-z ]+$/.test(nameTrimmed) || nameTrimmed.length > 25) {
        toast({ title: 'Invalid name', description: 'Name must be letters and spaces only, max 25 characters', variant: 'destructive' });
        return;
      }
      const phoneDigits = (addForm.phone || '').replace(/\D/g, '');
      if (phoneDigits && phoneDigits.length !== 10) {
        toast({ title: 'Invalid phone', description: 'Phone must be exactly 10 digits', variant: 'destructive' });
        return;
      }
      if (!addForm.employee_id) {
        toast({ title: 'Employee ID required', description: 'Please enter employee ID', variant: 'destructive' });
        return;
      }

      // Validate department head assignment
      if (addForm.role === 'department_head') {
        if (!addForm.department) {
          toast({ 
            title: 'Department Required', 
            description: 'Please select a department for the department head', 
            variant: 'destructive' 
          });
          return;
        }

        // Check if another user is already department head for this department
        const { data: existingHeads } = await supabase
          .from('profiles')
          .select('id, full_name, user_roles!inner(role)')
          .eq('department', addForm.department)
          .eq('user_roles.role', 'department_head');

        if (existingHeads && existingHeads.length > 0) {
          toast({ 
            title: 'Department Head Exists', 
            description: `${existingHeads[0].full_name} is already the department head for ${addForm.department}`, 
            variant: 'destructive' 
          });
          return;
        }
      }

      // Create user via Supabase Auth (this may switch the session to the new user)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: addForm.email,
        password: addForm.password,
        options: {
          data: {
            full_name: nameTrimmed,
            department: addForm.department,
            phone: phoneDigits,
            employee_id: addForm.employee_id
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Wait a moment for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update profile details with department, phone, employee_id
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            department: addForm.department || null,
            phone: phoneDigits || null,
            is_department_head: addForm.role === 'department_head',
            employee_id: addForm.employee_id
          })
          .eq('id', authData.user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
          let userMsg = profileError.message;
          if (profileError.code === '23505') userMsg = 'Employee ID must be unique.'; // Postgres duplicate error
          // Don't throw - profile was created, just department update failed
          toast({
            title: 'Error',
            description: userMsg || 'Failed to create user',
            variant: 'destructive',
          });
          return;
        }

        // Assign role if different from default
        if (addForm.role !== 'user') {
          await updateUserRole(authData.user.id, addForm.role);
        }
      }

      // Restore original admin session (prevents auto-login as the new user)
      if (originalSession?.access_token && originalSession.refresh_token) {
        await supabase.auth.setSession({
          access_token: originalSession.access_token,
          refresh_token: originalSession.refresh_token,
        });
      }

      toast({
        title: 'Success',
        description: 'User created successfully',
      });

      setAddDialogOpen(false);
      setAddForm({
        full_name: '',
        email: '',
        password: '',
        department: '',
        phone: '',
        employee_id: '',
        role: 'user'
      });
      fetchUsers();
    } catch (error: any) {
      // Attempt to restore original session on error as well
      if (originalSession?.access_token && originalSession.refresh_token) {
        try {
          await supabase.auth.setSession({
            access_token: originalSession.access_token,
            refresh_token: originalSession.refresh_token,
          });
        } catch {}
      }

      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Validation function for imported user data
  const validateImportRow = (row: any, rowNumber: number, existingEmployeeIds: Set<string>, existingEmails: Set<string>): ImportUserRow => {
    const errors: string[] = [];
    
    const employeeId = (row['employee_id'] || row['Employee ID'] || '').toString().trim().toUpperCase();
    const fullName = (row['full_name'] || row['Full Name'] || row['Name'] || '').toString().trim();
    const email = (row['email'] || row['Email'] || '').toString().trim().toLowerCase();
    const password = (row['password'] || row['Password'] || '').toString();
    const department = (row['department'] || row['Department'] || '').toString().trim();
    const phone = (row['phone'] || row['Phone'] || '').toString().trim();
    const role = (row['role'] || row['Role'] || 'user').toString().trim().toLowerCase();

    // Required field validations
    if (!employeeId) {
      errors.push('Employee ID is required');
    } else if (employeeId.length > 25) {
      errors.push('Employee ID must be 25 characters or less');
    } else if (!/^[A-Za-z0-9_-]+$/.test(employeeId)) {
      errors.push('Employee ID can only contain letters, numbers, hyphens, and underscores');
    } else if (existingEmployeeIds.has(employeeId)) {
      errors.push('Employee ID already exists in file');
    }

    if (!fullName) {
      errors.push('Full Name is required');
    } else if (!/^[A-Za-z ]+$/.test(fullName)) {
      errors.push('Full Name must contain only letters and spaces');
    } else if (fullName.length > 25) {
      errors.push('Full Name must be 25 characters or less');
    }

    if (!email) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Invalid email format');
    } else if (existingEmails.has(email)) {
      errors.push('Email already exists in file');
    }

    if (!password) {
      errors.push('Password is required');
    } else if (password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }

    // Optional field validations
    if (phone) {
      const phoneDigits = phone.replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        errors.push('Phone must be exactly 10 digits');
      }
    }

    const validRoles = ['user', 'hr', 'admin', 'super_admin', 'financer', 'department_head'];
    if (!validRoles.includes(role)) {
      errors.push(`Role must be one of: ${validRoles.join(', ')}`);
    }

    if (role === 'department_head' && !department) {
      errors.push('Department is required for department head role');
    }

    if (department && !DEPARTMENTS.includes(department)) {
      errors.push(`Department must be one of: ${DEPARTMENTS.join(', ')}`);
    }

    return {
      employee_id: employeeId,
      full_name: fullName,
      email: email,
      password: password,
      department: department,
      phone: phone,
      role: role,
      rowNumber: rowNumber,
      errors: errors,
      isValid: errors.length === 0
    };
  };

  // File upload and parsing handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload a CSV or XLSX file',
        variant: 'destructive',
      });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          let jsonData: any[] = [];

          if (fileExtension === 'csv') {
            // Parse CSV
            const workbook = XLSX.read(data, { type: 'binary', sheetRows: 0 });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            jsonData = XLSX.utils.sheet_to_json(worksheet);
          } else {
            // Parse XLSX
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            jsonData = XLSX.utils.sheet_to_json(worksheet);
          }

          if (jsonData.length === 0) {
            toast({
              title: 'Empty File',
              description: 'The uploaded file contains no data',
              variant: 'destructive',
            });
            return;
          }

          // Check for existing employee IDs and emails in file
          const existingEmployeeIds = new Set<string>();
          const existingEmails = new Set<string>();
          
          // Validate and prepare import data
          const validatedData: ImportUserRow[] = jsonData.map((row, index) => {
            const employeeId = (row['employee_id'] || row['Employee ID'] || '').toString().trim().toUpperCase();
            const email = (row['email'] || row['Email'] || '').toString().trim().toLowerCase();
            
            if (employeeId) existingEmployeeIds.add(employeeId);
            if (email) existingEmails.add(email);
            
            return validateImportRow(row, index + 2, new Set(), new Set()); // +2 because Excel rows start at 2 (header + 1)
          });

          // Re-validate with all employee IDs and emails from file
          const finalValidatedData: ImportUserRow[] = validatedData.map((row, index) => {
            const allEmployeeIds = new Set(validatedData.map(r => r.employee_id).filter(Boolean));
            const allEmails = new Set(validatedData.map(r => r.email).filter(Boolean));
            allEmployeeIds.delete(row.employee_id);
            allEmails.delete(row.email);
            return validateImportRow(jsonData[index], index + 2, allEmployeeIds, allEmails);
          });

          // Check against database for existing employee IDs and emails
          const existingEmployeeIdsInDb = new Set<string>();
          const existingEmailsInDb = new Set<string>();

          try {
            const { data: existingProfiles } = await supabase
              .from('profiles')
              .select('employee_id, email')
              .not('employee_id', 'is', null);

            existingProfiles?.forEach(profile => {
              if (profile.employee_id) existingEmployeeIdsInDb.add(profile.employee_id.toUpperCase());
              if (profile.email) existingEmailsInDb.add(profile.email.toLowerCase());
            });
          } catch (error) {
            console.error('Error checking existing users:', error);
          }

          // Add database duplicate errors
          const finalDataWithDbCheck: ImportUserRow[] = finalValidatedData.map(row => {
            const errors = [...row.errors];
            
            if (row.employee_id && existingEmployeeIdsInDb.has(row.employee_id)) {
              errors.push('Employee ID already exists in database');
            }
            
            if (row.email && existingEmailsInDb.has(row.email)) {
              errors.push('Email already exists in database');
            }

            return {
              ...row,
              errors: errors,
              isValid: errors.length === 0
            };
          });

          setImportData(finalDataWithDbCheck);
          setImportPreviewOpen(true);
        } catch (error: any) {
          toast({
            title: 'Parse Error',
            description: error.message || 'Failed to parse file',
            variant: 'destructive',
          });
        }
      };

      if (fileExtension === 'csv') {
        reader.readAsBinaryString(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to read file',
        variant: 'destructive',
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Bulk import handler
  const handleBulkImport = async () => {
    const validRows = importData.filter(row => row.isValid);
    
    if (validRows.length === 0) {
      toast({
        title: 'No Valid Data',
        description: 'Please fix the errors before importing',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    const { data: orig } = await supabase.auth.getSession();
    const originalSession = orig?.session;

    let successCount = 0;
    let failCount = 0;
    const failedRows: { row: number; error: string }[] = [];

    try {
      for (const row of validRows) {
        try {
          // Create user via Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: row.email,
            password: row.password,
            options: {
              data: {
                full_name: row.full_name,
                department: row.department || null,
                phone: row.phone || null,
                employee_id: row.employee_id
              }
            }
          });

          if (authError) {
            failCount++;
            failedRows.push({ row: row.rowNumber, error: authError.message });
            continue;
          }

          if (authData.user) {
            // Wait for profile creation
            await new Promise(resolve => setTimeout(resolve, 500));

            // Update profile with employee_id, department, phone
            const phoneDigits = row.phone ? row.phone.replace(/\D/g, '') : null;
            const { error: profileError } = await supabase
              .from('profiles')
              .update({
                department: row.department || null,
                phone: phoneDigits || null,
                is_department_head: row.role === 'department_head',
                employee_id: row.employee_id
              })
              .eq('id', authData.user.id);

            if (profileError) {
              failCount++;
              failedRows.push({ row: row.rowNumber, error: profileError.message });
              continue;
            }

            // Assign role if different from default
            if (row.role !== 'user') {
              await updateUserRole(authData.user.id, row.role);
            }

            successCount++;
          }
        } catch (error: any) {
          failCount++;
          failedRows.push({ row: row.rowNumber, error: error.message || 'Unknown error' });
        }
      }

      // Restore original session
      if (originalSession?.access_token && originalSession.refresh_token) {
        await supabase.auth.setSession({
          access_token: originalSession.access_token,
          refresh_token: originalSession.refresh_token,
        });
      }

      // Show summary
      toast({
        title: 'Import Complete',
        description: `${successCount} users imported successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
        variant: failCount > 0 ? 'default' : 'default',
      });

      if (failedRows.length > 0) {
        console.error('Failed rows:', failedRows);
      }

      setImportPreviewOpen(false);
      setImportData([]);
      fetchUsers();
    } catch (error: any) {
      // Restore session on error
      if (originalSession?.access_token && originalSession.refresh_token) {
        try {
          await supabase.auth.setSession({
            access_token: originalSession.access_token,
            refresh_token: originalSession.refresh_token,
          });
        } catch {}
      }

      toast({
        title: 'Import Error',
        description: error.message || 'Failed to import users',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  // Export functionality
  const handleExport = (exportFormat: 'csv' | 'xlsx') => {
    try {
      if (users.length === 0) {
        toast({
          title: 'No Users',
          description: 'There are no users to export',
          variant: 'destructive',
        });
        return;
      }

      const exportData = users.map(user => ({
        'Employee ID': user.employee_id || '',
        'Full Name': user.full_name,
        'Email': user.email,
        'Department': user.department || '',
        'Phone': user.phone || '',
        'Role': getRoleDisplayName(user.user_roles?.[0]?.role || 'user'),
        'Created At': format(new Date(user.created_at), 'yyyy-MM-dd')
      }));

      const fileName = `User_List_${format(new Date(), 'yyyy-MM-dd')}`;

      if (exportFormat === 'csv') {
        // Generate CSV
        const headers = Object.keys(exportData[0] || {});
        const csvRows = [
          headers.join(','),
          ...exportData.map(row => headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(','))
        ];
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${fileName}.csv`;
        link.click();
      } else {
        // Generate XLSX
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
      }

      toast({
        title: 'Export Successful',
        description: `Users exported as ${exportFormat.toUpperCase()}`,
      });
    } catch (error: any) {
      toast({
        title: 'Export Error',
        description: error.message || 'Failed to export users',
        variant: 'destructive',
      });
    }
  };

  if (userRole !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to access this page. Only Super Admins can manage users.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>User Management</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <UsersIcon className="h-8 w-8" />
            User Management
          </h2>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.xlsx,.xls"
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Users
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Users
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                Export as XLSX
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {users.map((userProfile) => (
              <div key={userProfile.id} className="p-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-foreground">{userProfile.full_name}</h3>
                      <Badge variant={getRoleBadgeVariant(userProfile.user_roles?.[0]?.role || 'user')}>
                        {getRoleDisplayName(userProfile.user_roles?.[0]?.role || 'user')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">active</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {userProfile.email} • {userProfile.department || 'No Department'} • Last login: {formatDate(userProfile.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm w-[110px]">{userProfile.employee_id || '-'}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditUser(userProfile)}
                      disabled={userProfile.id === user?.id}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteUser(userProfile)}
                      disabled={userProfile.id === user?.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and role assignment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Employee ID field -- edit mode */}
            <div className="space-y-2">
              <Label htmlFor="edit-employee-id">Employee ID *</Label>
              <Input
                id="edit-employee-id"
                value={editForm.employee_id}
                onChange={e => setEditForm({ ...editForm, employee_id: e.target.value.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 25) })}
                required
                maxLength={25}
                placeholder="Enter Employee ID"
                disabled={false}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={editForm.full_name}
                onChange={(e) => {
                  const raw = e.target.value || '';
                  const filtered = raw.replace(/[^A-Za-z ]/g, '').slice(0, 25);
                  setEditForm({ ...editForm, full_name: filtered });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-department">Department</Label>
              <Select
                value={editForm.department || ''}
                onValueChange={(value) => setEditForm({ ...editForm, department: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {sortedDepartments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => {
                  const digits = (e.target.value || '').replace(/\D/g, '').slice(0, 10);
                  setEditForm({ ...editForm, phone: digits });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={editForm.role} onValueChange={(value) => setEditForm({ ...editForm, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="department_head">Department Head</SelectItem>
                  <SelectItem value="financer">Finance Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEditUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with role assignment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Employee ID field -- add mode */}
            <div className="space-y-2">
              <Label htmlFor="add-employee-id">Employee ID *</Label>
              <Input
                id="add-employee-id"
                value={addForm.employee_id}
                onChange={e => setAddForm({ ...addForm, employee_id: e.target.value.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 25) })}
                required
                maxLength={25}
                placeholder="Enter Employee ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                value={addForm.full_name}
                onChange={(e) => {
                  const raw = e.target.value || '';
                  const filtered = raw.replace(/[^A-Za-z ]/g, '').slice(0, 25);
                  setAddForm({ ...addForm, full_name: filtered });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-password">Password</Label>
              <Input
                id="add-password"
                type="password"
                value={addForm.password}
                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-department">Department</Label>
              <Select
                value={addForm.department}
                onValueChange={(value) => setAddForm({ ...addForm, department: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {sortedDepartments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-phone">Phone</Label>
              <Input
                id="add-phone"
                value={addForm.phone}
                onChange={(e) => {
                  const digits = (e.target.value || '').replace(/\D/g, '').slice(0, 10);
                  setAddForm({ ...addForm, phone: digits });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-role">Role</Label>
              <Select value={addForm.role} onValueChange={(value) => setAddForm({ ...addForm, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="department_head">Department Head</SelectItem>
                  <SelectItem value="financer">Finance Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user account for {selectedUser?.full_name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUser}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Preview Dialog */}
      <Dialog open={importPreviewOpen} onOpenChange={(open) => {
        if (!importing) {
          setImportPreviewOpen(open);
          if (!open) {
            setImportData([]);
          }
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
            <DialogDescription>
              Review the data before importing. Invalid rows are highlighted in red.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Rows</p>
                  <p className="text-2xl font-bold">{importData.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valid Rows</p>
                  <p className="text-2xl font-bold text-green-600">
                    {importData.filter(r => r.isValid).length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Invalid Rows</p>
                  <p className="text-2xl font-bold text-red-600">
                    {importData.filter(r => !r.isValid).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importData.map((row) => (
                      <TableRow
                        key={row.rowNumber}
                        className={row.isValid ? '' : 'bg-red-50'}
                      >
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>
                          {row.isValid ? (
                            <Badge className="bg-green-500">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Valid
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <X className="h-3 w-3 mr-1" />
                              Invalid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{row.employee_id}</TableCell>
                        <TableCell>{row.full_name}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>{row.department || '-'}</TableCell>
                        <TableCell>{row.phone || '-'}</TableCell>
                        <TableCell>{row.role}</TableCell>
                        <TableCell>
                          {row.errors.length > 0 ? (
                            <div className="text-sm text-red-600">
                              {row.errors.map((error, idx) => (
                                <div key={idx}>• {error}</div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-green-600">No errors</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportPreviewOpen(false);
                setImportData([]);
              }}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkImport}
              disabled={importing || importData.filter(r => r.isValid).length === 0}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${importData.filter(r => r.isValid).length} Users`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;



'use client';

import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
  updateDoc,
  writeBatch,
  getDocs,
  runTransaction,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, PlusCircle, Copy, CheckCircle, XCircle, LogIn, Lock, LogOut, Edit, ArrowLeft, Loader2, PowerOff, Wifi, WifiOff, Send, UserCheck, UserX, Coins, Globe, Gift } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, formatDistanceToNow } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';


// --- Data Types ---
type VoucherTemplate = {
  id: string;
  title: string;
  price: number;
  description: string;
};

type VoucherCode = {
  id: string;
  code: string;
  status: 'active' | 'used';
  duration: string;
  createdAt: Timestamp;
  usedAt?: Timestamp;
  usedBy?: string;
};

type CreditCode = {
    id: string;
    code: string;
    credits: number;
    status: 'active' | 'redeemed';
    createdAt: Timestamp;
    redeemedAt?: Timestamp;
    redeemedBy?: string;
    themeId?: string;
};

type UserProfile = {
    id: string;
    displayName: string;
    photoURL: string;
    credits: number;
    lastSeen?: Timestamp;
    universalAccessExpiresAt?: Timestamp;
}

const ADMIN_UID = 'sfyucpMMRPeCmDnoa4LEz3Cvoon1';


// --- Main Admin Page Component ---
export default function AdminPage() {
  const { auth } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if(!auth) return;
    const unsubscribe = auth.onAuthStateChanged(currentUser => {
        setUser(currentUser);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
        toast({ title: "Auth service not ready", variant: "destructive" });
        return;
    }
    try {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "Access Granted", description: "Welcome, Admin." });
    } catch (error: any) {
        toast({ title: "Access Denied", description: "Invalid email or password.", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    if (auth) {
        await signOut(auth);
    }
  };
  
  if (isLoading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-2">Loading Admin Panel...</p>
        </div>
    );
  }

  if (!user || user.uid !== ADMIN_UID) {
    return (
        <div className="flex h-screen items-center justify-center bg-secondary/50">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2"><Lock /> Admin Access</CardTitle>
                    <CardDescription>Enter admin credentials to access the Vench panel.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        <Button type="submit" className="w-full"><LogIn className="mr-2"/> Sign In</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold font-headline text-primary">Vench Panel</h1>
            <p className="text-muted-foreground">Manage vouchers and credit codes.</p>
        </div>
        <Button variant="outline" onClick={handleLogout}><LogOut className="mr-2" /> Logout</Button>
      </header>
       <Tabs defaultValue="vouchers">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="vouchers">Voucher Management</TabsTrigger>
                <TabsTrigger value="credit_codes">Credit Code Management</TabsTrigger>
                <TabsTrigger value="users">User Management</TabsTrigger>
            </TabsList>
            <TabsContent value="vouchers">
                <VoucherManagement />
            </TabsContent>
            <TabsContent value="credit_codes">
                <ManageCreditCodes />
            </TabsContent>
            <TabsContent value="users">
                <UserManagement />
            </TabsContent>
        </Tabs>
    </div>
  );
}

// --- VOUCHER MANAGEMENT ---
function VoucherManagement() {
    const [selectedTemplate, setSelectedTemplate] = useState<VoucherTemplate | null>(null);

    if (selectedTemplate) {
        return <ManageVoucherCodes template={selectedTemplate} onBack={() => setSelectedTemplate(null)} />;
    } else {
        return <ManageVoucherTemplates onSelectTemplate={setSelectedTemplate} />;
    }
}

// --- TEMPLATE MANAGEMENT ---

function VoucherTemplateForm({ template, onSave, onCancel }: { template?: VoucherTemplate, onSave: (data: Omit<VoucherTemplate, 'id'>) => Promise<void>, onCancel: () => void }) {
    const [title, setTitle] = useState(template?.title || '');
    const [price, setPrice] = useState(template?.price.toString() || '');
    const [description, setDescription] = useState(template?.description || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !price || !description) {
            toast({ title: 'Missing Fields', description: 'Please fill out all template details.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        const templateData = {
            title,
            price: Number(price),
            description,
        };
        await onSave(templateData);
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" placeholder="e.g., 1 Hour WiFi" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">Price (Credits)</Label>
                <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="col-span-3" placeholder="e.g., 10" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" placeholder="A short description." />
            </div>
             <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
        </form>
    );
}

function ManageVoucherTemplates({ onSelectTemplate }: { onSelectTemplate: (template: VoucherTemplate) => void }) {
    const { firestore } = useFirestore();
    const [templates, setTemplates] = useState<VoucherTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<VoucherTemplate | undefined>(undefined);

    useEffect(() => {
        if (!firestore) return;
        setLoading(true);
        const templatesQuery = query(collection(firestore, 'voucher_templates'), orderBy('price', 'asc'));

        const unsubscribe = onSnapshot(templatesQuery, (snapshot) => {
            const templatesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VoucherTemplate));
            setTemplates(templatesData);
            setLoading(false);
        }, (error) => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'voucher_templates', operation: 'list' }));
             setLoading(false);
        });
        return () => unsubscribe();
    }, [firestore]);

    const handleCreateTemplate = async (data: Omit<VoucherTemplate, 'id'>) => {
        if (!firestore) return;
        const colRef = collection(firestore, 'voucher_templates');
        addDoc(colRef, data).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
              path: 'voucher_templates',
              operation: 'create',
              requestResourceData: data,
            });
            errorEmitter.emit('permission-error', permissionError);
        }).then(() => {
            toast({ title: 'Success!', description: 'New voucher template created.' });
            setIsCreateDialogOpen(false);
        });
    };
    
    const handleEditTemplate = async (data: Omit<VoucherTemplate, 'id'>) => {
        if (!firestore || !editingTemplate) return;
        const docRef = doc(firestore, 'voucher_templates', editingTemplate.id);
        updateDoc(docRef, data).catch(async (serverError) => {
             const permissionError = new FirestorePermissionError({
              path: docRef.path,
              operation: 'update',
              requestResourceData: data,
            });
            errorEmitter.emit('permission-error', permissionError);
        }).then(() => {
            toast({ title: 'Success!', description: 'Voucher template updated.' });
            setEditingTemplate(undefined);
        });
    };

    const handleDeleteTemplate = async (templateId: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, 'voucher_templates', templateId);
        deleteDoc(docRef).catch(async (serverError) => {
             const permissionError = new FirestorePermissionError({
              path: docRef.path,
              operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        }).then(() => {
            toast({ title: 'Template Deleted', description: 'The voucher template has been removed.' });
        });
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Manage Voucher Templates</CardTitle>
                    <CardDescription>These are the types of vouchers users can buy in the shop.</CardDescription>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><PlusCircle className="mr-2 h-4 w-4" /> Create Template</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Create New Template</DialogTitle></DialogHeader>
                        <VoucherTemplateForm onSave={handleCreateTemplate} onCancel={() => setIsCreateDialogOpen(false)} />
                    </DialogContent>
                </Dialog>
                <Dialog open={!!editingTemplate} onOpenChange={(isOpen) => !isOpen && setEditingTemplate(undefined)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Edit Template</DialogTitle></DialogHeader>
                        <VoucherTemplateForm template={editingTemplate} onSave={handleEditTemplate} onCancel={() => setEditingTemplate(undefined)} />
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {loading ? <p>Loading templates...</p> : (
                    <Table>
                        <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Price</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {templates.map(t => (
                                <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelectTemplate(t)}>
                                    <TableCell className="font-medium">{t.title}</TableCell>
                                    <TableCell>{t.price} credits</TableCell>
                                    <TableCell>{t.description}</TableCell>
                                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                        <Button variant="ghost" size="icon" onClick={() => setEditingTemplate(t)}><Edit className="h-4 w-4" /></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the template "{t.title}" and all its codes.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteTemplate(t.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

// --- VOUCHER CODE MANAGEMENT ---

function parseDuration(durationStr: string) {
    const d = (durationStr.match(/(\d+)d/)?.[1] || 0);
    const h = (durationStr.match(/(\d+)h/)?.[1] || 0);
    const m = (durationStr.match(/(\d+)m/)?.[1] || 0);
    return {
        days: Number(d),
        hours: Number(h),
        minutes: Number(m)
    };
}

function ManageVoucherCodes({ template, onBack }: { template: VoucherTemplate, onBack: () => void }) {
    const { firestore } = useFirestore();
    const [codes, setCodes] = useState<VoucherCode[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [codesToCreate, setCodesToCreate] = useState('');
    const [days, setDays] = useState('0');
    const [hours, setHours] = useState('0');
    const [minutes, setMinutes] = useState('0');
    
    const codesCollectionRef = useMemo(() => {
        if (!firestore) return null;
        return collection(firestore, `voucher_templates/${template.id}/voucher_codes`);
    }, [firestore, template.id]);


    useEffect(() => {
        if (!codesCollectionRef) {
          setLoading(false);
          return;
        }
        setLoading(true);
        const codesQuery = query(codesCollectionRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(codesQuery, (snapshot) => {
            const codesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VoucherCode));
            setCodes(codesData);
            setLoading(false);
        }, (error) => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({ path: codesCollectionRef.path, operation: 'list' }));
             setLoading(false);
        });
        return () => unsubscribe();
    }, [codesCollectionRef]);

    const handleCreateCodes = async () => {
        if (!firestore || !codesCollectionRef) return;
        const codeLines = codesToCreate.split('\n').map(c => c.trim().toUpperCase()).filter(c => c.length > 0);
        if (codeLines.length === 0) {
            toast({ title: 'No codes provided', variant: 'destructive' });
            return;
        }

        const duration = `${days}d ${hours}h ${minutes}m`.replace(/0[dhms]\s*/g, '').trim();
        if(!duration) {
            toast({ title: 'Invalid Duration', description: 'Please specify a duration.', variant: 'destructive'});
            return;
        }

        const batch = writeBatch(firestore);
        codeLines.forEach(code => {
            const newCodeRef = doc(codesCollectionRef);
            batch.set(newCodeRef, {
                code,
                status: 'active',
                createdAt: serverTimestamp(),
                duration: duration
            });
        });

        batch.commit().catch(async (serverError) => {
             const permissionError = new FirestorePermissionError({ path: codesCollectionRef.path, operation: 'create' });
             errorEmitter.emit('permission-error', permissionError);
        }).then(() => {
            toast({ title: 'Success!', description: `${codeLines.length} codes have been added.` });
            setIsCreateDialogOpen(false);
            setCodesToCreate('');
        });
    };
    
    const handleDeleteCode = async (codeId: string) => {
        if (!firestore || !codesCollectionRef) return;
        const docRef = doc(codesCollectionRef, codeId);
        deleteDoc(docRef).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({ path: docRef.path, operation: 'delete' });
            errorEmitter.emit('permission-error', permissionError);
        }).then(() => {
            toast({ title: 'Code Deleted' });
        });
    };
    
    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({ title: 'Copied!', description: 'Code copied to clipboard.' });
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <Button variant="outline" size="sm" onClick={onBack} className="mb-2"><ArrowLeft className="mr-2"/>Back to Templates</Button>
                    <CardTitle>Manage Codes for "{template.title}"</CardTitle>
                    <CardDescription>Add or delete unique voucher codes for this template.</CardDescription>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Codes</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Add New Voucher Codes</DialogTitle><DialogDescription>Enter one code per line. They will be added to the "{template.title}" template.</DialogDescription></DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label>Duration</Label>
                                <div className="grid grid-cols-3 gap-2 mt-1">
                                    <Input type="number" placeholder="Days" value={days} onChange={e => setDays(e.target.value)} />
                                    <Input type="number" placeholder="Hours" value={hours} onChange={e => setHours(e.target.value)} />
                                    <Input type="number" placeholder="Minutes" value={minutes} onChange={e => setMinutes(e.target.value)} />
                                </div>
                            </div>
                             <Textarea value={codesToCreate} onChange={e => setCodesToCreate(e.target.value)} placeholder="CODE-1\nCODE-2\nCODE-3" rows={10}/>
                        </div>
                        <DialogFooter><Button onClick={handleCreateCodes}>Add Codes</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {loading ? <p>Loading codes...</p> : (
                     <Table>
                        <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Status</TableHead><TableHead>Duration</TableHead><TableHead>Created At</TableHead><TableHead>Used By</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {codes.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-mono">{c.code}</TableCell>
                                    <TableCell><Badge variant={c.status === 'active' ? 'secondary' : 'destructive'} className="capitalize">{c.status}</Badge></TableCell>
                                    <TableCell>{c.duration}</TableCell>
                                    <TableCell>{c.createdAt ? format(c.createdAt.toDate(), 'P p') : 'N/A'}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{c.usedBy || '-'}</TableCell>
                                    <TableCell className="text-right">
                                         <Button variant="ghost" size="icon" onClick={() => handleCopy(c.code)}><Copy className="h-4 w-4" /></Button>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the code "{c.code}".</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteCode(c.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

// --- CREDIT CODE MANAGEMENT ---

function CreditCodeForm({ code, onSave, onCancel }: { code?: CreditCode, onSave: (data: Omit<CreditCode, 'id' | 'createdAt' | 'status'>) => Promise<void>, onCancel: () => void }) {
    const [codeValue, setCodeValue] = useState(code?.code || '');
    const [credits, setCredits] = useState(code?.credits.toString() || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!codeValue || !credits) {
            toast({ title: 'Missing Fields', description: 'Please fill out all code details.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        const codeData = {
            code: codeValue.toUpperCase(),
            credits: Number(credits),
        };
        await onSave(codeData as any);
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right">Code</Label>
                <Input id="code" value={codeValue} onChange={(e) => setCodeValue(e.target.value)} className="col-span-3 font-mono" placeholder="e.g., BONUS-123" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="credits" className="text-right">Credits</Label>
                <Input id="credits" type="number" value={credits} onChange={(e) => setCredits(e.target.value)} className="col-span-3" placeholder="e.g., 50" />
            </div>
             <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
        </form>
    );
}

function ManageCreditCodes() {
    const { firestore } = useFirestore();
    const [creditCodes, setCreditCodes] = useState<CreditCode[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingCode, setEditingCode] = useState<CreditCode | undefined>(undefined);
    const [codesToCreate, setCodesToCreate] = useState('');
    const [creditsPerCode, setCreditsPerCode] = useState('');

    useEffect(() => {
        if (!firestore) return;
        setLoading(true);
        const codesQuery = query(collection(firestore, 'credit_codes'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(codesQuery, (snapshot) => {
            const codesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreditCode));
            const codesWithoutTheme = codesData.filter(code => !code.themeId);
            setCreditCodes(codesWithoutTheme);
            setLoading(false);
        }, (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'credit_codes', operation: 'list' }));
            setLoading(false);
        });
        return () => unsubscribe();
    }, [firestore]);
    
    const handleCreateCodes = async () => {
        if (!firestore) return;
        const codeLines = codesToCreate.split('\n').map(c => c.trim().toUpperCase()).filter(c => c.length > 0);
        if (codeLines.length === 0 || !creditsPerCode) {
            toast({ title: 'Missing Fields', description: 'Please provide codes and a credit amount.', variant: 'destructive' });
            return;
        }

        const credits = Number(creditsPerCode);
        const colRef = collection(firestore, 'credit_codes');
        const batch = writeBatch(firestore);
        
        codeLines.forEach(code => {
            const newCodeRef = doc(colRef);
            batch.set(newCodeRef, {
                code,
                credits,
                status: 'active',
                createdAt: serverTimestamp(),
            });
        });

        batch.commit().catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({ path: colRef.path, operation: 'create' });
            errorEmitter.emit('permission-error', permissionError);
        }).then(() => {
            toast({ title: 'Success!', description: `${codeLines.length} credit codes have been added.` });
            setIsCreateDialogOpen(false);
            setCodesToCreate('');
            setCreditsPerCode('');
        });
    };

    const handleEditCode = async (data: Omit<CreditCode, 'id' | 'createdAt' | 'status'>) => {
        if (!firestore || !editingCode) return;
        const docRef = doc(firestore, 'credit_codes', editingCode.id);
        updateDoc(docRef, data).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: data });
            errorEmitter.emit('permission-error', permissionError);
        }).then(() => {
            toast({ title: 'Success!', description: 'Credit code updated.' });
            setEditingCode(undefined);
        });
    };

    const handleDeleteCode = async (codeId: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, 'credit_codes', codeId);
        deleteDoc(docRef).catch(async (serverError) => {
             const permissionError = new FirestorePermissionError({ path: docRef.path, operation: 'delete' });
             errorEmitter.emit('permission-error', permissionError);
        }).then(() => {
            toast({ title: 'Code Deleted', description: 'The credit code has been removed.' });
        });
    };

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({ title: 'Copied!', description: 'Code copied to clipboard.' });
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Manage Credit Codes</CardTitle>
                    <CardDescription>Create or delete codes that users can redeem for credits.</CardDescription>
                </div>
                 <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><PlusCircle className="mr-2 h-4 w-4" /> Create Codes</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Credit Codes</DialogTitle>
                            <DialogDescription>Enter one code per line. All codes will have the same credit value.</DialogDescription>
                        </DialogHeader>
                         <div className="space-y-4">
                             <div>
                                <Label htmlFor="credits-per-code">Credits per Code</Label>
                                <Input id="credits-per-code" type="number" value={creditsPerCode} onChange={e => setCreditsPerCode(e.target.value)} placeholder="e.g., 100" />
                            </div>
                             <Textarea value={codesToCreate} onChange={e => setCodesToCreate(e.target.value)} placeholder="CODE-1\nCODE-2\nCODE-3" rows={10}/>
                        </div>
                        <DialogFooter><Button onClick={handleCreateCodes}>Create Codes</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
                <Dialog open={!!editingCode} onOpenChange={(isOpen) => !isOpen && setEditingCode(undefined)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Edit Credit Code</DialogTitle></DialogHeader>
                        <CreditCodeForm code={editingCode} onSave={handleEditCode} onCancel={() => setEditingCode(undefined)} />
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                 {loading ? <p>Loading codes...</p> : (
                     <Table>
                        <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Credits</TableHead><TableHead>Status</TableHead><TableHead>Redeemed By</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {creditCodes.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-mono">{c.code}</TableCell>
                                    <TableCell>{c.credits}</TableCell>
                                    <TableCell><Badge variant={c.status === 'active' ? 'secondary' : 'destructive'} className="capitalize">{c.status}</Badge></TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{c.redeemedBy || '-'}</TableCell>
                                    <TableCell className="text-right">
                                         <Button variant="ghost" size="icon" onClick={() => handleCopy(c.code)}><Copy className="h-4 w-4" /></Button>
                                         <Button variant="ghost" size="icon" onClick={() => setEditingCode(c)}><Edit className="h-4 w-4" /></Button>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the code "{c.code}". This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteCode(c.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

// --- USER MANAGEMENT ---

function AddCreditsModal({ user, onConfirm }: { user: UserProfile, onConfirm: (amount: number, reason: string) => void }) {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        setIsSubmitting(true);
        await onConfirm(Number(amount), reason);
        setIsSubmitting(false);
        setIsOpen(false);
        setAmount('');
        setReason('');
    };

    return (
         <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Coins className="mr-2 h-4 w-4"/> Add Credits</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Credits to {user.displayName}</DialogTitle>
                    <DialogDescription>
                        Enter the amount of credits and a reason for the transaction. This will be logged in the user's history.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">Amount</Label>
                        <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="reason" className="text-right">Reason</Label>
                        <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="col-span-3" placeholder="e.g., Event Prize, Refund" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={!amount || Number(amount) <= 0 || !reason || isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirm'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function UserManagement() {
    const { firestore } = useFirestore();
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (!firestore) return;

        const usersQuery = query(collection(firestore, 'users'), orderBy('lastSeen', 'desc'));
        const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
            setAllUsers(usersData);
            setLoading(false);
        }, (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'users', operation: 'list' }));
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);
    
    const handleAddCredits = async (user: UserProfile, amount: number, reason: string) => {
        if (!firestore) return;
        
        const userDocRef = doc(firestore, 'users', user.id);
        
        try {
            await runTransaction(firestore, async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                if (!userDoc.exists()) throw new Error("User not found");
                
                const newCredits = (userDoc.data().credits || 0) + amount;
                
                transaction.update(userDocRef, { credits: newCredits });
                
                const transactionRef = doc(collection(firestore, 'users', user.id, 'transactions'));
                transaction.set(transactionRef, {
                    type: 'bonus',
                    description: `Admin grant: ${reason}`,
                    amount: amount,
                    createdAt: serverTimestamp()
                });
            });
            toast({ title: 'Success', description: `${amount} credits added to ${user.displayName}.` });
        } catch (error: any) {
            if (error instanceof FirestorePermissionError) {
                errorEmitter.emit('permission-error', error);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not add credits.' });
            }
        }
    }


    if (loading) return <p>Loading user data...</p>;
    
    return (
         <Card>
            <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View all registered users and manage their accounts.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Credits</TableHead>
                            <TableHead>Last Seen</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {allUsers.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center h-24">No users found.</TableCell></TableRow>
                        ) : allUsers.map(user => {
                             const isOnline = user.lastSeen && (new Date().getTime() - user.lastSeen.toDate().getTime()) < 5 * 60 * 1000;
                             const hasUniversal = user.universalAccessExpiresAt && user.universalAccessExpiresAt.toDate() > new Date();

                            return (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={user.photoURL} />
                                            <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{user.displayName}</span>
                                    </div>
                                </TableCell>
                                 <TableCell>{user.credits.toLocaleString()}</TableCell>
                                <TableCell>{user.lastSeen ? formatDistanceToNow(user.lastSeen.toDate(), { addSuffix: true }) : 'Never'}</TableCell>
                                <TableCell>
                                    {hasUniversal ? <Badge variant="default">Universal Access</Badge> : (isOnline ? <Badge variant="secondary">Online</Badge> : <Badge variant="outline">Offline</Badge>)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <AddCreditsModal user={user} onConfirm={(amount, reason) => handleAddCredits(user, amount, reason)} />
                                </TableCell>
                            </TableRow>
                        )})}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}



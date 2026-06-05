
'use client';

import {
  collection,
  writeBatch,
  serverTimestamp,
  doc,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import React, { useEffect, useState } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, LogIn, Lock, LogOut, Gift, Palette, Copy, Trash2 } from 'lucide-react';
import { signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


const ADMIN_UID = 'sfyucpMMRPeCmDnoa4LEz3Cvoon1';

const themes = [
    { id: 'light', name: 'Default Light' },
    { id: 'dark', name: 'Default Dark' },
    { id: 'bubbles-light', name: 'Bubbles Light' },
    { id: 'golden', name: 'Golden Theme' },
    { id: 'takedown', name: 'Takedown Theme' },
    { id: 'howitsdone', name: "How It's Done Theme" },
    { id: 'christmas', name: 'Christmas Theme' },
];

type CreditCode = {
    id: string;
    code: string;
    credits: number;
    status: 'active' | 'redeemed';
    themeId?: string;
    createdAt: Timestamp;
    redeemedAt?: Timestamp;
    redeemedBy?: string;
};


function SuperVenchPanel() {
    const { firestore } = useFirestore();
    const { toast } = useToast();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [codesToCreate, setCodesToCreate] = useState('');
    const [creditsPerCode, setCreditsPerCode] = useState('');
    const [selectedTheme, setSelectedTheme] = useState('none');
    const [creditCodes, setCreditCodes] = useState<CreditCode[]>([]);
    const [loadingCodes, setLoadingCodes] = useState(true);

     useEffect(() => {
        if (!firestore) return;
        setLoadingCodes(true);
        const codesQuery = query(collection(firestore, 'credit_codes'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(codesQuery, (snapshot) => {
            const codesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreditCode));
            setCreditCodes(codesData);
            setLoadingCodes(false);
        }, (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'credit_codes', operation: 'list' }));
            setLoadingCodes(false);
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
            const data: any = {
                code,
                credits,
                status: 'active',
                createdAt: serverTimestamp(),
            };
            if (selectedTheme !== 'none') {
                data.themeId = selectedTheme;
            }
            batch.set(newCodeRef, data);
        });

        try {
            await batch.commit();
            toast({ title: 'Success!', description: `${codeLines.length} bundle codes have been created.` });
            setIsCreateDialogOpen(false);
            setCodesToCreate('');
            setCreditsPerCode('');
            setSelectedTheme('none');
        } catch (serverError) {
            const permissionError = new FirestorePermissionError({ path: colRef.path, operation: 'create' });
            errorEmitter.emit('permission-error', permissionError);
        }
    };
    
    const handleDeleteCode = async (codeId: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, 'credit_codes', codeId);
        try {
            await deleteDoc(docRef);
            toast({ title: 'Code Deleted', description: 'The bundle code has been removed.' });
        } catch (serverError) {
            const permissionError = new FirestorePermissionError({ path: docRef.path, operation: 'delete' });
            errorEmitter.emit('permission-error', permissionError);
        }
    };

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({ title: 'Copied!', description: 'Code copied to clipboard.' });
    };


    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Bundle Code Generator</CardTitle>
                    <CardDescription>Create special codes that can award credits and an optional theme.</CardDescription>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><PlusCircle className="mr-2 h-4 w-4" /> Create Bundle Code</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Bundle Code</DialogTitle>
                            <DialogDescription>Enter codes, a credit value, and optionally select a theme to bundle.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                             <div>
                                <Label htmlFor="credits-per-code">Credits per Code</Label>
                                <Input id="credits-per-code" type="number" value={creditsPerCode} onChange={e => setCreditsPerCode(e.target.value)} placeholder="e.g., 1000" />
                            </div>
                            <div>
                                <Label htmlFor="theme-select">Optional: Bundle a Theme</Label>
                                 <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                                    <SelectTrigger id="theme-select">
                                        <SelectValue placeholder="Select a theme to bundle..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None (Credits Only)</SelectItem>
                                        {themes.map(theme => (
                                            <SelectItem key={theme.id} value={theme.id}>
                                                {theme.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                             <Textarea value={codesToCreate} onChange={e => setCodesToCreate(e.target.value)} placeholder="CODE-1\nCODE-2\nCODE-3" rows={10}/>
                        </div>
                        <DialogFooter><Button onClick={handleCreateCodes}>Create Codes</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
             <CardContent>
                {loadingCodes ? <p>Loading codes...</p> : (
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Credits</TableHead>
                                <TableHead>Bundled Theme</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Redeemed By</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {creditCodes.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-mono">{c.code}</TableCell>
                                    <TableCell>{c.credits}</TableCell>
                                    <TableCell>{themes.find(t => t.id === c.themeId)?.name || '-'}</TableCell>
                                    <TableCell><Badge variant={c.status === 'active' ? 'secondary' : 'destructive'} className="capitalize">{c.status}</Badge></TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{c.redeemedBy || '-'}</TableCell>
                                    <TableCell className="text-right">
                                         <Button variant="ghost" size="icon" onClick={() => handleCopy(c.code)}><Copy className="h-4 w-4" /></Button>
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


export default function SuperVenchPage() {
  const { auth } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if(!auth) return;
    const unsubscribe = auth.onAuthStateChanged(currentUser => {
        setUser(currentUser);
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
        toast({ title: "Access Granted", description: "Welcome, Super Admin." });
    } catch (error: any) {
        toast({ title: "Access Denied", description: "Invalid email or password.", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    if (auth) {
        await signOut(auth);
    }
  };

  if (!user || user.uid !== ADMIN_UID) {
    return (
        <div className="flex h-screen items-center justify-center bg-secondary/50">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2"><Lock /> SuperVench Access</CardTitle>
                    <CardDescription>Enter admin credentials to access the SuperVench panel.</CardDescription>
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
            <h1 className="text-3xl font-bold font-headline text-primary">SuperVench Panel</h1>
            <p className="text-muted-foreground">Create and manage promotional bundle codes.</p>
        </div>
        <Button variant="outline" onClick={handleLogout}><LogOut className="mr-2" /> Logout</Button>
      </header>
       <SuperVenchPanel />
    </div>
  );
}

    
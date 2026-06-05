

'use client';

import { useUser, useFirestore } from '@/firebase';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

type Transaction = {
    id: string;
    type: 'voucher_purchase' | 'redeem' | 'bonus' | 'theme_purchase' | 'effect_purchase' | 'chat' | 'private_chat' | 'investment_deposit' | 'investment_cashout' | 'investment_start' | 'investment_withdraw' | 'referral_bonus';
    description: string;
    amount: number;
    createdAt: Timestamp;
    voucherCode?: string;
};

export default function VouchersPage() {
    const user = useUser();
    const { firestore } = useFirestore();
    const [vouchers, setVouchers] = useState<Transaction[] | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        // Clear the notification flag when the user visits this page
        if (sessionStorage.getItem('newVoucherPurchased') === 'true') {
            sessionStorage.removeItem('newVoucherPurchased');
            // Dispatch a storage event to notify other components (like the layout)
            window.dispatchEvent(new Event('storage'));
        }

        if (user && firestore) {
            // Query all transactions sorted by date
            const transactionsQuery = query(
                collection(firestore, `users/${user.uid}/transactions`),
                orderBy('createdAt', 'desc')
            );

            const unsubscribe = onSnapshot(transactionsQuery, (snapshot) => {
                const allTransactions = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Transaction));
                
                // Filter for voucher purchases on the client side
                const voucherPurchases = allTransactions.filter(tx => tx.type === 'voucher_purchase');
                
                setVouchers(voucherPurchases);
                setLoading(false);
            }, (error) => {
                const permissionError = new FirestorePermissionError({
                    path: `users/${user.uid}/transactions`,
                    operation: 'list'
                });
                errorEmitter.emit('permission-error', permissionError);
                setLoading(false);
            });

            return () => unsubscribe();
        } else if (user === null) {
            setLoading(false);
        }
    }, [user, firestore]);
    
    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({ title: 'Nai-kopya ang voucher code!' });
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center mb-8">
                <Button variant="outline" size="icon" className="mr-4" asChild>
                    <Link href="/dashboard/profile">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Balik sa Profile</span>
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold font-headline text-primary">Aking mga Voucher</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Ang Iyong mga Biniling Voucher</CardTitle>
                    <CardDescription>Isang listahan ng lahat ng WiFi voucher code na iyong nabili.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading && <p>Nilo-load ang iyong mga voucher...</p>}
                    {!loading && vouchers === null && user && <p>Hindi ma-load ang iyong voucher history.</p>}
                    {!loading && vouchers && vouchers.length === 0 && (
                        <div className="text-center py-10">
                            <p className="font-semibold">Wala ka pang nabibiling voucher.</p>
                            <Button asChild className="mt-4">
                                <Link href="/dashboard">Pumunta sa Shop</Link>
                            </Button>
                        </div>
                    )}
                    {!loading && vouchers && vouchers.length > 0 && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Petsa</TableHead>
                                    <TableHead>Voucher</TableHead>
                                    <TableHead>Code</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vouchers.map(tx => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="text-muted-foreground">
                                            {tx.createdAt ? format(tx.createdAt.toDate(), 'MMM d, yyyy, h:mm a') : '...'}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {tx.description.replace('Purchased "', '').replace('" voucher', '').replace(' (First Purchase Discount)', '')}
                                            {tx.description.includes('(First Purchase Discount)') && <Badge variant="outline" className="ml-2">Unang Bili</Badge>}
                                        </TableCell>
                                        <TableCell>
                                            {tx.voucherCode ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm">{tx.voucherCode}</span>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(tx.voucherCode as string)}>
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}


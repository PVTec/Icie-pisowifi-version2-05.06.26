'use client';

import { useUser, useFirestore } from '@/firebase';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Coins, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

type Transaction = {
    id: string;
    type: 'purchase' | 'redeem' | 'bonus' | 'theme_purchase' | 'effect_purchase' | 'chat' | 'private_chat' | 'investment_deposit' | 'investment_cashout' | 'investment_start' | 'investment_withdraw';
    description: string;
    amount: number;
    createdAt: Timestamp;
    voucherCode?: string;
};

const badgeVariants: { [key in Transaction['type']]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
    purchase: 'destructive',
    redeem: 'default',
    bonus: 'default',
    theme_purchase: 'destructive',
    effect_purchase: 'destructive',
    chat: 'default',
    private_chat: 'default',
    investment_start: 'destructive',
    investment_withdraw: 'secondary',
    investment_deposit: 'destructive',
    investment_cashout: 'default'
};


export default function TransactionHistoryPage() {
    const user = useUser();
    const { firestore } = useFirestore();
    const [transactions, setTransactions] = useState<Transaction[] | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (user && firestore) {
            const transactionsQuery = query(
                collection(firestore, `users/${user.uid}/transactions`),
                orderBy('createdAt', 'desc')
            );

            const unsubscribe = onSnapshot(transactionsQuery, (snapshot) => {
                const transactionsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Transaction));
                setTransactions(transactionsData);
                setLoading(false);
            }, (error) => {
                console.error("Error fetching transactions: ", error);
                setLoading(false);
            });

            return () => unsubscribe();
        } else if (user === null) {
            setLoading(false);
        }
    }, [user, firestore]);

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({ title: 'Voucher code copied!' });
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center mb-8">
                <Button variant="outline" size="icon" className="mr-4" asChild>
                    <Link href="/dashboard/profile">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back to Profile</span>
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold font-headline text-primary">Transaction History</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Your Transactions</CardTitle>
                    <CardDescription>A record of all your credit activity.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading && <p>Loading history...</p>}
                    {!loading && transactions === null && user && <p>Could not load transaction history.</p>}
                    {!loading && transactions?.length === 0 && <p>You have no transactions yet.</p>}
                    {!loading && transactions && transactions.length > 0 && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Voucher Code</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map(tx => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="text-muted-foreground">
                                            {tx.createdAt ? format(tx.createdAt.toDate(), 'MMM d, yyyy, h:mm a') : '...'}
                                        </TableCell>
                                        <TableCell className="font-medium">{tx.description}</TableCell>
                                        <TableCell>
                                            {tx.voucherCode ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs">{tx.voucherCode}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(tx.voucherCode as string)}>
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                             <Badge variant={badgeVariants[tx.type] || 'secondary'} className="capitalize">{tx.type.replace(/_/g, ' ')}</Badge>
                                        </TableCell>
                                        <TableCell className={`text-right font-semibold flex items-center justify-end gap-1 ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            <Coins className="h-4 w-4" />
                                            {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
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
    
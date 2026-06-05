
'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, HelpCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLoading } from '@/context/loading-context';

export default function CashInPage() {
    const router = useRouter();
    const { showLoading } = useLoading();

    const handleBackClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        showLoading('bar');
        router.back();
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <header className="flex items-center mb-8">
                <Button variant="outline" size="icon" className="mr-4" asChild>
                    <Link href="/dashboard" onClick={handleBackClick}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back to Dashboard</span>
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold font-headline text-primary">Paano Mag-Cash In?</h1>
                    <p className="text-muted-foreground">Ang iyong gabay sa pagbili ng credits.</p>
                </div>
            </header>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 bg-primary/10 p-3 rounded-full">
                           <HelpCircle className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Gabay sa Pag-Cash In</CardTitle>
                            <CardDescription>Sundin ang mga hakbang na ito para makabili ng credits at ma-enjoy ang lahat ng features ng portal.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="rounded-lg border p-4">
                        <ol className="list-decimal list-outside ml-4 space-y-4 text-sm text-foreground">
                            <li>
                                <h4 className="font-semibold mb-1">I-contact ang Owner</h4>
                                <p className="text-muted-foreground">Makipag-ugnayan sa may-ari ng Icie Wifi Portal (Vince) sa personal o sa pamamagitan ng chat.</p>
                            </li>
                            <li>
                                <h4 className="font-semibold mb-1">Pumili at Magbayad</h4>
                                <p className="text-muted-foreground">Sabihin kung aling credit bundle ang gusto mong bilhin at bayaran ito gamit ang GCash o cash.</p>
                            </li>
                            <li>
                                <h4 className="font-semibold mb-1">Tumanggap ng Code</h4>
                                <p className="text-muted-foreground">Pagkatapos ng bayad, makakatanggap ka ng isang unique na <strong className="text-primary">Redeem Code</strong>.</p>
                            </li>
                            <li>
                                <h4 className="font-semibold mb-1">I-redeem ang Iyong Credits</h4>
                                <p className="text-muted-foreground">Pumunta sa Dashboard at gamitin ang "Redeem Code" na button. Ilagay ang iyong code para makuha ang credits.</p>
                            </li>
                        </ol>
                    </div>

                    <div className="rounded-lg border p-4">
                        <h3 className="font-semibold text-foreground mb-3">Mga Presyo ng Credits</h3>
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-foreground">7,500 Credits</span>
                                <span className="font-bold text-primary text-base">₱5.00</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-foreground">15,000 Credits</span>
                                <span className="font-bold text-primary text-base">₱10.00</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-foreground">22,500 Credits</span>
                                <span className="font-bold text-primary text-base">₱15.00</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

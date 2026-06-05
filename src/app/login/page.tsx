
'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React, { useState } from "react";
import { useAuth } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { auth } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    if (value.includes('@') || value.includes(' ')) {
      setUsernameError("Bawal gumamit ng '@' o space sa username.");
    } else {
      setUsernameError('');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameError) {
      toast({
        variant: "destructive",
        title: "Invalid na Username",
        description: usernameError,
      });
      return;
    }
    if (!auth) {
        toast({
            variant: "destructive",
            title: "Authentication service not ready",
            description: "Please wait a moment and try again.",
        });
        return;
    };

    setIsRedirecting(true);
    const email = `${username}@iciewifi.com`;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (error: any) {
      setIsRedirecting(false);
      toast({
        variant: "destructive",
        title: "Hindi makapag-sign in",
        description: error.code === 'auth/invalid-credential' 
            ? 'Mali ang iyong username o password.'
            : error.message,
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-blue-600 p-4">
      <div className="absolute top-8">
        <Logo className="text-white" />
      </div>
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Welcome Back!</CardTitle>
          <CardDescription>
            Ilagay ang iyong account details para magpatuloy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSignIn}>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="iyong-username"
                required
                value={username}
                onChange={handleUsernameChange}
                disabled={isRedirecting}
                className={cn(usernameError && "border-destructive focus-visible:ring-destructive")}
              />
              {usernameError && <p className="text-sm text-destructive mt-1">{usernameError}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isRedirecting} />
            </div>
            <Button type="submit" className="w-full" disabled={!auth || isRedirecting || !!usernameError}>
              {isRedirecting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Nag-sign In...</> : 'Sign In'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            Wala ka pang account?{" "}
            <Link href="/signup" className="underline font-semibold text-primary">
              Mag-sign Up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


'use client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Gamepad2, ArrowRight, Coins } from "lucide-react";

const games = [
    {
        title: "Lucky Draw!",
        href: "/dashboard/arena",
        reward: "0-1200",
        difficulty: "J ♥"
    },
    {
        title: "Witch Hunt",
        href: "/dashboard/arena",
        reward: "25-80",
        difficulty: "♥ 9"
    },
    {
        title: "Terminal Code",
        href: "/dashboard/arena",
        reward: "15-150",
        difficulty: "♦ 8"
    },
    {
        title: "Power Balance",
        href: "/dashboard/arena",
        reward: "15-120",
        difficulty: "♣ 6-9"
    },
    {
        title: "Last Stand",
        href: "/dashboard/arena",
        reward: "2-6 per hit",
        difficulty: "♠ 5-9"
    }
];

export function PlayToEarnModal({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Play to Earn</DialogTitle>
          <DialogDescription>
            Choose a game to play and start earning credits.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-4">
            {games.map((game) => (
                <Link href={game.href} key={game.title}>
                    <div className="p-3 flex items-center justify-between rounded-lg border hover:bg-secondary transition-colors">
                        <div>
                            <h3 className="font-semibold text-sm">{game.title}</h3>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Coins className="h-3 w-3" /> 
                                <span>{game.reward}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="font-mono text-sm font-bold text-destructive">{game.difficulty}</div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>
                </Link>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

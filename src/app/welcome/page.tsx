
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { ArrowRight, Banknote, Coins, Gamepad2, Gem, Handshake, Home, MessageSquare, Shield, ShoppingCart, Swords, Users, Zap } from 'lucide-react';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const features = [
  {
    icon: Handshake,
    title: 'Welcome to a New Adventure!',
    description: "You're not just connecting to WiFi. You're entering a world of games, rewards, and community. Get ready for a totally new experience!",
  },
  {
    icon: Gem,
    title: 'The Power of Credits',
    description: "Credits are your key to everything! Earn them by playing games, logging in daily, and participating in events. Your journey to riches starts now!",
  },
  {
    icon: ShoppingCart,
    title: 'Your One-Stop Shop',
    description: "Use your hard-earned credits to buy WiFi vouchers. As a new user, you get a massive 97% discount on your very first purchase! Don't miss out!",
  },
  {
    icon: Gamepad2,
    title: 'The Icie Arena: Play & Earn',
    description: 'Feeling lucky? Head to the Arena to play exclusive games. Test your skill and fortune to multiply your credits and climb the leaderboards!',
  },
  {
    icon: Banknote,
    title: 'The Investment Hub',
    description: 'Ready for the high-stakes game? Invest your credits in our dynamic hub to grow your balance over time. Big risks can lead to even bigger rewards!',
  },
  {
    icon: Swords,
    title: 'Challenge and Compete',
    description: "Find other players who are online right now! Challenge them to a strategic game of Tic-Tac-Toe or just start a friendly conversation.",
  },
];

export default function WelcomePage() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  const handleNext = () => {
    api?.scrollNext();
  };
  
  const handleStart = () => {
    localStorage.setItem('hasSeenWelcomeScreen', 'true');
  };

  const isLastSlide = current === count;

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-blue-300 via-pink-300 to-purple-300 p-4">
      <div className="absolute top-4 left-4 z-10">
        <Logo className="text-white drop-shadow-md" />
      </div>
      <Carousel
        setApi={setApi}
        opts={{
          align: 'start',
        }}
        className="w-full max-w-sm sm:max-w-md md:max-w-lg"
      >
        <CarouselContent>
          {features.map((feature, index) => (
            <CarouselItem key={index}>
              <div className="p-1">
                <Card className="bg-gradient-to-br from-white/90 to-blue-100/60 backdrop-blur-lg shadow-lg">
                  <CardContent className="flex aspect-square flex-col items-center justify-center p-6 text-center">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary border-2 border-primary/20 shadow-inner">
                      <feature.icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold font-headline text-primary">{feature.title}</h3>
                    <p className="mt-2 text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
           <CarouselItem>
              <div className="p-1">
                <Card className="bg-gradient-to-br from-white/90 to-green-100/60 backdrop-blur-lg shadow-lg">
                  <CardContent className="flex aspect-square flex-col items-center justify-center p-6 text-center">
                     <div className="mx-auto bg-white/80 backdrop-blur-md rounded-full shadow-2xl h-32 w-32 flex items-center justify-center p-2 mb-6">
                        <Image
                          src="/avatars/icielogo.png"
                          alt="Icie Wifi Character"
                          width={120}
                          height={120}
                          className="object-cover rounded-full"
                        />
                     </div>
                    <h3 className="text-2xl font-bold font-headline text-primary">You're Ready to Begin!</h3>
                    <p className="mt-2 text-muted-foreground">Your portal adventure awaits. Log in or sign up now to claim your welcome bonus and start playing!</p>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
        </CarouselContent>
      </Carousel>

      <div className="mt-8 flex flex-col items-center gap-6 w-full max-w-sm sm:max-w-md md:max-w-lg">
        <div className="flex gap-2">
            {Array.from({ length: count }).map((_, index) => (
                <button
                    key={index}
                    onClick={() => api?.scrollTo(index)}
                    className={cn(
                        "h-2 w-2 rounded-full bg-white/50 transition-all",
                        current === index + 1 ? "w-4 bg-white" : "hover:bg-white/80"
                    )}
                    aria-label={`Go to slide ${index + 1}`}
                />
            ))}
        </div>
         {isLastSlide ? (
             <Button asChild size="lg" className="w-full h-12 px-8 text-base font-bold bg-white text-primary hover:bg-white/90 shadow-xl transition-transform hover:scale-105 animate-in fade-in-50 zoom-in-95">
                <Link href="/" onClick={handleStart}>
                    Start Your Adventure! <ArrowRight className="ml-2" />
                </Link>
            </Button>
         ) : (
            <Button size="lg" onClick={handleNext} className="w-full h-12 px-8 text-base font-bold bg-white/80 text-primary/90 hover:bg-white shadow-xl transition-transform hover:scale-105 animate-in fade-in-50 zoom-in-95">
                Next <ArrowRight className="ml-2" />
            </Button>
         )}
      </div>
    </div>
  );
}

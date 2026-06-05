
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Bug, CheckCircle, Star, Zap, Gift, Gamepad2, Palette, Users, AlertTriangle, Shield } from "lucide-react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export default function PatchNotesPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center mb-8">
            <Button variant="outline" size="icon" className="mr-4" asChild>
                <Link href="/dashboard">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back to Dashboard</span>
                </Link>
            </Button>
            <h1 className="text-3xl font-bold font-headline text-primary">Patch Notes</h1>
        </div>

      
        <Card className="mb-8">
            <CardHeader>
                <CardTitle className="text-2xl">Version 6.9.2 - The Quality of Life Update</CardTitle>
                <CardDescription>
                    Welcome sa v6.9.2, isang update na nakatuon sa pag-streamline ng iyong karanasan at pag-aayos ng mga nakakainis na bug. Nagpapakilala kami ng mga makabuluhang pagpapabuti sa performance, mga pagsasaayos sa UI, at mga smart feature para gawing mas maayos at mas kasiya-siya ang iyong oras sa portal.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div>
                    <h3 className="text-xl font-semibold flex items-center gap-2 mb-4"><Zap className="text-accent" /> Mga Major Enhancement at Pagpapabuti sa Performance</h3>
                    <div className="space-y-6 pl-6 relative before:absolute before:left-2 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
                        
                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-accent" />
                            <h4 className="font-semibold text-primary">Smarter Navigation & UI Polish</h4>
                            <ul className="list-disc list-outside ml-5 mt-2 space-y-2 text-muted-foreground">
                                <li><strong className="text-foreground">Tab Memory:</strong> Naaalala na ngayon ng app kung aling tab (Vouchers, Themes, Buffs) ang huli mong binisita sa Shop.</li>
                                <li><strong className="text-foreground">Cleaner Layouts:</strong> Inayos namin ang spacing at alignment sa maraming screen para sa isang mas malinis na view.</li>
                                <li><strong className="text-foreground">More Responsive Components:</strong> Ang mga button at card ay mas maganda nang nag-a-adjust sa iba't ibang laki ng screen.</li>
                            </ul>
                        </div>
                        
                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-accent" />
                            <h4 className="font-semibold text-primary">Optimized Dashboard & Faster Loading</h4>
                             <ul className="list-disc list-outside ml-5 mt-2 space-y-2 text-muted-foreground">
                                <li><strong className="text-foreground">Faster Dashboard Load:</strong> Makabuluhang binilisan ang oras ng pag-load ng dashboard.</li>
                                <li><strong className="text-foreground">Smoother Animations:</strong> Ang mga animation ng UI ay mas pino na ngayon.</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <Separator />

                <div>
                    <h3 className="text-xl font-semibold flex items-center gap-2 mb-4"><Bug className="text-destructive" /> Mga Kritikal na Pag-aayos ng Bug</h3>
                     <div className="space-y-6 pl-6 relative before:absolute before:left-2 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-destructive" />
                            <h4 className="font-semibold text-primary">NAAYOS NA - Investment Page Crash</h4>
                             <p className="mt-2 text-muted-foreground">
                               Inayos ang isang kritikal na bug na maaaring maging sanhi ng pag-crash ng app kapag binubuksan ang Investment Hub.
                            </p>
                        </div>
                         <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-destructive" />
                            <h4 className="font-semibold text-primary">NAAYOS NA - Chat Message Failure</h4>
                             <p className="mt-2 text-muted-foreground">
                               Nalutas ang isang isyu kung saan ang mga chat message ay paminsan-minsan ay nabigong maipadala.
                            </p>
                        </div>
                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-destructive" />
                            <h4 className="font-semibold text-primary">NAAYOS NA - Visual Glitch sa Shop</h4>
                             <p className="mt-2 text-muted-foreground">
                               Inayos ang isang visual bug sa Shop kung saan ang text ay umaapaw sa mga card ng item.
                            </p>
                        </div>
                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-destructive" />
                            <h4 className="font-semibold text-primary">NAAYOS NA - Notification Persistence</h4>
                             <p className="mt-2 text-muted-foreground">
                              Ang mga notification para sa mga bagong mensahe ay hindi na dapat lumitaw kung ikaw ay nasa chat window na.
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
      
        <Card className="mb-8">
            <CardHeader>
                <CardTitle className="text-2xl">Version 6.7.0 - The Strategist Update</CardTitle>
                <CardDescription>
                    This is a huge update focused on account security and strategic gameplay. We're introducing a mandatory PIN system and a dynamic "Flash Sale" for investment buffs to make your experience more secure and exciting!
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div>
                    <h3 className="text-xl font-semibold flex items-center gap-2 mb-4"><Star className="text-accent" /> New Features & Major Enhancements</h3>
                    <div className="space-y-6 pl-6 relative before:absolute before:left-2 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
                        
                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-accent" />
                            <h4 className="font-semibold text-primary">Security PIN System</h4>
                            <p className="mt-2 text-muted-foreground">
                                For your security, a 4-digit PIN is now required upon signup. You will use this PIN to log in to new sessions, adding a strong layer of protection to your account.
                            </p>
                        </div>
                        
                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-accent" />
                            <h4 className="font-semibold text-primary">Buff Shop "Flash Sales"</h4>
                            <p className="mt-2 text-muted-foreground">
                                Investment buffs are now sold during limited-time, limited-quantity flash sales! This adds a new layer of strategy to the game.
                            </p>
                            <ul className="list-disc list-outside ml-5 mt-2 space-y-2 text-muted-foreground">
                                <li><strong className="text-foreground">One Buff Per Sale:</strong> You can only purchase ONE buff per flash sale event, so choose wisely!</li>
                                <li><strong className="text-foreground">Strategic Availability:</strong> The +17% buff is available every sale, the +25% buff appears twice a day, and the powerful +50% buff appears only once per day and has a 14-day cooldown after purchase.</li>
                                <li><strong className="text-foreground">Dynamic Pricing:</strong> The price of each buff increases every time you buy it, so plan your purchases carefully.</li>
                            </ul>
                        </div>

                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-accent" />
                            <h4 className="font-semibold text-primary">Enhanced Shop UI</h4>
                            <p className="mt-2 text-muted-foreground">
                                The buff shop is now more informative! A new "Tips & Reminders" card explains the sale rules, and each buff displays a "Flash Sale" tag and its specific availability to help you strategize.
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card className="mb-8">
            <CardHeader>
                <CardTitle className="text-2xl">Version 6.0.0 - The Experience Update</CardTitle>
                <CardDescription>
                    Welcome to a major update focused on user experience! This version introduces a brand new, immersive welcome screen, a dynamic dashboard carousel, smarter typing indicators, and avatar selection during sign-up.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div>
                    <h3 className="text-xl font-semibold flex items-center gap-2 mb-4"><Star className="text-accent" /> New Features & Enhancements</h3>
                    <div className="space-y-6 pl-6 relative before:absolute before:left-2 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
                        
                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-accent" />
                            <h4 className="font-semibold text-primary">New User Welcome Experience</h4>
                            <p className="mt-2 text-muted-foreground">
                                First-time visitors will now be greeted with a beautiful, multi-step welcome screen. This guided tour introduces the portal's core features—like Credits, the Shop, and the Arena—in a fun and exciting way.
                            </p>
                        </div>
                        
                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-accent" />
                            <h4 className="font-semibold text-primary">Interactive Dashboard Carousel</h4>
                            <p className="mt-2 text-muted-foreground">
                               The dashboard now features a dynamic "Explore the App" section. This clickable image carousel allows users to quickly jump to key pages like the Arena, Invest Hub, and more.
                            </p>
                        </div>

                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-accent" />
                            <h4 className="font-semibold text-primary">Dynamic Typing Indicators</h4>
                            <ul className="list-disc list-outside ml-5 mt-2 space-y-2 text-muted-foreground">
                                <li><strong className="text-foreground">Global Chat:</strong> A single, elegant typing bubble now appears when multiple users are typing, showing their avatars stacked beside it.</li>
                                <li><strong className="text-foreground">Private Chat:</strong> The typing indicator is now smaller, perfectly aligned, and positioned comfortably near the text input for a cleaner look.</li>
                                <li><strong className="text-foreground">Smarter Logic:</strong> All typing indicators are now triggered by focus, meaning they only appear when a user is actively typing in the input field.</li>
                            </ul>
                        </div>

                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-accent" />
                            <h4 className="font-semibold text-primary">Avatar Selection on Sign-up</h4>
                            <p className="mt-2 text-muted-foreground">
                                New users can now choose their avatar from a carousel of options directly on the sign-up page, personalizing their profile from the very beginning.
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
        
        <Card className="mb-8">
            <CardHeader>
                <CardTitle className="text-2xl">Version 5.0.0 - The Simplicity Update</CardTitle>
                <CardDescription>
                    Welcome to Version 5! This is a massive visual overhaul focused on a clean, modern, and simple design. It features a new professional color scheme, a redesigned dashboard, and streamlined navigation for a premium user experience.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div>
                    <h3 className="text-xl font-semibold flex items-center gap-2 mb-4"><Star className="text-accent" /> Total Visual Redesign</h3>
                    <div className="space-y-6 pl-6 relative before:absolute before:left-2 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
                        
                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-accent" />
                            <h4 className="font-semibold text-primary">New Professional Color Scheme</h4>
                            <p className="mt-2 text-muted-foreground">
                                The app now uses a clean, off-white background with a striking red-orange for primary actions and accents, creating a more modern and premium feel.
                            </p>
                        </div>

                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-accent" />
                            <h4 className="font-semibold text-primary">Redesigned Dashboard</h4>
                            <p className="mt-2 text-muted-foreground">
                                The dashboard has been completely revamped with a beautiful new gradient credits card, updated quick actions, and a live "Active Players" card.
                            </p>
                        </div>
                        
                         <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-accent" />
                            <h4 className="font-semibold text-primary">Streamlined UI & Icons</h4>
                             <p className="mt-2 text-muted-foreground">
                                Navigation and icons have been simplified across the app for a more intuitive and cleaner user experience.
                            </p>
                        </div>

                    </div>
                </div>
            </CardContent>
        </Card>

        <Card className="mb-8">
            <CardHeader>
                <CardTitle className="text-2xl">Version 4.0.0 - The Iconic Update</CardTitle>
                <CardDescription>
                   Maligayang pagdating sa pinakamalaki at pinaka-iconic na update sa kasaysayan ng Icie Wifi Portal! Ang bersyon 4.0.0, ang "Iconic" Update, ay naghahatid ng mga kritikal na pag-aayos sa mga pangunahing feature, malalaking pagpapabuti sa user experience, at isang kumpletong visual overhaul sa aming mga premium na tema para gawin itong tunay na maalamat.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div>
                    <h3 className="text-xl font-semibold flex items-center gap-2 mb-4"><Star className="text-accent" /> Mga Bagong Feature at Major Enhancements</h3>
                    <div className="space-y-6 pl-6 relative before:absolute before:left-2 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
                        
                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-accent" />
                            <h4 className="font-semibold text-primary">Iconic Premium Themes</h4>
                            <p className="mt-2 text-muted-foreground">
                                Ang "Golden" at "How It's Done" themes ay ganap na ni-redesign mula sa simula para maghatid ng isang tunay na premium, malinis, at kumportableng karanasan.
                            </p>
                        </div>

                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-accent" />
                            <h4 className="font-semibold text-primary">Pinahusay na Tic-Tac-Toe Experience</h4>
                            <ul className="list-disc list-outside ml-5 mt-2 space-y-2 text-muted-foreground">
                                <li><strong className="text-foreground">Mga Epektibong Taunt Bubbles:</strong> Ang mga mensahe ng pang-aasar ay isa na ngayong mas nakikitang speech bubble na lumalabas sa itaas ng avatar ng player.</li>
                                 <li><strong className="text-foreground">Malinaw na "Movement Phase" Modal:</strong> Isang persistent modal sa Tagalog ang lalabas na ngayon para sa parehong player, na nagsasaad na oras na para ilipat ang mga piyesa.</li>
                            </ul>
                        </div>
                        
                         <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-accent" />
                            <h4 className="font-semibold text-primary">New Seasonal BGM</h4>
                             <p className="mt-2 text-muted-foreground">
                                Idinagdag ang "Last Christmas" sa playlist ng background music para sa holiday season!
                            </p>
                        </div>

                    </div>
                </div>
                
                <Separator />

                <div>
                    <h3 className="text-xl font-semibold flex items-center gap-2 mb-4"><Bug className="text-destructive" /> Mga Kritikal na Pag-aayos ng Bug</h3>
                     <div className="space-y-6 pl-6 relative before:absolute before:left-2 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-destructive" />
                            <h4 className="font-semibold text-primary">NAAYOS NA - "Invisible User" Bug sa Online Status</h4>
                             <p className="mt-2 text-muted-foreground">
                               Inayos ang isang game-breaking bug kung saan ang mga user ay hindi lumalabas bilang "active" sa "Who's Online" list. Ipinakilala namin ang isang bagong "heartbeat" system na regular na nag-a-update sa status ng user.
                            </p>
                        </div>
                         <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-destructive" />
                            <h4 className="font-semibold text-primary">NAAYOS NA - Kumpletong Pag-aayos sa Witch Hunt Game</h4>
                             <p className="mt-2 text-muted-foreground">
                              Inayos ang isang serye ng mga kritikal na bug na sumira sa Witch Hunt game, na ginagawa itong ganap na patas at nape-play na ngayon. Kabilang dito ang pag-aayos sa mga nakikitang card, tamang card reveal sequence, at UI.
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card className="mb-8">
            <CardHeader>
                <CardTitle className="text-2xl">Version 3.5.0 - The "Clarity" Update</CardTitle>
                <CardDescription>
                   Maligayang pagdating sa "Clarity" Update! Nakatuon ang bersyong ito sa pagbibigay ng mas malinaw at mas madaling maunawaan na karanasan para sa lahat, lalo na sa mga bagong user, habang inaayos ang mga kritikal na isyu.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div>
                    <h3 className="text-xl font-semibold flex items-center gap-2 mb-4"><Star className="text-accent" /> Mga Bagong Feature at UX Improvements</h3>
                    <div className="space-y-6 pl-6 relative before:absolute before:left-2 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
                        
                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-accent" />
                            <h4 className="font-semibold text-primary">Tic-Tac-Toe Taunts!</h4>
                            <p className="mt-2 text-muted-foreground">
                                Gawing mas masaya ang laban! Pindutin ang bagong "Taunt" button sa Tic-Tac-Toe para magpadala ng mga pre-set na mensahe sa iyong kalaban at iparamdam ang iyong presence!
                            </p>
                        </div>

                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-accent" />
                            <h4 className="font-semibold text-primary">Seasonal Theme & BGM</h4>
                            <p className="mt-2 text-muted-foreground">
                                Damhin ang diwa ng kapaskuhan gamit ang bagong <strong className="text-foreground">Christmas Theme at Background Music</strong>! Automatic itong mag-a-activate sa buong app sa panahon ng event.
                            </p>
                        </div>
                        
                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-accent" />
                            <h4 className="font-semibold text-primary">Guided New User Experience</h4>
                             <p className="mt-2 text-muted-foreground">
                                Para sa mga bagong dating, ipinakikilala namin ang isang mas malinaw na welcome flow:
                            </p>
                             <ul className="list-disc list-outside ml-5 mt-2 space-y-2 text-muted-foreground">
                                <li>Isang bagong <strong className="text-foreground">"Quick Guide" modal</strong> ang magpapakita pagkatapos ng welcome sequence, na nagha-highlight sa <strong className="text-foreground">97% first-purchase discount</strong> para hikayatin kang subukan ang shop.</li>
                                 <li>Ang homepage ay naka-lock na ngayon hanggang sa unang pag-play ng background music para sa isang mas immersive na unang experience.</li>
                                 <li>Inalis na ang delay sa pagitan ng mga welcome modal para sa mas mabilis na onboarding.</li>
                            </ul>
                        </div>

                         <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-accent" />
                            <h4 className="font-semibold text-primary">Clearer Battle Button for New Users</h4>
                            <p className="mt-2 text-muted-foreground">
                               Sa "Who's Online" page, isang malinaw na text sa Tagalog ang ipapakita na ngayon sa ilalim ng "Laban" button, na nagsasabing <strong className="text-foreground">"Kailangan munang bumili sa shop para makapaghamon,"</strong> para malaman ng mga bagong user kung paano i-unlock ang feature.
                            </p>
                        </div>
                        
                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-accent" />
                            <h4 className="font-semibold text-primary">Event Prize Claim Modal</h4>
                            <p className="mt-2 text-muted-foreground">
                                Kapag na-reach mo na ang isang event milestone sa Arena, isang <strong className="text-foreground">pop-up modal</strong> na ngayon ang lalabas para i-congratulate ka at bigyan ka ng direktang link para i-claim ang iyong premyo sa Events tab.
                            </p>
                        </div>

                    </div>
                </div>
                
                <Separator />

                <div>
                    <h3 className="text-xl font-semibold flex items-center gap-2 mb-4"><Bug className="text-destructive" /> Mga Kritikal na Pag-aayos ng Bug</h3>
                     <div className="space-y-6 pl-6 relative before:absolute before:left-2 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-destructive" />
                            <h4 className="font-semibold text-primary">NAAYOS NA - Recurring Dialog Crash</h4>
                             <p className="mt-2 text-muted-foreground">
                               Inayos ang isang paulit-ulit na <strong className="text-foreground">accessibility crash</strong> na dulot ng mga nawawalang `DialogTitle` sa maraming modals sa buong application. Ang app ay mas stable na ngayon.
                            </p>
                        </div>
                         <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-destructive" />
                            <h4 className="font-semibold text-primary">NAAYOS NA - Homepage Component Crashes</h4>
                             <p className="mt-2 text-muted-foreground">
                               Inayos ang mga error na "is not defined" na nagdulot ng pag-crash sa homepage, na may kaugnayan sa mga nawawalang component imports para sa `DialogTrigger` at `SheetTrigger`.
                            </p>
                        </div>
                         <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-destructive" />
                            <h4 className="font-semibold text-primary">NAAYOS NA - Broken Welcome Flow</h4>
                             <p className="mt-2 text-muted-foreground">
                               Inayos ang may depektong logic na pumigil sa welcome modal sequence na gumana nang tama, na tinitiyak na lahat ng bagong user ay makakakita na ngayon ng tamang onboarding flow.
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
        
        <Card className="mb-8">
            <CardHeader>
                <CardTitle className="text-2xl">Version 3.2.0 - The Perseverance Update</CardTitle>
                <CardDescription>
                   Sa wakas, nandito na ang isang major free buff para sa lahat at ang mga kritikal na pag-aayos na hinihintay niyo! Pinaghirapan namin ito, at nagpapasalamat kami sa inyong tiyaga.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div>
                    <h3 className="text-xl font-semibold flex items-center gap-2 mb-4"><Star className="text-accent" /> Mga Bagong Feature</h3>
                    <div className="space-y-6 pl-6 relative before:absolute before:left-2 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
                        
                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-accent" />
                            <h4 className="font-semibold text-primary">Libreng Investment Buff Para sa Lahat!</h4>
                            <p className="mt-2 text-muted-foreground">
                                Tama! Lahat ng users, bago man o luma, ay maaari nang kumuha ng isang beses na <strong className="text-foreground">+30% Win Chance buff</strong> para sa Investment Hub. Hanapin ang "Claim Your Free Buff" card sa Invest page para makuha ang iyong libreng pampalakas.
                            </p>
                        </div>

                         <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-accent" />
                            <h4 className="font-semibold text-primary">Congratulatory Pop-up</h4>
                            <p className="mt-2 text-muted-foreground">
                                Pagkatapos mong i-claim ang iyong libreng buff, isang "Congratulations!" modal ang lalabas para kumpirmahin ang iyong tagumpay.
                            </p>
                        </div>

                    </div>
                </div>
                
                <Separator />

                <div>
                    <h3 className="text-xl font-semibold flex items-center gap-2 mb-4"><Bug className="text-destructive" /> Mga Kritikal na Pag-aayos ng Bug</h3>
                     <div className="space-y-6 pl-6 relative before:absolute before:left-2 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
                        <div className="relative pl-6">
                            <div className="absolute -left-3 top-1.5 h-4 w-4 rounded-full bg-destructive" />
                            <h4 className="font-semibold text-primary">NAAYOS NA - Unclaimable Free Buff</h4>
                             <p className="mt-2 text-muted-foreground">
                                Ang pinaka-nakakainis na bug kung saan hindi ma-claim ang libreng investment buff ay tuluyan nang naayos. Inayos namin ang isyu sa <strong className="text-foreground">"static button"</strong>, mga crash sa build, at ang mga <strong className="text-foreground">critical na security rule sa Firestore</strong> na tahimik na humaharang sa transaction. Gumagana na ngayon ang claim button para sa lahat.
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card className="mb-8">
            <CardHeader>
                <CardTitle className="text-2xl">Version 2.7.0 - The Strategist Update</CardTitle>
                <CardDescription>
                   Ipinapakilala ang isang mas dynamic na sistema ng investment at mga pagbabago sa balancing para sa mas strategic na gameplay. Ang update na ito ay naglalayong magbigay ng gantimpala sa pangmatagalang pagpaplano.
                </CardDescription>
            </CardHeader>
        </Card>

        <Card className="mb-8">
            <CardHeader>
                <CardTitle className="text-2xl">Version 2.6.9 - Ang Pasasalamat Update</CardTitle>
                <CardDescription>
                    Maligayang pagdating sa "Pasasalamat" Update! Ang patch na ito ay nagpapakilala ng mga makabuluhang pagpapabuti sa karanasan ng user, mga kritikal na pag-aayos ng bug, at isang mas pinahusay na sistema ng trial.
                </CardDescription>
            </CardHeader>
        </Card>

        <Card className="mb-8">
            <CardHeader>
                <CardTitle className="text-2xl">Version 2.5 - The "Pagbabago" Update</CardTitle>
                 <CardDescription>Ang patch na ito ay nagpapakilala ng isang malaking pagbabago sa Tic-Tac-Toe, mga bagong feature sa chat, at ilang mahahalagang pag-aayos para mapabuti ang iyong pangkalahatang karanasan.</CardDescription>
            </CardHeader>
        </Card>
    </div>
  );
}

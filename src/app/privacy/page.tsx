
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="flex-1 w-full bg-background">
       <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
            <Logo />
            <Button asChild>
                <Link href="/signup">Magsimula</Link>
            </Button>
        </div>
      </header>
    
      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-headline font-extrabold text-primary mb-6">Patakaran sa Privacy</h1>
            <p className="text-muted-foreground mb-8">Huling Na-update: {new Date().toLocaleDateString()}</p>
            
            <div className="prose dark:prose-invert max-w-none space-y-6 text-foreground">
                <p>Ang iyong privacy ay mahalaga sa amin. Patakaran ng Icie Wifi Portal na igalang ang iyong privacy tungkol sa anumang impormasyon na maaari naming kolektahin mula sa iyo sa aming aplikasyon.</p>
                
                <h2 className="text-2xl font-bold text-primary">1. Impormasyong Kinokolekta Namin</h2>
                <p>Hinihingi lamang namin ang personal na impormasyon kapag talagang kailangan namin ito para magbigay ng serbisyo sa iyo. Kinokolekta namin ito sa patas at legal na paraan, na may kaalaman at pahintulot mo. Sinasabi rin namin sa iyo kung bakit namin ito kinokolekta at kung paano ito gagamitin.</p>
                <p>Ang mga uri ng impormasyon na aming kinokolekta ay kinabibilangan ng:</p>
                <ul className="list-disc list-inside space-y-2">
                    <li><strong>Impormasyon ng Account:</strong> Kapag gumawa ka ng account, kinokolekta namin ang iyong buong pangalan, email address, at napiling avatar URL. Ang iyong password ay naka-encrypt at hindi namin nakikita.</li>
                    <li><strong>Usage Data:</strong> Maaari naming kolektahin ang impormasyon kung paano ina-access at ginagamit ang serbisyo. Maaaring kasama dito ang impormasyon tulad ng IP address ng iyong computer (para sa layuning i-verify ang koneksyon sa aming lokal na WiFi network), uri ng browser, at mga pahinang binibisita mo.</li>
                </ul>

                <h2 className="text-2xl font-bold text-primary">2. Paano Namin Ginagamit ang Iyong Impormasyon</h2>
                <p>Ginagamit namin ang impormasyong aming kinokolekta sa iba't ibang paraan, kabilang ang:</p>
                <ul className="list-disc list-inside space-y-2">
                    <li>Pagbibigay, pagpapatakbo, at pagpapanatili ng aming serbisyo.</li>
                    <li>Pamamahala ng iyong account at iyong virtual credit balance.</li>
                    <li>Pagproseso ng iyong mga transaksyon para sa pagbili ng voucher.</li>
                    <li>Pakikipag-ugnayan sa iyo, direkta man o sa pamamagitan ng isa sa aming mga partner, para sa customer service, para bigyan ka ng mga update at iba pang impormasyon na may kaugnayan sa web app.</li>
                    <li>Pag-verify ng koneksyon sa "Icie Wifi" network para magbigay ng access sa mga exclusive na feature tulad ng Icie Arena.</li>
                </ul>

                <h2 className="text-2xl font-bold text-primary">3. Pag-iimbak at Seguridad ng Data</h2>
                <p>Pinapanatili lamang namin ang nakolektang impormasyon hangga't kinakailangan para maibigay sa iyo ang iyong hiniling na serbisyo. Ang data na aming iniimbak, ay poprotektahan namin sa loob ng komersyal na katanggap-tanggap na paraan para maiwasan ang pagkawala at pagnanakaw, pati na rin ang hindi awtorisadong pag-access, pagsisiwalat, pagkopya, paggamit o pagbabago.</p>
                <p>Ginagamit namin ang Firebase Authentication at Firestore para sa pag-iimbak ng data, na mga serbisyong ibinibigay ng Google, at gumagamit sila ng mga standard na panukalang panseguridad sa industriya.</p>

                <h2 className="text-2xl font-bold text-primary">4. Pagbabahagi ng Impormasyon</h2>
                <p>Hindi namin ibinabahagi ang anumang personal na pagkakakilanlan sa publiko o sa mga third-party, maliban kung kinakailangan ng batas.</p>

                <h2 className="text-2xl font-bold text-primary">5. Ang Iyong mga Karapatan</h2>
                <p>Malaya kang tumanggi sa aming kahilingan para sa iyong personal na impormasyon, sa pag-unawa na maaaring hindi namin maibigay sa iyo ang ilan sa iyong mga nais na serbisyo. Maaari mong makita at i-update ang iyong personal na impormasyon (Display Name at Avatar) sa iyong profile page anumang oras.</p>

                <h2 className="text-2xl font-bold text-primary">6. Mga Link sa Ibang Site</h2>
                <p>Ang aming serbisyo ay maaaring mag-link sa mga external na site na hindi namin pinapatakbo. Mangyaring magkaroon ng kamalayan na wala kaming kontrol sa nilalaman at mga kasanayan ng mga site na ito, at hindi kami maaaring tumanggap ng responsibilidad o pananagutan para sa kani-kanilang mga patakaran sa privacy.</p>

                <h2 className="text-2xl font-bold text-primary">7. Mga Pagbabago sa Patakarang Ito</h2>
                 <p>Maaari naming i-update ang aming Patakaran sa Privacy paminsan-minsan. Aabisuhan ka namin sa anumang pagbabago sa pamamagitan ng pag-post ng bagong Patakaran sa Privacy sa pahinang ito. Pinapayuhan kang suriin ang Patakaran sa Privacy na ito nang pana-panahon para sa anumang pagbabago.</p>

                <h2 className="text-2xl font-bold text-primary">Makipag-ugnayan sa Amin</h2>
                <p>Kung mayroon kang anumang mga katanungan o alalahanin tungkol sa aming patakaran sa privacy, mangyaring makipag-ugnayan sa service administrator.</p>
            </div>
        </div>
      </main>
    </div>
  );
}

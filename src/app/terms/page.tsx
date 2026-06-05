
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TermsOfServicePage() {
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
            <h1 className="text-4xl md:text-5xl font-headline font-extrabold text-primary mb-6">Mga Tuntunin ng Serbisyo</h1>
            <p className="text-muted-foreground mb-8">Huling Na-update: {new Date().toLocaleDateString()}</p>
            
            <div className="prose dark:prose-invert max-w-none space-y-6 text-foreground">
                <p>Welcome sa Icie Wifi Portal! Ang mga tuntunin at kundisyong ito ay naglalahad ng mga patakaran at regulasyon para sa paggamit ng aming aplikasyon at mga serbisyo.</p>
                
                <h2 className="text-2xl font-bold text-primary">1. Pagtanggap ng mga Tuntunin</h2>
                <p>Sa paggawa ng account at paggamit ng aming mga serbisyo, sumasang-ayon kang sumunod sa mga Tuntunin ng Serbisyo na ito. Kung hindi ka sumasang-ayon sa anumang bahagi ng mga tuntunin, hindi mo maaaring gamitin ang serbisyo.</p>

                <h2 className="text-2xl font-bold text-primary">2. Deskripsyon ng Serbisyo</h2>
                <p>Ang Icie Wifi Portal ay isang web application na idinisenyo para pamahalaan at pagandahin ang karanasan ng mga gumagamit ng "Icie Piso Wifi" network. Ang serbisyo ay nagbibigay-daan sa mga user na bumili ng WiFi vouchers, pamahalaan ang kanilang mga account, at sumali sa mga promotional events.</p>

                <h2 className="text-2xl font-bold text-primary">3. Mga User Account</h2>
                <p>Para ma-access ang karamihan sa mga feature ng serbisyo, kailangan mong gumawa ng account. Ikaw ay responsable sa pag-iingat ng iyong password at sa anumang aktibidad o aksyon sa ilalim ng iyong account. May karapatan kaming i-terminate ang mga account, sa aming sariling pagpapasya.</p>
                <p>Para masigurado ang patas na paggamit, ang paggawa ng maraming account ng iisang user o mula sa iisang device ay mahigpit na ipinagbabawal.</p>

                <h2 className="text-2xl font-bold text-primary">4. Pagkuha ng Credits</h2>
                <p>Ang credits ay ang virtual points na ginagamit sa loob ng Icie Wifi Portal. Maaari itong makuha sa mga sumusunod na paraan:</p>
                 <ul className="list-disc list-inside space-y-2">
                    <li><strong>Voucher Bonus:</strong> Ang ilang pisikal na WiFi voucher na binili mula sa vendo machine ay maaaring may kasamang bonus na "Credit Code" na maaaring i-redeem para sa credits sa portal.</li>
                    <li><strong>Direktang Pagbili:</strong> Ang mga user ay maaaring bumili ng credit codes direkta mula sa service administrator/owner.</li>
                    <li><strong>Promotional Events:</strong> Ang mga user ay maaaring manalo ng credits sa pamamagitan ng pagsali sa mga promotional games at aktibidad sa loob ng "Icie Arena".</li>
                </ul>

                <h2 className="text-2xl font-bold text-primary">5. Virtual Credits at Promotional Games</h2>
                <p>Kasama sa serbisyo ang isang sistema ng "Credits" at isang game section na tinatawag na "Icie Arena". Mahalagang maunawaan ang kalikasan ng mga feature na ito:</p>
                <ul className="list-disc list-inside space-y-2">
                    <li><strong>Walang Halaga sa Pera:</strong> Ang "Credits" ay mga virtual points na walang cash value, hindi maaaring ipagpalit sa pera, at hindi maaaring ibenta, ipagpalit, o ilipat. Ang tanging layunin nito ay para i-redeem ang WiFi vouchers sa loob ng portal na ito.</li>
                    <li><strong>Layuning Promosyonal:</strong> Ang "Icie Arena" at ang mga laro nito ay para lamang sa entertainment at promotional purposes. Ito ay nilalayong maging isang masayang aktibidad para sa aming mga customer sa WiFi.</li>
                    <li><strong>Hindi Pagsusugal:</strong> Ang mga aktibidad sa loob ng Icie Arena ay hindi bumubuo ng pagsusugal. Walang pagkakataon na manalo ng totoong pera o mga premyo na may halaga sa tunay na mundo. Ang mga panalo ay nasa anyo ng "Credits," na maaari lamang gamitin sa loob ng aming serbisyo para i-redeem ang WiFi vouchers.</li>
                    <li><strong>Gastos sa Laro:</strong> Ang "cost" para maglaro ay ibabawas mula sa iyong "Credits" balance. Ang mga credits na ito ay bahagi ng promotional system at hindi kumakatawan sa isang monetary na taya.</li>
                </ul>

                <h2 className="text-2xl font-bold text-primary">6. Limitasyon ng Pananagutan</h2>
                <p>Hanggang sa sukdulang pinahihintulutan ng naaangkop na batas, ang Icie Wifi Portal at ang mga may-ari nito ay hindi mananagot para sa anumang hindi direkta, incidental, espesyal, kinahinatnan, o parusang pinsala, o anumang pagkawala ng kita, direkta man o hindi direkta, o anumang pagkawala ng data, paggamit, goodwill, o iba pang hindi nasasalat na pagkawala, na nagresulta mula sa (i) iyong pag-access o paggamit o kawalan ng kakayahang mag-access o gumamit ng serbisyo; (ii) anumang pag-uugali o nilalaman ng anumang third party sa serbisyo.</p>
                <p>Ang mga laro at promotional events ay ibinibigay sa isang "as is" na batayan nang walang anumang uri ng warranty. Hindi namin ginagarantiyahan na ang mga laro ay magiging error-free o walang patid.</p>

                <h2 className="text-2xl font-bold text-primary">7. Namamahalang Batas</h2>
                <p>Ang mga Tuntuning ito ay pamamahalaan at bibigyang-kahulugan alinsunod sa mga batas ng lokal na hurisdiksyon kung saan pinapatakbo ang serbisyo, nang hindi isinasaalang-alang ang mga salungat na probisyon ng batas nito. Anumang mga hindi pagkakaunawaan ay hahawakan sa naaangkop na lokal na korte.</p>

                 <h2 className="text-2xl font-bold text-primary">8. Mga Pagbabago sa mga Tuntunin</h2>
                <p>May karapatan kami, sa aming sariling pagpapasya, na baguhin o palitan ang mga Tuntuning ito anumang oras. Magbibigay kami ng abiso sa anumang pagbabago sa pamamagitan ng pag-post ng bagong Tuntunin ng Serbisyo sa pahinang ito.</p>

                <h2 className="text-2xl font-bold text-primary">Makipag-ugnayan sa Amin</h2>
                <p>Kung mayroon kang anumang mga katanungan tungkol sa mga Tuntuning ito, mangyaring makipag-ugnayan sa service administrator.</p>
            </div>
        </div>
      </main>
    </div>
  );
}

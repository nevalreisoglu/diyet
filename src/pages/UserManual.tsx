import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  Utensils,
  Droplets,
  Dumbbell,
  Coffee,
  Camera,
  Mic,
  FileText,
  History,
  BarChart2,
  Trophy,
  TrendingDown,
  Dna,
  Settings,
  Smartphone,
  Crown,
  BookOpen,
  Star,
} from 'lucide-react';

// ─── Veri ────────────────────────────────────────────────────────────────────

const sections = [
  {
    value: 'meals',
    icon: Utensils,
    title: 'Öğün & Kalori Takibi',
    description: 'Günlük besin alımınızı kayıt altına alın',
    items: [
      {
        name: 'Öğün Ekleme',
        desc: 'Kahvaltı, öğle, akşam yemeği ve 3 ara öğün için yiyecek ekleyebilirsiniz. Her öğünün yanındaki "+ Ekle" butonuna dokunun, yiyeceği arayın, porsiyon seçin ve kaydedin.',
      },
      {
        name: 'Öğün Saati Ayarlama',
        desc: 'Her öğünün saat bilgisini özelleştirebilirsiniz. Öğün başlığının yanındaki saat simgesine dokunun.',
      },
      {
        name: 'Günlük Kalori Hedefi',
        desc: 'Üstteki halka grafik, günlük kalori hedefinize ne kadar yaklaştığınızı gösterir. Hedefinizi Ayarlar sayfasından değiştirebilirsiniz.',
      },
      {
        name: 'Hızlı İstatistikler',
        desc: 'Ana sayfa üstündeki kartlar; toplam kalori, protein, karbonhidrat ve yağ özetini anlık olarak gösterir.',
      },
      {
        name: 'Sık Kullanılan Yiyecekler',
        desc: 'Daha önce eklediğiniz yiyecekler "Sık kullanılanlar" listesinde öne çıkar; tek dokunuşla tekrar ekleyebilirsiniz.',
      },
    ],
  },
  {
    value: 'input',
    icon: Camera,
    title: 'Yemek Giriş Yöntemleri',
    description: 'Manuel, fotoğraf veya sesli kayıt',
    items: [
      {
        name: 'Manuel Arama',
        desc: 'Yiyecek adını yazarak geniş besin veri tabanında arama yapabilirsiniz. Sonuçlar kalori ve makro değerlerini gösterir.',
      },
      {
        name: 'Fotoğraftan Tanıma (AI)',
        premium: true,
        desc: 'Kamera veya galeriden fotoğraf yükleyin; yapay zeka yiyeceği otomatik tanıyıp tahmini kalorisini hesaplar. Öğün ekleme ekranındaki kamera simgesini kullanın.',
      },
      {
        name: 'Sesli Giriş',
        desc: 'Mikrofon simgesine basılı tutun ve "200 gram tavuk göğsü" gibi söyleyin. Uygulama sesi metne çevirip otomatik arama yapar.',
      },
      {
        name: 'PDF Yiyecek Listesi',
        desc: 'Kendi hazırladığınız bir diyet programını veya besin tablosunu PDF olarak yükleyin. Uygulama dosyadan yiyecek listesi oluşturur ve arama sırasında kullanır.',
      },
    ],
  },
  {
    value: 'trackers',
    icon: Droplets,
    title: 'Günlük Takip Araçları',
    description: 'Su, egzersiz ve içecek takibi',
    items: [
      {
        name: 'Su Takibi',
        desc: 'Her bardak simgesine dokunarak 250 ml su ekleyebilirsiniz. Hedef varsayılan olarak 2000 ml\'dir; Ayarlar\'dan özelleştirilebilir.',
      },
      {
        name: 'Kahve & Çay Takibi',
        desc: 'İçtiğiniz kahve ve çay bardaklarını kayıt altına alın. Kafein tüketimini kontrol etmek için yararlıdır.',
      },
      {
        name: 'Spor Takibi',
        desc: 'Günlük egzersiz sürenizi dakika olarak girin. Varsayılan hedef 30 dakikadır. Kayıt, günlük rozet ve metabolik hesaplamalar için kullanılır.',
      },
    ],
  },
  {
    value: 'history',
    icon: History,
    title: 'Geçmiş & Kayıtlar',
    description: 'Son 14 günün detaylı görünümü',
    items: [
      {
        name: 'Günlük Kartlar',
        desc: 'Geçmiş sayfasında her gün için toplam kalori, su ve egzersiz özeti görüntülenir. Karta dokunarak öğün detaylarını açabilirsiniz.',
      },
      {
        name: 'Geçmiş Kayıt Düzenleme',
        desc: 'Geçmiş günlerin yiyeceklerini ekleyip silebilirsiniz. Su miktarını da +/- butonlarıyla düzenleyebilirsiniz.',
      },
      {
        name: 'Excel\'e Aktar',
        desc: 'Geçmiş sayfasında "Excele Aktar" butonuyla son 14 günlük verilerinizi .xlsx dosyası olarak indirebilirsiniz.',
      },
    ],
  },
  {
    value: 'premium',
    icon: Crown,
    title: 'Premium Özellikler',
    description: 'Aylık abonelikle tüm gelişmiş araçlar',
    premium: true,
    items: [
      {
        name: 'Başarı Rozetleri',
        premium: true,
        desc: 'Günlük hedeflere ulaştığınızda rozet kazanırsınız: Spor Yıldızı (30+ dk egzersiz), Kalori Ustası (kalori hedefine ulaş), Su Kahramanı (su hedefine ulaş), Kafein Kontrolcüsü (≤3 fincan kahve/çay).',
      },
      {
        name: 'AI Kilo Tahmini',
        premium: true,
        desc: 'Son 90 günlük verinize göre gelecek 1 hafta, 1 ay ve 3 ay için kilo tahmini üretir. Hedefe ulaşma tarihini, güven aralıklarını ve farklı tahmin modellerini gösterir.',
      },
      {
        name: 'Haftalık Grafikler',
        premium: true,
        desc: 'Son 7 günün kalori ve egzersiz verilerini çubuk grafiklerle görselleştirir. Haftalık ortalama ve toplam değerleri anlık özetler.',
      },
      {
        name: 'Metabolik İkiz',
        premium: true,
        desc: 'Kişisel metabolizma simülasyonunuz. Dört sekme içerir: Profil (BMR, TDEE, BMI), Skor (günlük metabolik puan), Eğer-O-Zaman (senaryo simülatörü) ve Analiz (kişiselleştirilmiş içgörüler).',
      },
    ],
  },
  {
    value: 'settings',
    icon: Settings,
    title: 'Ayarlar & Profil',
    description: 'Hedeflerinizi ve bilgilerinizi yapılandırın',
    items: [
      {
        name: 'Günlük Hedefler',
        desc: 'Kalori (kcal) ve su (ml) hedeflerinizi özelleştirin.',
      },
      {
        name: 'Kilo Bilgileri',
        desc: 'Mevcut kilo, hedef kilo ve hedefe ulaşmak istediğiniz süreyi girin (1–12 ay). Bu bilgiler kilo tahmini ve metabolik hesaplamalar için kullanılır.',
      },
      {
        name: 'Fiziksel Bilgiler',
        desc: 'Boy (cm), yaş ve cinsiyet bilgilerini girin. Metabolik İkiz ve BMR/TDEE hesaplamaları için gereklidir.',
      },
      {
        name: 'Görünen Ad',
        desc: 'Uygulamada görünmesini istediğiniz ismi ayarlayabilirsiniz.',
      },
      {
        name: 'Premium Abonelik',
        desc: 'Abonelik durumunuzu ve yenileme tarihini görüntüleyin. Müşteri portalından iptal veya ödeme yönetimi yapabilirsiniz.',
      },
    ],
  },
  {
    value: 'install',
    icon: Smartphone,
    title: 'Uygulamayı Yükleme (PWA)',
    description: 'Ana ekrana ekleyerek uygulama gibi kullanın',
    items: [
      {
        name: 'Android',
        desc: 'Uygulamanın alt menüsündeki "Yükle" sekmesine gidin ya da tarayıcı menüsünden "Ana ekrana ekle" seçeneğini kullanın.',
      },
      {
        name: 'iPhone / iPad',
        desc: 'Safari\'de sayfayı açın → Paylaş simgesi → "Ana Ekrana Ekle" → "Ekle" butonuna dokunun.',
      },
    ],
  },
];

// ─── Bileşen ──────────────────────────────────────────────────────────────────

const UserManual = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />

      <main className="container max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {/* Başlık */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Kullanım Rehberi</h2>
            <p className="text-xs text-muted-foreground">Tüm özellikler ve nasıl kullanılır</p>
          </div>
        </div>

        {/* Özet kartlar */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Utensils,   label: '6 öğün türü',        color: 'text-emerald-500' },
            { icon: Camera,     label: 'AI fotoğraf tanıma', color: 'text-blue-500'    },
            { icon: Mic,        label: 'Sesli giriş',        color: 'text-violet-500'  },
            { icon: BarChart2,  label: 'Haftalık grafikler', color: 'text-amber-500'   },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border">
              <Icon className={`h-4 w-4 ${color} shrink-0`} />
              <span className="text-xs font-medium text-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* Bölümler */}
        <Accordion type="multiple" className="space-y-2">
          {sections.map(({ value, icon: Icon, title, description, premium: sectionPremium, items }) => (
            <AccordionItem
              key={value}
              value={value}
              className="border border-border rounded-xl bg-card overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30 [&[data-state=open]]:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 text-left">
                  <div className={`p-1.5 rounded-lg ${sectionPremium ? 'bg-amber-500/10' : 'bg-primary/10'}`}>
                    <Icon className={`h-4 w-4 ${sectionPremium ? 'text-amber-500' : 'text-primary'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{title}</span>
                      {sectionPremium && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-500">
                          <Crown className="h-2.5 w-2.5 mr-0.5" />
                          Premium
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-4 pt-1">
                <div className="space-y-3">
                  {items.map(({ name, desc, premium: itemPremium }) => (
                    <div key={name} className="flex gap-3">
                      <div className="mt-0.5 shrink-0">
                        <Star className="h-3.5 w-3.5 text-primary/50" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-medium text-foreground">{name}</span>
                          {itemPremium && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-500">
                              <Crown className="h-2.5 w-2.5 mr-0.5" />
                              Premium
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Alt not */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          Soru veya geri bildiriminiz için uygulama içi destek seçeneğini kullanabilirsiniz.
        </p>
      </main>
    </div>
  );
};

export default UserManual;

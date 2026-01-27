import { Leaf, Download, Check, Smartphone, Monitor, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useNavigate } from 'react-router-dom';

const Install = () => {
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const navigate = useNavigate();

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      navigate('/');
    }
  };

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="gradient-primary py-12 px-4 text-center">
        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-4">
          <Leaf className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Beslenme Günlüğü</h1>
        <p className="text-white/80">Sağlıklı yaşam takibi</p>
      </div>

      <div className="flex-1 container max-w-md mx-auto px-4 py-8 space-y-6">
        {isInstalled ? (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Uygulama Yüklendi!</h2>
              <p className="text-muted-foreground mb-4">
                Beslenme Günlüğü uygulaması telefonunuza başarıyla yüklendi.
              </p>
              <Button onClick={() => navigate('/')} className="w-full">
                Uygulamaya Git
              </Button>
            </CardContent>
          </Card>
        ) : isInstallable ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Download className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Uygulamayı Yükle</h2>
              <p className="text-muted-foreground mb-6">
                Beslenme Günlüğü'nü ana ekranınıza ekleyerek daha hızlı erişim sağlayın.
              </p>
              <Button onClick={handleInstall} className="w-full gradient-primary" size="lg">
                <Download className="h-5 w-5 mr-2" />
                Şimdi Yükle
              </Button>
            </CardContent>
          </Card>
        ) : isIOS ? (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4 text-center">iOS'ta Yükleme</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Share className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">1. Paylaş butonuna tıklayın</p>
                    <p className="text-sm text-muted-foreground">Safari'nin alt kısmındaki paylaş ikonunu kullanın</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">2. "Ana Ekrana Ekle" seçin</p>
                    <p className="text-sm text-muted-foreground">Menüde aşağı kaydırarak bulabilirsiniz</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">3. "Ekle" butonuna tıklayın</p>
                    <p className="text-sm text-muted-foreground">Uygulama ana ekranınıza eklenecek</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4 text-center">Uygulamayı Yükleyin</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Monitor className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Tarayıcı menüsünü açın</p>
                    <p className="text-sm text-muted-foreground">Chrome'da adres çubuğundaki yükleme ikonunu veya menüyü kullanın</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Download className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">"Uygulamayı Yükle" seçin</p>
                    <p className="text-sm text-muted-foreground">Veya "Ana ekrana ekle" seçeneğini kullanın</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <div className="space-y-3">
          <h3 className="font-semibold text-center">Uygulama Özellikleri</h3>
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-secondary/30">
              <CardContent className="p-4 text-center">
                <p className="text-sm font-medium">🔒 Çevrimdışı Çalışır</p>
              </CardContent>
            </Card>
            <Card className="bg-secondary/30">
              <CardContent className="p-4 text-center">
                <p className="text-sm font-medium">⚡ Hızlı Erişim</p>
              </CardContent>
            </Card>
            <Card className="bg-secondary/30">
              <CardContent className="p-4 text-center">
                <p className="text-sm font-medium">📱 Tam Ekran</p>
              </CardContent>
            </Card>
            <Card className="bg-secondary/30">
              <CardContent className="p-4 text-center">
                <p className="text-sm font-medium">🆓 Ücretsiz</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Button 
          variant="ghost" 
          onClick={() => navigate('/')} 
          className="w-full"
        >
          Tarayıcıda Devam Et
        </Button>
      </div>
    </div>
  );
};

export default Install;

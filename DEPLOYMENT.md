# Beslenme Günlüğü - Cloud Deployment Rehberi

Bu rehber, uygulamayı tamamen ücretsiz cloud servisleriyle ayağa kaldırmanızı sağlar.

## Gerekli Servisler (Tümü Ücretsiz)

| Servis | Amaç | Free Tier |
|--------|-------|-----------|
| [Supabase](https://supabase.com) | Veritabanı + Auth + Edge Functions | 2 proje, 500MB DB, 500MB storage |
| [Vercel](https://vercel.com) | Frontend hosting | Sınırsız deploy, özel domain |
| [GitHub](https://github.com) | Kaynak kod | Sınırsız repo |

---

## Adım 1: Supabase Projesi Kurulumu

### 1.1 Hesap ve Proje Oluşturma

1. [supabase.com](https://supabase.com) adresine gidin ve GitHub hesabınızla giriş yapın
2. **New Project** butonuna tıklayın
3. Proje bilgilerini doldurun:
   - **Name**: `beslenme-gunlugu` (veya istediğiniz bir isim)
   - **Database Password**: Güçlü bir şifre belirleyin (bunu kaydedin!)
   - **Region**: `West EU (Ireland)` veya size en yakın bölge
4. **Create new project** tıklayın ve birkaç dakika bekleyin

### 1.2 Proje Bilgilerini Kaydetme

Proje hazır olunca, **Settings > API** sayfasına gidin ve şu değerleri kaydedin:

- **Project URL**: `https://XXXXX.supabase.co` → Bu sizin `VITE_SUPABASE_URL`
- **anon/public key**: `eyJ...` → Bu sizin `VITE_SUPABASE_PUBLISHABLE_KEY`
- **service_role key**: `eyJ...` → Bu edge function'lar için gerekli (gizli tutun!)

### 1.3 Veritabanı Migration'larını Uygulama

**Yöntem A: Supabase CLI ile (Önerilen)**

```bash
# Supabase CLI kur
npm install -g supabase

# Projeye giriş yap
supabase login

# Projeyi bağla (Project ID'nizi Settings > General'dan alın)
supabase link --project-ref YOUR_PROJECT_ID

# Migration'ları uygula
supabase db push
```

**Yöntem B: SQL Editor ile (Manuel)**

Supabase Dashboard'da **SQL Editor** sayfasına gidin ve aşağıdaki migration dosyalarını sırasıyla çalıştırın:

1. `supabase/migrations/20251223083351_*.sql`
2. `supabase/migrations/20251223083958_*.sql`
3. `supabase/migrations/20251224060532_*.sql`
4. `supabase/migrations/20251224062151_*.sql`
5. `supabase/migrations/20251225062611_*.sql`
6. `supabase/migrations/20251226064503_*.sql`
7. `supabase/migrations/20260115055455_*.sql`
8. `supabase/migrations/20260127071746_*.sql`
9. `supabase/migrations/20260128060428_*.sql`
10. `supabase/migrations/20260129070308_*.sql`
11. `supabase/migrations/20260203074244_*.sql`
12. `supabase/migrations/20260204064417_*.sql`
13. `supabase/migrations/20260212054920_*.sql`
14. `supabase/migrations/20260216102537_*.sql`

Her dosyanın içeriğini SQL Editor'e yapıştırıp **Run** butonuna basın.

### 1.4 Auth Yapılandırması

1. Supabase Dashboard > **Authentication > Providers** bölümüne gidin
2. **Email** provider'ın aktif olduğunu doğrulayın
3. (Opsiyonel) **Authentication > URL Configuration** bölümünde:
   - **Site URL**: Vercel'den alacağınız URL'i girin (örn: `https://beslenme-gunlugu.vercel.app`)
   - **Redirect URLs**: `https://beslenme-gunlugu.vercel.app/**`

### 1.5 Edge Functions Deploy

```bash
# Tüm edge function'ları deploy et
supabase functions deploy lookup-calories --no-verify-jwt
supabase functions deploy parse-food-pdf --no-verify-jwt
supabase functions deploy forecast-weight --no-verify-jwt
supabase functions deploy metabolic-twin --no-verify-jwt
```

### 1.6 Edge Function Secret'ları

Edge function'lar AI özellikleri için Google AI Studio (Gemini) API kullanır.

1. [aistudio.google.com](https://aistudio.google.com) adresine gidin ve ücretsiz API key alın
2. Supabase'de secret olarak ekleyin:
   ```bash
   supabase secrets set GOOGLE_AI_API_KEY=your_google_ai_key
   ```

> **Not:** `GOOGLE_AI_API_KEY` olmadan AI özellikleri (kalori sorgulama, PDF analizi, kilo tahmini, metabolik analiz) çalışmaz. Temel özellikler (manuel yemek girişi, su takibi, egzersiz kaydı) key olmadan da çalışır.

---

## Adım 2: Vercel'e Deploy

### 2.1 GitHub Repo Hazırlığı

Kodunuz GitHub'da olmalı. Eğer değilse:

```bash
git remote add origin https://github.com/KULLANICI_ADINIZ/diyet.git
git push -u origin main
```

### 2.2 Vercel Projesi Oluşturma

1. [vercel.com](https://vercel.com) adresine gidin ve GitHub hesabınızla giriş yapın
2. **Add New > Project** tıklayın
3. GitHub reponuzu seçin (`diyet`)
4. Framework olarak **Vite** otomatik algılanacak
5. **Environment Variables** bölümüne şu değişkenleri ekleyin:

   | Key | Value |
   |-----|-------|
   | `VITE_SUPABASE_URL` | `https://YOUR_PROJECT_ID.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJ...` (anon key) |

6. **Deploy** butonuna tıklayın

### 2.3 Deploy Sonrası

Deploy tamamlanınca Vercel size bir URL verecek (örn: `https://beslenme-gunlugu.vercel.app`).

Bu URL'i Supabase'de güncelleyin:
- **Authentication > URL Configuration > Site URL**: `https://beslenme-gunlugu.vercel.app`
- **Authentication > URL Configuration > Redirect URLs**: `https://beslenme-gunlugu.vercel.app/**`

---

## Adım 3: Doğrulama

1. Vercel URL'inize gidin
2. **Kayıt ol** sayfasından yeni bir hesap oluşturun
3. E-posta doğrulama linkine tıklayın
4. Giriş yapın ve uygulamayı kullanmaya başlayın

### Kontrol Listesi

- [ ] Supabase projesi oluşturuldu
- [ ] Tüm migration'lar uygulandı
- [ ] Auth provider (Email) aktif
- [ ] Edge function'lar deploy edildi
- [ ] Vercel'e deploy yapıldı
- [ ] Environment variable'lar ayarlandı
- [ ] Supabase'de Site URL güncellendi
- [ ] Kayıt + giriş çalışıyor
- [ ] Yemek ekleme çalışıyor

---

## Yerel Geliştirme

Kendi bilgisayarınızda çalıştırmak için:

```bash
# Bağımlılıkları kur
npm install

# .env dosyasını düzenle (kendi Supabase bilgilerinizle)
cp .env .env.local
# .env.local dosyasını düzenleyin

# Geliştirme sunucusunu başlat
npm run dev
```

Uygulama `http://localhost:8080` adresinde açılacaktır.

---

## Sorun Giderme

### "Auth: invalid_grant" hatası
- Supabase Dashboard > Authentication > URL Configuration'da Site URL'in doğru olduğundan emin olun

### Edge function'lar çalışmıyor
- `supabase functions list` ile deploy durumunu kontrol edin
- `supabase functions logs FUNCTION_NAME` ile hata loglarını inceleyin

### "AI service not configured" hatası
- `GOOGLE_AI_API_KEY` secret'ının tanımlı olduğundan emin olun:
  ```bash
  supabase secrets list
  ```

### Migration hatası
- Migration'ları sırayla uyguladığınızdan emin olun
- Bir hata alırsanız, Supabase SQL Editor'de `DROP TABLE` ile ilgili tabloyu silip tekrar deneyin

Plan: Eksikleri toplu temizlik + Hızlı Araçları sidebara taşı ve iyileştirmeler 

Hepsi tek seferde yapılacak.

### 1. Hızlı Araçlar → Sidebara taşı

- `src/components/AppSidebar.tsx`: "Kızılyürek AI" butonunun altına yeni bir **"Araçlar"** bölümü eklenir. Açılır/kapanır (collapsible). İçerik:
  - Komut paleti (`palette:toggle`)
  - AI asistan (`kizilyurek:toggle`)
  - Menü daralt/aç (`updateSettings sidebarCollapsed`)
  - Neon aç/kapa
  - Stealth modu
  - Durum kopyala (clipboard snapshot)
  - Yenilikler (UpdatesModal aç)
- Sidebar collapsed iken sadece ikonlar, açık iken ikon + label.
- `Alt+Q` kısayolu korunur (Araçlar bölümünü açıp kapatır).
- `UpdatesModal` import + state buraya taşınır.

### 2. PageShell temizliği

- `src/components/PageShell.tsx`: `<QuickTools />` kullanımı ve importu silinir.

### 3. Eski QuickTools dosyası silinir

- `src/components/QuickTools.tsx` → delete.

### 4. i18n son artık temizliği

- `src/lib/i18n.tsx` line ~120: `mirrors: "Aynalar"` (ve TR/EN/RU karşılıkları) kaldırılır. Son `mirrors` referansı.

### 5. Sidebar versiyon rozeti güncellenir

- `src/components/AppSidebar.tsx` line 254: `v3.0` → `v3.5` (UpdatesModal son changelog ile uyumlu).

### 6. TODO.md güncellenir

- Eski "QuickTools" notu kaldırılır, yerine "Araçlar sidebara taşındı" notu yazılır.

### Etkilenen dosyalar

- `src/components/AppSidebar.tsx` (Araçlar bölümü + version rozeti)
- `src/components/PageShell.tsx` (QuickTools kaldır)
- `src/components/QuickTools.tsx` (silinir)
- `src/lib/i18n.tsx` (mirrors anahtarı silinir)
- `TODO.md` (güncellenir)

DB / edge functions / migrations'a dokunulmaz.

### iyileştirmeler

4. ik denebilecek alanlar)**Changelog tutarlılığı** — UpdatesModal 3.5.0 girdisi var ama sidebar'da v3.0 yazıyor (AppSidebar.tsx:254). Versiyon etiketi 3.5'e güncellensin.

4. **TorBadge & TorWarningBanner** — Tor katmanı kasıtlı olarak duruyor (gelecek için), dokunulmayacak. ✅
5. **Yeni içerik eksikleri** (varsa söyle, ekleriz):
  - Bildirim merkezi sayfası (sadece bell var, full liste yok)
  - 2FA / TOTP kurulumu (PIN var ama TOTP yok)
  - Vendor onboarding sihirbazı
  - Help/SSS sayfası
  - Yasal sayfalar (kullanım şartları / gizlilik)
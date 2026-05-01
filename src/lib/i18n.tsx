import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export type Language = "tr" | "en" | "ru";

const tr = {
  // Common
  loading: "Yükleniyor...",
  logout: "Çıkış",
  save: "Kaydet",
  cancel: "İptal",
  delete: "Sil",
  reset: "Sıfırla",
  search: "Ara",
  close: "Kapat",
  back: "Geri",
  next: "İleri",
  confirm: "Onayla",
  yes: "Evet",
  no: "Hayır",
  error: "Hata",
  success: "Başarılı",
  copy: "Kopyala",
  copied: "Kopyalandı",
  edit: "Düzenle",
  view: "Görüntüle",
  send: "Gönder",
  submit: "Gönder",
  retry: "Tekrar Dene",
  refresh: "Yenile",
  empty: "Kayıt yok",
  required: "Zorunlu",
  optional: "Opsiyonel",
  total: "Toplam",
  amount: "Miktar",
  price: "Fiyat",
  date: "Tarih",
  type: "Tür",
  status: "Durum",
  actions: "İşlemler",
  details: "Detaylar",
  description: "Açıklama",
  category: "Kategori",
  all: "Tümü",
  none: "Yok",
  unknown: "Bilinmiyor",

  // Auth
  login: "Giriş Yap",
  signup: "Kayıt Ol",
  email: "E-posta",
  password: "Şifre",
  displayName: "Kullanıcı Adı",
  noAccount: "Hesabın yok mu?",
  hasAccount: "Hesabın var mı?",
  buyer: "Alıcı",
  vendor: "Satıcı",
  admin: "Admin",
  loginSubtitle: "Güvenli giriş",
  signupSubtitle: "Yeni hesap oluştur",
  selectRole: "Rol seç",
  mfaCode: "MFA Kodu",
  mfaVerify: "Doğrula",
  accountNoRole: "Hesap yetkisi yüklenemedi.",

  // Sidebar
  dashboard: "Dashboard",
  securityLogs: "Güvenlik Kayıtları",
  disputes: "Anlaşmazlıklar",
  transactions: "İşlemler",
  forum: "Forum",
  security: "Güvenlik",
  customize: "Özelleştir",
  myProducts: "Ürünlerim",
  wallet: "Cüzdan",
  deposit: "Depozito",
  profile: "Profil",
  market: "Market",
  myOrders: "Siparişlerim",
  store: "Mağaza",
  watchlist: "Favoriler",
  pgpTool: "PGP Araçları",
  cipherNotes: "Şifreli Notlar",
  stealthMode: "Gizlenme Modu",
  mirrors: "Aynalar",
  notifications: "Bildirimler",
  noNotifications: "Bildirim yok",
  markAllRead: "Tümünü okundu işaretle",

  // Customization
  customization: "Özelleştirme",
  themeColor: "Tema Rengi",
  font: "Yazı Tipi",
  fontFamily: "Font",
  fontSize: "Boyut",
  small: "Küçük",
  normal: "Normal",
  large: "Büyük",
  animations: "Animasyon Ayarları",
  neonEffects: "Neon efektleri",
  animationsToggle: "Animasyonlar",
  sidebarLayout: "Sidebar Düzeni",
  position: "Pozisyon",
  left: "Sol",
  right: "Sağ",
  collapseSidebar: "Sidebar daralt",
  backgroundImage: "Arka Plan Resmi",
  changeImage: "Değiştir",
  selectImage: "Resim Seç",
  removeImage: "Kaldır",
  opacity: "Şeffaflık",
  customHue: "Özel Ton",
  resetSettings: "Ayarlar sıfırlandı",
  themeApplied: "tema uygulandı",
  bgUpdated: "Arka plan güncellendi! 🎨",
  bgRemoved: "Arka plan kaldırıldı",
  language: "Dil",
  selectLanguage: "Dil Seçimi",
  systemFont: "Sistem Fontu",
  red: "Kırmızı", blue: "Mavi", green: "Yeşil", purple: "Mor", orange: "Turuncu", cyan: "Camgöbeği", pink: "Pembe", yellow: "Sarı",
  supportedFormats: "Desteklenen formatlar: JPG, PNG, GIF, WebP",
  maxFileSize: "Maksimum dosya boyutu: 10MB",

  // Market
  "market.title": "Yeraltı Pazarı",
  "market.subtitle": "Anonim, şifreli, escrow korumalı ticaret",
  "market.searchPlaceholder": "Ürün ara...",
  "market.allCategories": "Tüm Kategoriler",
  "market.noProducts": "Ürün bulunamadı",
  "market.noProductsDesc": "Filtreleri değiştirip tekrar dene",
  "market.addToWatchlist": "Favorilere ekle",
  "market.viewProduct": "Ürünü gör",
  "market.outOfStock": "Stokta yok",
  "market.inStock": "Stokta",
  "market.from": "Gönderen",
  "market.to": "Varış",

  // Product
  "product.buy": "Satın Al",
  "product.quickView": "Hızlı Bakış",
  "product.vendorRating": "Satıcı Puanı",
  "product.commission": "Komisyon",
  "product.shipping": "Kargo",
  "product.deliveryMethod": "Teslimat Yöntemi",
  "product.placeOrder": "Sipariş Ver",
  "product.shippingAddress": "Kargo Adresi",
  "product.notes": "Notlar (opsiyonel)",
  "product.confirmOrder": "Siparişi Onayla",
  "product.orderPlaced": "Sipariş oluşturuldu! Cüzdandan ödeme yapın.",

  // Orders
  "orders.title": "Siparişlerim",
  "orders.empty": "Henüz sipariş yok",
  "orders.emptyDesc": "Markete göz at ve ilk siparişini ver",
  "orders.goToMarket": "Markete Git",
  "orders.cancel": "Siparişi İptal Et",
  "orders.cancelConfirm": "Bu siparişi iptal etmek istiyor musun?",
  "orders.cancelled": "Sipariş iptal edildi",
  "orders.confirmDelivery": "Teslimi Onayla",
  "orders.openDispute": "Anlaşmazlık Aç",
  "orders.rateVendor": "Satıcıyı Puanla",
  "orders.viewChat": "Sohbet",
  "orders.trackingInfo": "Kargo Bilgisi",
  "orders.deadDropInfo": "Dead-Drop Konumu",

  // Status
  "status.pending": "Bekliyor",
  "status.paid": "Ödendi",
  "status.shipped": "Gönderildi",
  "status.delivered": "Teslim Edildi",
  "status.completed": "Tamamlandı",
  "status.cancelled": "İptal Edildi",
  "status.disputed": "Anlaşmazlık",
  "status.refunded": "İade Edildi",
  "status.held": "Escrow'da",
  "status.released": "Bırakıldı",

  // Wallet
  "wallet.title": "Cüzdan",
  "wallet.balance": "Bakiye",
  "wallet.available": "Kullanılabilir",
  "wallet.pendingBalance": "Bekleyen",
  "wallet.depositAddress": "Yatırma Adresi",
  "wallet.deposit": "Para Yatır",
  "wallet.withdraw": "Para Çek",
  "wallet.withdrawAmount": "Çekme Miktarı",
  "wallet.withdrawTo": "Hedef Adres",
  "wallet.withdrawPin": "Çekme PIN'i",
  "wallet.invalidAmount": "Geçersiz miktar",
  "wallet.insufficientFunds": "Yetersiz bakiye",
  "wallet.withdrawSuccess": "Çekme talebi gönderildi",
  "wallet.empty": "Henüz işlem yok",

  // Delivery / Shipping
  "delivery.title": "Teslimat Bilgisi Gir",
  "delivery.method": "Teslimat Yöntemi",
  "delivery.cargo": "Kargo",
  "delivery.deadDrop": "Dead-Drop",
  "delivery.mailbox": "Anonim Posta",
  "delivery.carrier": "Kargo Firması",
  "delivery.trackingCode": "Takip Kodu",
  "delivery.trackingHint": "Takip kodu alıcının PGP anahtarıyla şifrelenir",
  "delivery.countryFrom": "Gönderi Ülkesi",
  "delivery.countryTo": "Varış Ülkesi",
  "delivery.stealthMethod": "Gizleme Yöntemi",
  "delivery.coverIdentity": "Sahte Gönderici",
  "delivery.generateCover": "Sahte Kimlik Üret",
  "delivery.anonymous": "Anonim Mod",
  "delivery.notesOptional": "Notlar (opsiyonel)",
  "delivery.submit": "Gönder ve İşaretle",
  "delivery.submitted": "Teslimat bilgisi kaydedildi",
  "delivery.encryptionWarning": "Takip kodu uçtan uca şifrelenir. Kaybedersen geri getirilemez.",
  "delivery.noBuyerKey": "Alıcının PGP anahtarı yok — kod düz metin olarak saklanacak",
  "delivery.waiting": "Teslimat bilgisi bekleniyor...",
  "delivery.encryptedTracking": "Şifreli Takip Kodu",
  "delivery.decryptHint": "PGP araçlarında özel anahtarınla çöz",

  // Carriers
  "carrier.stealthMail": "Stealth Mail (Yerel)",
  "carrier.ems": "EMS Uluslararası",
  "carrier.dhl": "DHL Drop-Off",
  "carrier.ups": "UPS Drop-Off",
  "carrier.fedex": "FedEx Drop-Off",
  "carrier.localPost": "Yerel Posta",
  "carrier.handCourier": "Elden Kurye",
  "carrier.poBox": "Anonim PO Box",

  // Stealth
  "stealth.regular": "Standart",
  "stealth.vacuum": "Vakum Mühürlü",
  "stealth.mylar": "Mylar Çanta",
  "stealth.decoy": "Yemli (Decoy)",
  "stealth.double": "Çift Vakum + Mylar",

  // Forum
  "forum.title": "Forum",
  "forum.newPost": "Yeni Konu",
  "forum.empty": "Henüz konu yok",
  "forum.emptyDesc": "İlk konuyu sen aç",
  "forum.comments": "yorum",
  "forum.postTitle": "Başlık",
  "forum.postContent": "İçerik",
  "forum.publish": "Yayınla",
  "forum.delete": "Konuyu Sil",

  // Disputes
  "disputes.title": "Anlaşmazlıklar",
  "disputes.empty": "Anlaşmazlık yok",
  "disputes.open": "Açık",
  "disputes.resolved": "Çözüldü",
  "disputes.openNew": "Yeni Anlaşmazlık",
  "disputes.reason": "Sebep",
  "disputes.amount": "Tutar",

  // Profile
  "profile.title": "Profil",
  "profile.bio": "Bio",
  "profile.pgpKey": "PGP Anahtarı",
  "profile.savedSuccess": "Profil güncellendi",

  // Vendor
  "vendor.dashboard": "Satıcı Paneli",
  "vendor.products": "Ürünlerim",
  "vendor.addProduct": "Ürün Ekle",
  "vendor.pendingShipments": "Bekleyen Teslimatlar",
  "vendor.activeOrders": "Aktif Siparişler",
  "vendor.totalSales": "Toplam Satış",
  "vendor.markShipped": "Gönderildi Olarak İşaretle",
  "vendor.fulfillNow": "Şimdi Gönder",
  "vendor.noPending": "Bekleyen sipariş yok",

  // Mirrors
  "mirrors.title": "Aynalar & Canary",
  "mirrors.empty": "Ayna eklenmemiş",
  "mirrors.add": "Ayna Ekle",
  "mirrors.url": "URL (.onion)",
  "mirrors.label": "Etiket",
  "mirrors.signature": "PGP İmzası",
  "mirrors.canary": "Canary Mesajı",
  "mirrors.verified": "Doğrulandı",
  "mirrors.lastChecked": "Son kontrol",

  // Errors
  "err.generic": "Bir şeyler ters gitti",
  "err.network": "Bağlantı hatası",
  "err.unauthorized": "Yetkisiz işlem",
  "err.notFound": "Bulunamadı",
  "err.invalid": "Geçersiz veri",
  "err.required": "Bu alan zorunlu",
  "err.tryAgain": "Lütfen tekrar dene",

  // Empty / general
  emptyTitle: "Hiçbir şey yok",
  comingSoon: "Yakında",
};

const en: typeof tr = {
  loading: "Loading...", logout: "Logout", save: "Save", cancel: "Cancel", delete: "Delete", reset: "Reset", search: "Search", close: "Close", back: "Back", next: "Next", confirm: "Confirm", yes: "Yes", no: "No", error: "Error", success: "Success", copy: "Copy", copied: "Copied", edit: "Edit", view: "View", send: "Send", submit: "Submit", retry: "Retry", refresh: "Refresh", empty: "No records", required: "Required", optional: "Optional", total: "Total", amount: "Amount", price: "Price", date: "Date", type: "Type", status: "Status", actions: "Actions", details: "Details", description: "Description", category: "Category", all: "All", none: "None", unknown: "Unknown",

  login: "Sign In", signup: "Sign Up", email: "Email", password: "Password", displayName: "Display Name", noAccount: "No account?", hasAccount: "Have account?", buyer: "Buyer", vendor: "Vendor", admin: "Admin", loginSubtitle: "Secure login", signupSubtitle: "Create account", selectRole: "Select role", mfaCode: "MFA Code", mfaVerify: "Verify", accountNoRole: "Could not load permissions.",

  dashboard: "Dashboard", securityLogs: "Security Logs", disputes: "Disputes", transactions: "Transactions", forum: "Forum", security: "Security", customize: "Customize", myProducts: "My Products", wallet: "Wallet", deposit: "Bond", profile: "Profile", market: "Market", myOrders: "My Orders", store: "Store", watchlist: "Watchlist", pgpTool: "PGP Tools", cipherNotes: "Cipher Notes", stealthMode: "Stealth Mode", mirrors: "Mirrors",
  notifications: "Notifications", noNotifications: "No notifications", markAllRead: "Mark all read",

  customization: "Customization", themeColor: "Theme Color", font: "Font", fontFamily: "Font", fontSize: "Size", small: "Small", normal: "Normal", large: "Large", animations: "Animation Settings", neonEffects: "Neon effects", animationsToggle: "Animations", sidebarLayout: "Sidebar Layout", position: "Position", left: "Left", right: "Right", collapseSidebar: "Collapse sidebar", backgroundImage: "Background", changeImage: "Change", selectImage: "Select Image", removeImage: "Remove", opacity: "Opacity", customHue: "Custom Hue", resetSettings: "Settings reset", themeApplied: "theme applied", bgUpdated: "Background updated! 🎨", bgRemoved: "Background removed", language: "Language", selectLanguage: "Language", systemFont: "System Font",
  red: "Red", blue: "Blue", green: "Green", purple: "Purple", orange: "Orange", cyan: "Cyan", pink: "Pink", yellow: "Yellow",
  supportedFormats: "Supported: JPG, PNG, GIF, WebP", maxFileSize: "Max size: 10MB",

  "market.title": "Underground Market", "market.subtitle": "Anonymous, encrypted, escrow-protected trade", "market.searchPlaceholder": "Search products...", "market.allCategories": "All Categories", "market.noProducts": "No products found", "market.noProductsDesc": "Adjust filters and try again", "market.addToWatchlist": "Add to watchlist", "market.viewProduct": "View product", "market.outOfStock": "Out of stock", "market.inStock": "In stock", "market.from": "From", "market.to": "To",

  "product.buy": "Buy Now", "product.quickView": "Quick View", "product.vendorRating": "Vendor Rating", "product.commission": "Commission", "product.shipping": "Shipping", "product.deliveryMethod": "Delivery Method", "product.placeOrder": "Place Order", "product.shippingAddress": "Shipping Address", "product.notes": "Notes (optional)", "product.confirmOrder": "Confirm Order", "product.orderPlaced": "Order placed! Pay from wallet.",

  "orders.title": "My Orders", "orders.empty": "No orders yet", "orders.emptyDesc": "Browse the market and place your first order", "orders.goToMarket": "Go to Market", "orders.cancel": "Cancel Order", "orders.cancelConfirm": "Cancel this order?", "orders.cancelled": "Order cancelled", "orders.confirmDelivery": "Confirm Delivery", "orders.openDispute": "Open Dispute", "orders.rateVendor": "Rate Vendor", "orders.viewChat": "Chat", "orders.trackingInfo": "Tracking", "orders.deadDropInfo": "Dead-Drop",

  "status.pending": "Pending", "status.paid": "Paid", "status.shipped": "Shipped", "status.delivered": "Delivered", "status.completed": "Completed", "status.cancelled": "Cancelled", "status.disputed": "Disputed", "status.refunded": "Refunded", "status.held": "In Escrow", "status.released": "Released",

  "wallet.title": "Wallet", "wallet.balance": "Balance", "wallet.available": "Available", "wallet.pendingBalance": "Pending", "wallet.depositAddress": "Deposit Address", "wallet.deposit": "Deposit", "wallet.withdraw": "Withdraw", "wallet.withdrawAmount": "Amount", "wallet.withdrawTo": "Destination", "wallet.withdrawPin": "Withdraw PIN", "wallet.invalidAmount": "Invalid amount", "wallet.insufficientFunds": "Insufficient funds", "wallet.withdrawSuccess": "Withdraw request sent", "wallet.empty": "No transactions",

  "delivery.title": "Enter Delivery Info", "delivery.method": "Delivery Method", "delivery.cargo": "Cargo", "delivery.deadDrop": "Dead-Drop", "delivery.mailbox": "Anonymous Mail", "delivery.carrier": "Carrier", "delivery.trackingCode": "Tracking Code", "delivery.trackingHint": "Tracking code is encrypted with buyer's PGP key", "delivery.countryFrom": "Origin Country", "delivery.countryTo": "Destination Country", "delivery.stealthMethod": "Stealth Method", "delivery.coverIdentity": "Cover Sender", "delivery.generateCover": "Generate Cover", "delivery.anonymous": "Anonymous Mode", "delivery.notesOptional": "Notes (optional)", "delivery.submit": "Submit & Mark Shipped", "delivery.submitted": "Delivery info saved", "delivery.encryptionWarning": "Tracking code is end-to-end encrypted. Lost = unrecoverable.", "delivery.noBuyerKey": "Buyer has no PGP key — code stored in plaintext", "delivery.waiting": "Waiting for delivery info...", "delivery.encryptedTracking": "Encrypted Tracking Code", "delivery.decryptHint": "Decrypt with your private key in PGP Tools",

  "carrier.stealthMail": "Stealth Mail (Local)", "carrier.ems": "EMS International", "carrier.dhl": "DHL Drop-Off", "carrier.ups": "UPS Drop-Off", "carrier.fedex": "FedEx Drop-Off", "carrier.localPost": "Local Post", "carrier.handCourier": "Hand Courier", "carrier.poBox": "Anonymous PO Box",

  "stealth.regular": "Regular", "stealth.vacuum": "Vacuum Sealed", "stealth.mylar": "Mylar Bag", "stealth.decoy": "Decoy", "stealth.double": "Double Vacuum + Mylar",

  "forum.title": "Forum", "forum.newPost": "New Post", "forum.empty": "No posts yet", "forum.emptyDesc": "Start the first thread", "forum.comments": "comments", "forum.postTitle": "Title", "forum.postContent": "Content", "forum.publish": "Publish", "forum.delete": "Delete Post",

  "disputes.title": "Disputes", "disputes.empty": "No disputes", "disputes.open": "Open", "disputes.resolved": "Resolved", "disputes.openNew": "New Dispute", "disputes.reason": "Reason", "disputes.amount": "Amount",

  "profile.title": "Profile", "profile.bio": "Bio", "profile.pgpKey": "PGP Key", "profile.savedSuccess": "Profile updated",

  "vendor.dashboard": "Vendor Dashboard", "vendor.products": "My Products", "vendor.addProduct": "Add Product", "vendor.pendingShipments": "Pending Shipments", "vendor.activeOrders": "Active Orders", "vendor.totalSales": "Total Sales", "vendor.markShipped": "Mark as Shipped", "vendor.fulfillNow": "Fulfill Now", "vendor.noPending": "No pending shipments",

  "mirrors.title": "Mirrors & Canary", "mirrors.empty": "No mirrors added", "mirrors.add": "Add Mirror", "mirrors.url": "URL (.onion)", "mirrors.label": "Label", "mirrors.signature": "PGP Signature", "mirrors.canary": "Canary Message", "mirrors.verified": "Verified", "mirrors.lastChecked": "Last checked",

  "err.generic": "Something went wrong", "err.network": "Network error", "err.unauthorized": "Unauthorized", "err.notFound": "Not found", "err.invalid": "Invalid data", "err.required": "Required field", "err.tryAgain": "Please try again",

  emptyTitle: "Nothing here", comingSoon: "Coming soon",
};

const ru: typeof tr = {
  loading: "Загрузка...", logout: "Выход", save: "Сохранить", cancel: "Отмена", delete: "Удалить", reset: "Сбросить", search: "Поиск", close: "Закрыть", back: "Назад", next: "Далее", confirm: "Подтвердить", yes: "Да", no: "Нет", error: "Ошибка", success: "Успех", copy: "Копировать", copied: "Скопировано", edit: "Изменить", view: "Просмотр", send: "Отправить", submit: "Отправить", retry: "Повторить", refresh: "Обновить", empty: "Нет записей", required: "Обязательно", optional: "Необязательно", total: "Итого", amount: "Сумма", price: "Цена", date: "Дата", type: "Тип", status: "Статус", actions: "Действия", details: "Детали", description: "Описание", category: "Категория", all: "Все", none: "Нет", unknown: "Неизвестно",

  login: "Войти", signup: "Регистрация", email: "Эл. почта", password: "Пароль", displayName: "Имя", noAccount: "Нет аккаунта?", hasAccount: "Есть аккаунт?", buyer: "Покупатель", vendor: "Продавец", admin: "Админ", loginSubtitle: "Безопасный вход", signupSubtitle: "Создать аккаунт", selectRole: "Роль", mfaCode: "Код MFA", mfaVerify: "Проверить", accountNoRole: "Не удалось загрузить роль.",

  dashboard: "Панель", securityLogs: "Журнал безопасности", disputes: "Споры", transactions: "Транзакции", forum: "Форум", security: "Безопасность", customize: "Настройки", myProducts: "Мои товары", wallet: "Кошелёк", deposit: "Депозит", profile: "Профиль", market: "Маркет", myOrders: "Мои заказы", store: "Магазин", watchlist: "Избранное", pgpTool: "PGP", cipherNotes: "Заметки", stealthMode: "Невидимка", mirrors: "Зеркала",
  notifications: "Уведомления", noNotifications: "Нет уведомлений", markAllRead: "Отметить прочитанным",

  customization: "Настройка", themeColor: "Цвет темы", font: "Шрифт", fontFamily: "Шрифт", fontSize: "Размер", small: "Малый", normal: "Обычный", large: "Большой", animations: "Анимации", neonEffects: "Неон", animationsToggle: "Анимации", sidebarLayout: "Боковая панель", position: "Позиция", left: "Слева", right: "Справа", collapseSidebar: "Свернуть", backgroundImage: "Фон", changeImage: "Изменить", selectImage: "Выбрать", removeImage: "Удалить", opacity: "Прозрачность", customHue: "Оттенок", resetSettings: "Сброшено", themeApplied: "тема применена", bgUpdated: "Фон обновлён! 🎨", bgRemoved: "Фон удалён", language: "Язык", selectLanguage: "Язык", systemFont: "Системный",
  red: "Красный", blue: "Синий", green: "Зелёный", purple: "Фиолетовый", orange: "Оранжевый", cyan: "Бирюзовый", pink: "Розовый", yellow: "Жёлтый",
  supportedFormats: "Форматы: JPG, PNG, GIF, WebP", maxFileSize: "Макс: 10МБ",

  "market.title": "Подпольный рынок", "market.subtitle": "Анонимная торговля с эскроу", "market.searchPlaceholder": "Поиск товаров...", "market.allCategories": "Все категории", "market.noProducts": "Товары не найдены", "market.noProductsDesc": "Измените фильтры", "market.addToWatchlist": "В избранное", "market.viewProduct": "Открыть", "market.outOfStock": "Нет в наличии", "market.inStock": "В наличии", "market.from": "Откуда", "market.to": "Куда",

  "product.buy": "Купить", "product.quickView": "Быстрый просмотр", "product.vendorRating": "Рейтинг продавца", "product.commission": "Комиссия", "product.shipping": "Доставка", "product.deliveryMethod": "Способ доставки", "product.placeOrder": "Заказать", "product.shippingAddress": "Адрес доставки", "product.notes": "Заметки (опц.)", "product.confirmOrder": "Подтвердить", "product.orderPlaced": "Заказ создан! Оплатите из кошелька.",

  "orders.title": "Мои заказы", "orders.empty": "Заказов нет", "orders.emptyDesc": "Перейдите на маркет и сделайте первый заказ", "orders.goToMarket": "На маркет", "orders.cancel": "Отменить заказ", "orders.cancelConfirm": "Отменить этот заказ?", "orders.cancelled": "Заказ отменён", "orders.confirmDelivery": "Подтвердить доставку", "orders.openDispute": "Открыть спор", "orders.rateVendor": "Оценить продавца", "orders.viewChat": "Чат", "orders.trackingInfo": "Трекинг", "orders.deadDropInfo": "Закладка",

  "status.pending": "Ожидает", "status.paid": "Оплачено", "status.shipped": "Отправлено", "status.delivered": "Доставлено", "status.completed": "Завершено", "status.cancelled": "Отменено", "status.disputed": "Спор", "status.refunded": "Возврат", "status.held": "В эскроу", "status.released": "Выпущено",

  "wallet.title": "Кошелёк", "wallet.balance": "Баланс", "wallet.available": "Доступно", "wallet.pendingBalance": "Ожидает", "wallet.depositAddress": "Адрес пополнения", "wallet.deposit": "Пополнить", "wallet.withdraw": "Вывести", "wallet.withdrawAmount": "Сумма", "wallet.withdrawTo": "Адрес получателя", "wallet.withdrawPin": "PIN вывода", "wallet.invalidAmount": "Неверная сумма", "wallet.insufficientFunds": "Недостаточно средств", "wallet.withdrawSuccess": "Запрос отправлен", "wallet.empty": "Нет операций",

  "delivery.title": "Информация о доставке", "delivery.method": "Способ", "delivery.cargo": "Курьер", "delivery.deadDrop": "Закладка", "delivery.mailbox": "Аноним. почта", "delivery.carrier": "Перевозчик", "delivery.trackingCode": "Код отслеживания", "delivery.trackingHint": "Код шифруется PGP-ключом покупателя", "delivery.countryFrom": "Страна отправки", "delivery.countryTo": "Страна получения", "delivery.stealthMethod": "Метод маскировки", "delivery.coverIdentity": "Подставной отправитель", "delivery.generateCover": "Сгенерировать", "delivery.anonymous": "Анонимный режим", "delivery.notesOptional": "Заметки (опц.)", "delivery.submit": "Отправить и пометить", "delivery.submitted": "Информация сохранена", "delivery.encryptionWarning": "Код шифруется E2E. Утрата = невозможно восстановить.", "delivery.noBuyerKey": "У покупателя нет PGP — код сохранён открыто", "delivery.waiting": "Ожидание информации...", "delivery.encryptedTracking": "Зашифрованный код", "delivery.decryptHint": "Расшифруйте в PGP-инструментах",

  "carrier.stealthMail": "Stealth Mail (местная)", "carrier.ems": "EMS Международная", "carrier.dhl": "DHL Drop-Off", "carrier.ups": "UPS Drop-Off", "carrier.fedex": "FedEx Drop-Off", "carrier.localPost": "Местная почта", "carrier.handCourier": "Курьер из рук в руки", "carrier.poBox": "Анонимный а/я",

  "stealth.regular": "Обычная", "stealth.vacuum": "Вакуумная упаковка", "stealth.mylar": "Майлар-пакет", "stealth.decoy": "С обманкой", "stealth.double": "Двойной вакуум + майлар",

  "forum.title": "Форум", "forum.newPost": "Новая тема", "forum.empty": "Темы отсутствуют", "forum.emptyDesc": "Создайте первую", "forum.comments": "комм.", "forum.postTitle": "Заголовок", "forum.postContent": "Содержимое", "forum.publish": "Опубликовать", "forum.delete": "Удалить",

  "disputes.title": "Споры", "disputes.empty": "Споров нет", "disputes.open": "Открыт", "disputes.resolved": "Решён", "disputes.openNew": "Новый спор", "disputes.reason": "Причина", "disputes.amount": "Сумма",

  "profile.title": "Профиль", "profile.bio": "О себе", "profile.pgpKey": "PGP-ключ", "profile.savedSuccess": "Профиль обновлён",

  "vendor.dashboard": "Панель продавца", "vendor.products": "Мои товары", "vendor.addProduct": "Добавить товар", "vendor.pendingShipments": "Ожидают отправки", "vendor.activeOrders": "Активные заказы", "vendor.totalSales": "Всего продаж", "vendor.markShipped": "Отметить отправленным", "vendor.fulfillNow": "Отправить", "vendor.noPending": "Нет ожидающих",

  "mirrors.title": "Зеркала и Канарейка", "mirrors.empty": "Зеркал нет", "mirrors.add": "Добавить", "mirrors.url": "URL (.onion)", "mirrors.label": "Метка", "mirrors.signature": "PGP-подпись", "mirrors.canary": "Канарейка", "mirrors.verified": "Проверено", "mirrors.lastChecked": "Проверено",

  "err.generic": "Что-то пошло не так", "err.network": "Ошибка сети", "err.unauthorized": "Нет доступа", "err.notFound": "Не найдено", "err.invalid": "Неверные данные", "err.required": "Обязательное поле", "err.tryAgain": "Повторите",

  emptyTitle: "Пусто", comingSoon: "Скоро",
};

const translations = { tr, en, ru } as const;

export type TranslationKey = keyof typeof tr;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey | string) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: "tr",
  setLanguage: () => {},
  t: (key) => String(key),
});

export const useI18n = () => useContext(I18nContext);

const LANG_KEY = "app_language";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "tr";
    try {
      const stored = window.localStorage.getItem(LANG_KEY) as Language;
      return stored && ["tr", "en", "ru"].includes(stored) ? stored : "tr";
    } catch {
      return "tr";
    }
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try { localStorage.setItem(LANG_KEY, lang); } catch {}
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key: TranslationKey | string): string => {
      const dict = translations[language] as Record<string, string>;
      const fallback = translations.tr as Record<string, string>;
      return dict[key as string] || fallback[key as string] || String(key);
    },
    [language],
  );

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>
  );
}

export const languageOptions: { value: Language; label: string; flag: string }[] = [
  { value: "tr", label: "Türkçe", flag: "🇹🇷" },
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "ru", label: "Русский", flag: "🇷🇺" },
];

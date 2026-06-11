# Tarla Panosu

Çiftçi için günlük fiyat ve haber panosu. Emtia, gübre, mazot ve döviz fiyatlarını tek ekranda toplar; tarım haberlerini de yanına getirir. React + Vite PWA olarak GitHub Pages'te yayınlanır.

## Veri kaynakları

Fiyatlar `scraper/scrape.mjs` ile çekilir ve statik JSON olarak yayınlanır.

| Kaynak | Veri |
| --- | --- |
| `borsa.tobb.org.tr` | Borsa emtia fiyatları |
| `finans.truncgil.com` | Döviz / kur |
| `hasanadiguzel.com.tr` (akaryakıt) | Mazot / akaryakıt |
| `tarimdanhaber.com`, `tarimpusulasi.com` (RSS) | Tarım haberleri |
| `scraper/commodities-manual.json` | Gübre fiyatları (TZOB, **manuel** güncellenir) |

Gübre fiyatları otomatik çekilmez; `commodities-manual.json` içindeki değerleri (`source`, `date` alanlarıyla birlikte) elle güncelle.

> Not: `borsa.tobb.org.tr` GitHub Actions runner'larını WAF/IP seviyesinde blokluyor, bu yüzden CI'da borsa fetch'i patlayabilir. Bu durumda son bilinen değer kullanılır ve panoda amber bir tazelik rozetiyle gösterilir. Retry bu bloğu çözmez.

## Geliştirme

```bash
npm install
npm run dev       # yerel geliştirme sunucusu
npm run scrape    # veri kaynaklarını yerelde çek
npm run build     # production build
npm run preview   # build'i yerelde önizle
npm run lint
```

## Yayın ve veri güncelleme

- **Deploy:** `.github/workflows/deploy.yml` — PWA'yı build edip GitHub Pages'e yayınlar.
- **Scrape cron:** `.github/workflows/scrape.yml` — `5,20,35,50 * * * *` (15 dakikada bir, best-effort) kaynakları çeker. Bazı kaynaklar patlasa bile diğerleri güncellenir; veri yaşı panodaki tazelik rozetiyle dürüstçe gösterilir.

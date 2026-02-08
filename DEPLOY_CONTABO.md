# OptomApp Production Deploy (Contabo + PM2)

## 1) VPS tayyorlash

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git build-essential
sudo npm i -g pnpm pm2
```

## 2) Loyihani olish

```bash
git clone <YOUR_REPO_URL> /var/www/optomapp
cd /var/www/optomapp
pnpm install --frozen-lockfile
```

## 3) API env sozlash

```bash
cp apps/api/.env.production.example apps/api/.env
nano apps/api/.env
```

Kamida quyidagilarni to'g'rilang:
- `JWT_SECRET` -> kuchli random secret
- `PORT=8081`
- `HOST=0.0.0.0`
- `BODY_LIMIT=50mb` (rasm upload uchun)
- `CORS_ORIGIN` -> kerak bo'lsa domenlar (misol: `https://admin.example.com,https://app.example.com`)

## 4) DB migrate va admin yaratish

```bash
cd /var/www/optomapp/apps/api
pnpm prisma:generate
pnpm exec prisma migrate deploy
ADMIN_LOGIN=admin ADMIN_PASS=<STRONG_PASSWORD> node scripts/create-admin.cjs
```

## 5) API build va PM2 run

```bash
cd /var/www/optomapp
pnpm build:api
pm2 start apps/api/ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

Tekshiruv:

```bash
curl http://127.0.0.1:8081/health
curl http://127.0.0.1:8081/api/health
```

## 6) Nginx reverse proxy + SSL (tavsiya)

Repo ichida tayyor sample config bor:

`deploy/nginx.optomapp.conf.example`

O'rnatish:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp /var/www/optomapp/deploy/nginx.optomapp.conf.example /etc/nginx/sites-available/optomapp
sudo nano /etc/nginx/sites-available/optomapp
sudo ln -s /etc/nginx/sites-available/optomapp /etc/nginx/sites-enabled/optomapp
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d YOUR_DOMAIN
```

`YOUR_DOMAIN` bo'lmasa IP bilan ham ishlaydi, lekin SSL sertifikat uchun domen tavsiya.

## 7) Firewall

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

Agar Nginx ishlatmasangiz, qo'shimcha ravishda:

```bash
sudo ufw allow 8081/tcp
```

## 8) Desktop .exe build (clientga berish)

Desktop API URL `apps/desktop/.env.production` ichida:

```env
VITE_API_URL=http://178.18.245.174:8081
```

Build:

```bash
cd /var/www/optomapp
pnpm build:desktop
```

Installer chiqadi:

`apps/desktop/src-tauri/target/release/bundle/nsis/OptomApp_0.1.2_x64-setup.exe`

## 9) Mobile build (Expo EAS)

API URL `apps/mobile/.env` yoki `apps/mobile/eas.json` env orqali beriladi:

```env
EXPO_PUBLIC_API_URL=http://178.18.245.174:8081
```

Birinchi marta (bir marta qilinadi):

```bash
cd /var/www/optomapp/apps/mobile
pnpm exec eas login
pnpm exec eas init
```

Preview APK (internal test):

```bash
cd /var/www/optomapp
pnpm build:mobile:preview
```

Production AAB (Play Store):

```bash
cd /var/www/optomapp
pnpm build:mobile:prod
```

## 10) Operatsion buyruqlar

```bash
pm2 logs optom-api
pm2 restart optom-api
pm2 status
```

## 11) Tavsiya

Desktop va mobile API URL'ni domen bilan bering (masalan: `https://api.yourdomain.com`) - IP o'zgarishi muammosini oldini oladi.

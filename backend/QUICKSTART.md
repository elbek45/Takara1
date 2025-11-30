# ⚡ Quick Start - Production Deployment

## 1️⃣ Подготовка Сервера (5 минут)

```bash
# Обновить систему
sudo apt update && sudo apt upgrade -y

# Установить Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установить Docker Compose
sudo apt install docker-compose -y

# Добавить пользователя в группу docker
sudo usermod -aG docker $USER
```

**Перелогиниться после этого!**

---

## 2️⃣ Клонировать Проект (1 минута)

```bash
cd ~
git clone https://github.com/elbek45/Takara1.git
cd Takara1/backend
```

---

## 3️⃣ Настроить Environment (3 минуты)

```bash
# Копировать шаблон
cp .env.production.example .env.production

# Редактировать (заменить YOUR_* значения)
nano .env.production
```

**Минимально необходимые переменные:**

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://takara:STRONG_PASSWORD@postgres:5432/takara_gold
JWT_SECRET=RANDOM_SECRET_MIN_32_CHARS_1234567890
REDIS_URL=redis://redis:6379
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
TREASURY_WALLET_ADDRESS=YOUR_WALLET_ADDRESS
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
CORS_ORIGIN=https://your-frontend.com
```

---

## 4️⃣ Запустить Проект (2 минуты)

```bash
# Создать .env для docker-compose
echo "DB_USER=takara" > .env
echo "DB_PASSWORD=YOUR_STRONG_PASSWORD" >> .env

# Запустить все сервисы
docker-compose -f docker-compose.prod.yml up -d --build

# Проверить статус
docker-compose -f docker-compose.prod.yml ps

# Проверить логи
docker-compose -f docker-compose.prod.yml logs -f backend
```

---

## 5️⃣ Настроить SSL (5 минут)

```bash
# Установить Certbot
sudo apt install certbot -y

# Получить сертификат (замените YOUR_DOMAIN)
sudo certbot certonly --standalone -d api.YOUR_DOMAIN.com

# Создать директорию для SSL
mkdir -p ssl

# Скопировать сертификаты
sudo cp /etc/letsencrypt/live/api.YOUR_DOMAIN.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/api.YOUR_DOMAIN.com/privkey.pem ./ssl/
sudo chmod 644 ./ssl/*.pem

# Перезапустить Nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

---

## 6️⃣ Проверить Работу (1 минута)

```bash
# Проверить health
curl http://localhost:3000/health

# Должен вернуть:
# {"status":"ok","uptime":123.456,"timestamp":"2024-11-30T..."}

# Проверить readiness
curl http://localhost:3000/health/ready

# Проверить через домен (после SSL)
curl https://api.YOUR_DOMAIN.com/health
```

---

## 7️⃣ Настроить Firewall (2 минуты)

```bash
# Разрешить необходимые порты
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS

# Включить firewall
sudo ufw enable

# Проверить статус
sudo ufw status
```

---

## 🎯 Готово! Ваш API работает на:

- **HTTP**: http://YOUR_SERVER_IP:3000
- **HTTPS**: https://api.YOUR_DOMAIN.com
- **Health Check**: https://api.YOUR_DOMAIN.com/health

---

## 🔄 Обновление Проекта

```bash
# Перейти в директорию
cd ~/Takara1/backend

# Получить последние изменения
git pull origin main

# Пересобрать и перезапустить
docker-compose -f docker-compose.prod.yml up -d --build

# Применить миграции БД (если есть)
docker exec takara-backend npx prisma migrate deploy
```

---

## 🛠 Полезные Команды

```bash
# Логи backend
docker-compose -f docker-compose.prod.yml logs -f backend

# Логи всех сервисов
docker-compose -f docker-compose.prod.yml logs -f

# Остановить все
docker-compose -f docker-compose.prod.yml down

# Перезапустить backend
docker-compose -f docker-compose.prod.yml restart backend

# Проверить использование ресурсов
docker stats

# Зайти внутрь контейнера
docker exec -it takara-backend sh

# Бэкап БД
docker exec takara-postgres pg_dump -U takara takara_gold > backup.sql
```

---

## ⚠️ Важно!

1. **Смените все пароли** в `.env.production`
2. **Настройте автообновление SSL**: `sudo certbot renew --dry-run`
3. **Настройте мониторинг** в Sentry.io
4. **Настройте бэкапы БД** (cron job)
5. **Протестируйте все endpoints** перед запуском фронтенда

---

## 📞 Помощь

Если что-то не работает:

1. Проверьте логи: `docker-compose logs backend`
2. Проверьте health: `curl http://localhost:3000/health/ready`
3. Проверьте переменные окружения: `docker exec takara-backend env | grep DATABASE`
4. Читайте подробную документацию: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

**Общее время деплоя: ~20 минут** ⏱️

**Deployment готов! 🚀**

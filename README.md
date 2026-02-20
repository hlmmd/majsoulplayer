# 雀魂数据

雀魂数据查询与管理网站，基于 Next.js 14。

## 功能

- 登录页：用户名/密码为 **admin** / **admin123**（写死在代码中，无修改密码功能）
- 登录后访问首页，支持退出登录
- 未登录访问任意页面会重定向到登录页

## 本地开发

```bash
# 安装依赖
npm install

# 开发模式（默认 http://localhost:3000）
npm run dev
```

## Linux 部署

### 环境要求

- Node.js >= 18（推荐 20 LTS）

### 方式一：直接运行

```bash
# 在项目根目录
npm ci
npm run build
PORT=3000 npm start
```

默认监听 `3000` 端口，可通过环境变量 `PORT` 修改。

### 方式二：使用 PM2（推荐生产环境）

```bash
npm ci
npm run build

# 安装 PM2（若未安装）
npm install -g pm2

# 启动（绑定 0.0.0.0 以允许外网访问）
PORT=3000 pm2 start npm --name "majsoul-data" -- start

# 开机自启
pm2 save
pm2 startup
```

### 方式三：systemd

创建 `/etc/systemd/system/majsoul-data.service`：

```ini
[Unit]
Description=Majsoul Data Web
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/majsoul
ExecStart=/usr/bin/node node_modules/.bin/next start
Environment=PORT=3000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

然后：

```bash
sudo systemctl daemon-reload
sudo systemctl enable majsoul-data
sudo systemctl start majsoul-data
```

### 反向代理（Nginx）

若使用 Nginx 做反向代理并对外提供 80/443：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 项目结构

- `app/` - Next.js App Router 页面与 API
- `app/login/` - 登录页
- `app/api/login` - 登录接口
- `app/api/logout` - 退出接口
- `lib/auth.ts` - 登录凭据与 session 校验（admin / admin123）

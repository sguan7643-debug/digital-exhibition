# 数智展厅测试服务器部署包

## 生成部署包

在源码根目录运行：

```powershell
npm run package:test
```

产物：

- `deploy/digital-exhibition-test-package/`
- `deploy/digital-exhibition-test-package.zip`

## 测试服务器启动

1. 解压部署包。
2. 将 `.env.example` 复制为 `.env`，填写测试环境的 `FEISHU_APP_ID`、`FEISHU_APP_SECRET` 和 `FEISHU_BASE_TOKEN`。
3. 确认飞书 OAuth 回调登记为 `https://test-pre-demo-seaoil.xdata.work/api/v1/auth/feishu/callback`。
4. 执行：

```bash
npm install --omit=dev
npm start
```

5. 将 `nginx-test.conf` 中的三个路径转发到 `127.0.0.1:4173`，检查并重载 Nginx。
6. 打开 `https://test-pre-demo-seaoil.xdata.work/test2/`。

`serverConfig.json` 只包含非敏感的监听地址、端口、应用基路径和静态目录。飞书密钥只能放在服务器 `.env`，不得放入 `dist` 或 `serverConfig.json`。

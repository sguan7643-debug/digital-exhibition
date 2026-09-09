# 数智产品展厅：完整源码与部署包

交付日期：2026-09-09。主色为 `#0060A6`。本包来自当前确认并运行的版本，包含完整源码、静态资源、配置、依赖锁文件、测试工具与重新生成的 `dist`，不依赖原电脑的 C、D 盘路径。

**请勿双击 HTML 验收页面。** 源码包根目录的 index.html 是开发入口。上传服务器应使用 dist 内全部文件；另提供的 `digital-exhibition-DEPLOY-20260909.zip` 是纯部署包，解压后根目录即为生产 index.html 和 assets，可直接上传其全部内容。

## 直接部署构建成品

1. 解压后，将 **dist 目录里面的全部文件** 上传到 Web 服务器的网站根目录，例如 `/var/www/digital-exhibition/`。该目录下应直接有 `index.html` 和 `assets/`。
2. 使用包内 `deploy/nginx.conf` 的示例 server 配置，按服务器情况调整域名、端口与 root。HTTPS 可沿用已有网关或服务器证书配置。
3. 检查 Nginx 配置并重载。访问网站根路径，应用将跳转到 `/workbench`。
4. 访问并刷新 `/apps`、`/talent/people`、`/talent/progress`，确认能直接进入。SPA 页面必须配置 `try_files $uri $uri/ /index.html`。

当前路由与资源使用绝对路径，按独立域名或端口的根路径 `/` 部署；不要直接放在 `/demo/` 等子目录。不要双击 HTML 以 `file://` 打开。服务器发布只需 dist 内容；源码、测试与 node_modules 不需要放入网站公开目录。

## 从源码安装、运行和重新构建

环境：Node.js 20.19+ 或 22.12+；pnpm 8.15.9。以下命令均在解压后的项目根目录执行，该目录同时包含 package.json、src、public 和 tools。

```sh
corepack pnpm@8.15.9 install --frozen-lockfile
npm run dev -- --port 4174
```

打开 `http://127.0.0.1:4174/`。安装时需要能访问 npm 软件源。若未安装 Corepack，可先执行 `npm install -g pnpm@8.15.9`，再运行 `pnpm install --frozen-lockfile`。

测试与构建：

```sh
npm test
npm run build
```

预览构建产物：

```sh
npm run preview -- --port 4174
```

开发和预览不能同时占用相同端口。Vite 预览用于验收；服务器正式部署使用 Nginx 等静态 Web 服务。依赖目录 node_modules 不在压缩包内，请在目标机器安装，避免跨盘移动导致链接失效。

## 项目内容和功能范围

- `src/`：Vue 页面、组件、样式、交互逻辑及模拟数据。
- `public/`：图片等原始静态资源。
- `dist/`：本次从源码生成、可直接部署的静态站点。
- `tools/`：已有测试与辅助工具；启动脚本引用的 vite-sandbox-shim.cjs 已包含。
- `package.json`、`pnpm-lock.yaml`、`vite.config.js`、`index.html`：项目入口、依赖与构建配置。
- `deploy/nginx.conf`：网站根路径及 SPA 路由回退示例。
- `RELEASE-VERIFICATION.md`：本次构建、测试和文件一致性校验记录。

这是前端演示项目，无配套后端、数据库或真实登录鉴权。新增、评论等交互使用内存模拟状态，刷新后不作为业务数据保存；部分操作明确为禁用或演示行为。源码内网络守卫限制 fetch/XHR/WebSocket/Beacon 至回环地址；静态页面可部署到域名访问，后续接入真实 API 时需另行调整网络守卫并实现后端。以上行为保持与本次确认的展示版本一致。

`npm test` 是本次已验证的测试入口。tools 内部分历史浏览器采集脚本含原机器的 Edge 路径或输出目录，跨机器运行这些可选脚本前需修改；不影响日常开发、构建或静态部署。

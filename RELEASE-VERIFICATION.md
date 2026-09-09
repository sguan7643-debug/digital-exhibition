# 2026-09-09 交付校验

本次包从当前完整工程复制源码并独立安装依赖后重新构建。

- pnpm 8.15.9 根据锁文件安装成功。
- npm test 全部现有测试通过。
- npm run build 成功。
- dist 的 141 个文件与当前预览版本逐文件 SHA-256 相同。
- 从 http://127.0.0.1:4174 实际获取的 HTML、主 JS、主 CSS 与本包构建结果 SHA-256 相同。
- 主色保持 #0060A6。

交付两种 UTF-8 ZIP：SOURCE 含完整源码、工具、配置、说明和 dist；DEPLOY 仅含 dist 内容，根目录直接是 index.html 和 assets。压缩包不含 node_modules。服务器部署需设置 SPA 路由回退，详见 README-DEPLOY.md 和 deploy/nginx.conf。

本项目为前端模拟数据演示，不含后端服务或数据库。未向外部服务器部署，也未在目标服务器校验 Nginx 配置。

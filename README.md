# 双映画 | 摄影师张国强

摄影师张国强的个人预约网站原型，面向福建/福州区域客户。

## 内容

- 首页视频 Hero
- 作品案例筛选
- 服务介绍
- 预约表单
- 飞书多维表格数据源
- 本地 fallback 数据预览

## 飞书后台

部署和表结构说明见 [docs/FEISHU_DEPLOY.md](docs/FEISHU_DEPLOY.md)。

## 部署

静态站点通过 GitHub Pages 发布，`wedding.beyondmotion.net` 由 Cloudflare Worker 代理到 GitHub Pages 源站。

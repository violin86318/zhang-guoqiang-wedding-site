# 双映画网站飞书后台部署说明

这份说明给不熟悉部署的人照着做。网站本身是静态页面，真正的后台数据放在飞书多维表格里，Cloudflare Worker 负责在网页和飞书之间转发数据。

## 1. 当前已创建的飞书多维表格

本次已经用本机 `lark-cli` 创建了一份多维表格：

- 名称：双映画网站后台数据
- 地址：https://my.feishu.cn/base/DpJzbbNWUaENaBspfrUckhS6nUh
- Base Token：`DpJzbbNWUaENaBspfrUckhS6nUh`

表结构：

| 表名 | Table ID | 用途 |
| --- | --- | --- |
| 作品 | `tblBiZDJjE6CzV6A` | 控制首页作品卡片 |
| 档期 | `tbl8yZAnXy7RvNYR` | 控制档期日历 |
| 预约 | `tblkCrMs39qOdLZI` | 保存用户提交的预约 |
| 网站配置 | `tblFGakgPmBcQ60K` | 保存基础文案和链接 |

## 2. 飞书表怎么编辑

### 作品表

维护这些字段：

| 字段 | 示例 | 说明 |
| --- | --- | --- |
| 标题 | 婚礼 / 仪式与情感 | 显示在作品卡片下方 |
| 年份 | 2024 | 显示年份 |
| 分类 | wedding | 可填 `wedding`、`family`、`travel` |
| 图片地址 | ./public/assets/work-red-veil.png | 可以用站内图片路径，也可以换成可公开访问的图片 URL |
| 排序 | 2 | 数字越小越靠前 |
| 是否显示 | 是 | 填 `否`、`false`、`0` 会隐藏 |
| 描述 | 红盖头... | 备用说明，当前页面不直接显示 |

### 档期表

维护这些字段：

| 字段 | 示例 | 说明 |
| --- | --- | --- |
| 日期 | 2026-05-18 | 必须是 `YYYY-MM-DD` |
| 状态 | 可预约 | 可填 `可预约`、`已沟通`、`已满档` |
| 备注 | 已沟通客户 | 只作为内部备注 |

### 预约表

网站表单会自动写入：

| 字段 | 说明 |
| --- | --- |
| 姓名 | 用户填写 |
| 手机号 | 用户填写 |
| 邮箱 | 用户填写 |
| 服务类型 | 婚礼纪实 / 家庭记录 / 旅行记录 |
| 拍摄日期 | 用户选择 |
| 备注 | 用户填写 |
| 状态 | 默认写入 `新提交` |
| 创建时间 | Worker 按北京时间写入 |

### 网站配置表

使用「键 / 值」维护配置：

| 键 | 当前值 | 用途 |
| --- | --- | --- |
| base_city | 福州为主 | 关于区 BASE |
| roots | 福州 | 关于区 ROOTS |
| xhs_url | 小红书主页 URL | 页脚小红书链接 |

## 3. 自己重新创建一份飞书多维表格

如果张国强要放到自己的飞书空间，按下面步骤做。

### 3.1 安装并登录 lark-cli

```bash
brew install larksuite/cli/lark-cli
lark-cli config init
lark-cli auth login
lark-cli auth status
```

`auth status` 里需要看到 `base:app:create`、`base:table:create`、`base:field:create`、`base:record:create`、`base:record:read` 等权限。

### 3.2 创建多维表格

```bash
lark-cli base +base-create --name '双映画网站后台数据' --time-zone Asia/Shanghai
```

命令返回的 `base_token` 要记下来。

### 3.3 创建表和字段

可以先用默认表改名为「作品」，再创建另外三张表：

```bash
lark-cli base +table-list --base-token <BASE_TOKEN>
lark-cli base +table-update --base-token <BASE_TOKEN> --table-id <默认表ID> --name '作品'
lark-cli base +table-create --base-token <BASE_TOKEN> --name '档期'
lark-cli base +table-create --base-token <BASE_TOKEN> --name '预约'
lark-cli base +table-create --base-token <BASE_TOKEN> --name '网站配置'
```

然后给每张表创建文本字段。示例：

```bash
lark-cli base +field-create --base-token <BASE_TOKEN> --table-id <作品表ID> --json '{"field_name":"标题","type":"text"}'
lark-cli base +field-create --base-token <BASE_TOKEN> --table-id <作品表ID> --json '{"field_name":"年份","type":"text"}'
lark-cli base +field-create --base-token <BASE_TOKEN> --table-id <作品表ID> --json '{"field_name":"分类","type":"text"}'
lark-cli base +field-create --base-token <BASE_TOKEN> --table-id <作品表ID> --json '{"field_name":"图片地址","type":"text"}'
lark-cli base +field-create --base-token <BASE_TOKEN> --table-id <作品表ID> --json '{"field_name":"排序","type":"text"}'
lark-cli base +field-create --base-token <BASE_TOKEN> --table-id <作品表ID> --json '{"field_name":"是否显示","type":"text"}'
```

其它表照第 2 节的字段名称创建即可。

## 4. 创建飞书开放平台应用

Worker 不能直接使用浏览器访问飞书，因为密钥不能暴露在前端。需要一个飞书开放平台应用：

1. 进入飞书开放平台，创建企业自建应用。
2. 记录 `App ID` 和 `App Secret`。
3. 给应用开通多维表格权限，至少包括：
   - `base:app:read`
   - `base:record:read`
   - `base:record:create`
4. 发布应用或让它在当前企业内生效。
5. 确保这个应用可以访问上面的多维表格。若读取时报无权限，把多维表格分享给应用 / 机器人，或按飞书后台提示授权。

## 5. 配置 Cloudflare Worker

当前 Worker 需要这些变量：

| 变量名 | 是否秘密 | 说明 |
| --- | --- | --- |
| `LARK_APP_ID` | secret | 飞书应用 App ID |
| `LARK_APP_SECRET` | secret | 飞书应用 App Secret |
| `LARK_BASE_TOKEN` | 普通变量 | 多维表格 base token |
| `LARK_TABLE_WORKS` | 普通变量 | 作品表 ID |
| `LARK_TABLE_CALENDAR` | 普通变量 | 档期表 ID |
| `LARK_TABLE_BOOKINGS` | 普通变量 | 预约表 ID |
| `LARK_TABLE_CONFIG` | 普通变量 | 网站配置表 ID |

本地开发可以复制 `.dev.vars.example` 为 `.dev.vars`，填入自己的值。

线上设置 secrets：

```bash
npx wrangler secret put LARK_APP_ID --name wedding-beyondmotion
npx wrangler secret put LARK_APP_SECRET --name wedding-beyondmotion
```

普通变量可以通过 `wrangler.toml`、Cloudflare Dashboard，或部署命令配置。当前代码里已经写入了本次创建的默认 Base Token 和 Table ID；如果换成朋友自己的表，需要替换这些变量。

## 6. 部署

代码提交并推送：

```bash
git add .
git commit -m "Connect site data to Feishu Base"
git push
```

GitHub Pages 会自动发布静态站点。

部署 Worker：

```bash
npx --no-install wrangler deploy cloudflare-worker.js \
  --name wedding-beyondmotion \
  --compatibility-date 2026-04-28 \
  --domain wedding.beyondmotion.net
```

## 7. 验证

打开：

```bash
curl -I https://wedding.beyondmotion.net/
curl https://wedding.beyondmotion.net/api/site-data
```

如果 `/api/site-data` 返回：

```json
{"source":"lark", ...}
```

说明网站已经读到飞书数据。

如果页面显示「本地备用数据」，通常是以下原因：

- Worker 没有配置 `LARK_APP_ID` / `LARK_APP_SECRET`
- 飞书应用没有多维表格权限
- 飞书应用没有访问这份多维表格
- Base Token 或 Table ID 填错

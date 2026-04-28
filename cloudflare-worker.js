const ORIGIN = "https://violin86318.github.io";
const SITE_PREFIX = "/zhang-guoqiang-wedding-site";
const LARK_API = "https://open.feishu.cn";

const DEFAULT_LARK_TABLES = {
  baseToken: "DpJzbbNWUaENaBspfrUckhS6nUh",
  works: "tblBiZDJjE6CzV6A",
  calendar: "tbl8yZAnXy7RvNYR",
  bookings: "tblkCrMs39qOdLZI",
  config: "tblFGakgPmBcQ60K",
};

function buildOriginUrl(requestUrl) {
  const url = new URL(requestUrl);
  const upstream = new URL(ORIGIN);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;

  upstream.pathname = `${SITE_PREFIX}${pathname}`;
  upstream.search = url.search;
  return upstream;
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function getLarkConfig(env) {
  return {
    appId: env.LARK_APP_ID,
    appSecret: env.LARK_APP_SECRET,
    baseToken: env.LARK_BASE_TOKEN || DEFAULT_LARK_TABLES.baseToken,
    tables: {
      works: env.LARK_TABLE_WORKS || DEFAULT_LARK_TABLES.works,
      calendar: env.LARK_TABLE_CALENDAR || DEFAULT_LARK_TABLES.calendar,
      bookings: env.LARK_TABLE_BOOKINGS || DEFAULT_LARK_TABLES.bookings,
      config: env.LARK_TABLE_CONFIG || DEFAULT_LARK_TABLES.config,
    },
  };
}

function assertLarkConfigured(config) {
  if (!config.appId || !config.appSecret || !config.baseToken) {
    throw new Error("Lark credentials are not configured.");
  }
}

async function getTenantAccessToken(config) {
  assertLarkConfigured(config);
  const response = await fetch(`${LARK_API}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      app_id: config.appId,
      app_secret: config.appSecret,
    }),
  });

  const payload = await response.json();
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.msg || "Failed to get Lark tenant access token.");
  }
  return payload.tenant_access_token;
}

async function larkRequest(config, token, path, init = {}) {
  const response = await fetch(`${LARK_API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });

  const payload = await response.json();
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.msg || `Lark API failed: ${path}`);
  }
  return payload.data;
}

function rowsToObjects(payload) {
  const fields = payload.fields || [];
  const rows = payload.data || [];
  const recordIds = payload.record_id_list || [];

  return rows.map((row, rowIndex) => {
    const item = { recordId: recordIds[rowIndex] };
    fields.forEach((field, fieldIndex) => {
      item[field] = row[fieldIndex];
    });
    return item;
  });
}

async function listRecords(config, token, tableId) {
  const records = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const search = new URLSearchParams({ limit: "100", offset: String(offset) });
    const payload = await larkRequest(
      config,
      token,
      `/open-apis/base/v3/bases/${config.baseToken}/tables/${tableId}/records?${search.toString()}`,
    );

    const pageRecords = rowsToObjects(payload);
    records.push(...pageRecords);
    hasMore = Boolean(payload.has_more);
    offset += pageRecords.length;
    if (!pageRecords.length) break;
  }

  return records;
}

async function createRecord(config, token, tableId, fields) {
  return larkRequest(config, token, `/open-apis/base/v3/bases/${config.baseToken}/tables/${tableId}/records`, {
    method: "POST",
    body: JSON.stringify(fields),
  });
}

function asText(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join("");
  if (typeof value === "object") return value.text || value.name || value.link || JSON.stringify(value);
  return String(value);
}

function isVisible(value) {
  const text = asText(value).trim().toLowerCase();
  return !["否", "false", "0", "no", "hidden"].includes(text);
}

function statusCode(value) {
  const text = asText(value).trim().toLowerCase();
  if (["已满档", "满档", "booked", "full"].includes(text)) return "booked";
  if (["已沟通", "沟通中", "hold", "pending"].includes(text)) return "hold";
  return "open";
}

function normalizeWorks(records) {
  return records
    .map((record, index) => ({
      recordId: record.recordId,
      title: asText(record["标题"]),
      year: asText(record["年份"]),
      type: asText(record["分类"]) || "wedding",
      image: asText(record["图片地址"]),
      sort: Number(asText(record["排序"])) || index + 1,
      description: asText(record["描述"]),
      visible: isVisible(record["是否显示"] || "是"),
    }))
    .filter((record) => record.title && record.image && record.visible)
    .sort((a, b) => a.sort - b.sort);
}

function normalizeCalendar(records) {
  return records
    .map((record) => ({
      recordId: record.recordId,
      date: asText(record["日期"]),
      status: statusCode(record["状态"]),
      note: asText(record["备注"]),
    }))
    .filter((record) => /^\d{4}-\d{2}-\d{2}$/.test(record.date))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function normalizeBookings(records) {
  return records.map((record) => ({
    recordId: record.recordId,
    name: asText(record["姓名"]),
    phone: asText(record["手机号"]),
    email: asText(record["邮箱"]),
    service: asText(record["服务类型"]),
    date: asText(record["拍摄日期"]),
    note: asText(record["备注"]),
    status: asText(record["状态"]),
    createdAt: asText(record["创建时间"]),
  }));
}

function normalizeConfig(records) {
  return Object.fromEntries(records.map((record) => [asText(record["键"]), asText(record["值"])]).filter(([key]) => key));
}

function formatShanghaiNow() {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

async function handleSiteData(env) {
  const config = getLarkConfig(env);
  const token = await getTenantAccessToken(config);
  const [works, calendar, bookings, siteConfig] = await Promise.all([
    listRecords(config, token, config.tables.works),
    listRecords(config, token, config.tables.calendar),
    listRecords(config, token, config.tables.bookings),
    listRecords(config, token, config.tables.config),
  ]);

  return jsonResponse({
    source: "lark",
    updatedAt: new Date().toISOString(),
    works: normalizeWorks(works),
    calendar: normalizeCalendar(calendar),
    bookings: normalizeBookings(bookings),
    config: normalizeConfig(siteConfig),
  });
}

async function handleBooking(request, env) {
  const config = getLarkConfig(env);
  const token = await getTenantAccessToken(config);
  const payload = await request.json();

  const record = {
    姓名: asText(payload.name).trim(),
    手机号: asText(payload.phone).trim(),
    邮箱: asText(payload.email).trim(),
    服务类型: asText(payload.service).trim(),
    拍摄日期: asText(payload.date).trim(),
    备注: asText(payload.note).trim(),
    状态: "新提交",
    创建时间: formatShanghaiNow(),
  };

  if (!record.姓名 || !record.手机号 || !record.邮箱 || !record.拍摄日期) {
    return jsonResponse({ ok: false, error: "Missing required booking fields." }, 400);
  }

  const created = await createRecord(config, token, config.tables.bookings, record);
  return jsonResponse({ ok: true, record: created });
}

async function proxyStaticAsset(request) {
  const upstreamUrl = buildOriginUrl(request.url);
  const response = await fetch(new Request(upstreamUrl, request));
  const headers = new Headers(response.headers);

  headers.set("x-proxied-by", "wedding-beyondmotion-worker");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/site-data" && request.method === "GET") {
        return await handleSiteData(env);
      }

      if (url.pathname === "/api/bookings" && request.method === "POST") {
        return await handleBooking(request, env);
      }

      if (url.pathname.startsWith("/api/")) {
        return jsonResponse({ ok: false, error: "API route not found." }, 404);
      }
    } catch (error) {
      return jsonResponse({ ok: false, error: error.message }, 503);
    }

    return proxyStaticAsset(request);
  },
};

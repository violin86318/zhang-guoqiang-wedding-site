const API_ENDPOINTS = {
  siteData: "./api/site-data",
  bookings: "./api/bookings",
};

const STORAGE_KEYS = {
  bookings: "shuangyinghua.bookings",
  users: "shuangyinghua.users",
  currentUser: "shuangyinghua.currentUser",
  calendar: "shuangyinghua.calendar",
};

const fallbackWorks = [
  {
    title: "婚礼 / 闽西农村婚礼",
    year: "2024",
    type: "wedding",
    image: "./public/assets/work-grandmother-child.png",
    sort: 1,
    visible: true,
  },
  {
    title: "婚礼 / 仪式与情感",
    year: "2024",
    type: "wedding",
    image: "./public/assets/work-red-veil.png",
    sort: 2,
    visible: true,
  },
  {
    title: "家庭 / 日常与陪伴",
    year: "2024",
    type: "family",
    image: "./public/assets/work-family-bw.png",
    sort: 3,
    visible: true,
  },
  {
    title: "婚礼 / 传统与仪式",
    year: "2024",
    type: "wedding",
    image: "./public/assets/work-banquet-toast.png",
    sort: 4,
    visible: true,
  },
  {
    title: "婚礼 / 细节与温度",
    year: "2024",
    type: "wedding",
    image: "./public/assets/work-tea-hands.png",
    sort: 5,
    visible: true,
  },
];

const fallbackBookings = [
  {
    id: "sample-1",
    name: "林小姐",
    phone: "138****0912",
    email: "sample@example.com",
    service: "婚礼纪实",
    date: "2026-05-18",
    note: "希望多记录双方父母和敬茶环节。",
    status: "样例",
    createdAt: "2026-04-27 20:30",
  },
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function seedCalendar() {
  const existing = readJson(STORAGE_KEYS.calendar, null);
  if (Array.isArray(existing) && existing.some((item) => item.date)) return existing;

  const start = new Date("2026-04-01T00:00:00+08:00");
  return Array.from({ length: 45 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const status = [5, 6, 7, 14, 18, 22, 27, 31, 39].includes(index)
      ? "hold"
      : [10, 11, 20, 21, 33, 34].includes(index)
        ? "booked"
        : "open";
    return { date: formatDate(date), status, note: "本地初始档期" };
  });
}

const state = {
  filter: "all",
  authMode: "login",
  monthIndex: 4,
  dataSource: "local",
  config: {},
  works: fallbackWorks,
  bookings: readJson(STORAGE_KEYS.bookings, fallbackBookings),
  users: readJson(STORAGE_KEYS.users, []),
  currentUser: readJson(STORAGE_KEYS.currentUser, null),
  calendar: seedCalendar(),
};

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

function normalizeStatus(value) {
  const text = asText(value).trim().toLowerCase();
  if (["已满档", "满档", "booked", "full"].includes(text)) return "booked";
  if (["已沟通", "沟通中", "hold", "pending"].includes(text)) return "hold";
  return "open";
}

function normalizeWorks(items) {
  if (!Array.isArray(items)) return fallbackWorks;
  const works = items
    .map((item, index) => ({
      title: asText(item.title ?? item["标题"]),
      year: asText(item.year ?? item["年份"]) || "2024",
      type: asText(item.type ?? item.category ?? item["分类"]) || "wedding",
      image: asText(item.image ?? item.imageUrl ?? item["图片地址"]) || fallbackWorks[index % fallbackWorks.length].image,
      sort: Number(asText(item.sort ?? item["排序"])) || index + 1,
      description: asText(item.description ?? item["描述"]),
      visible: isVisible(item.visible ?? item["是否显示"] ?? "是"),
    }))
    .filter((item) => item.title && item.visible)
    .sort((a, b) => a.sort - b.sort);

  return works.length ? works : fallbackWorks;
}

function normalizeCalendar(items) {
  if (!Array.isArray(items)) return seedCalendar();
  const calendar = items
    .map((item) => ({
      date: asText(item.date ?? item["日期"]),
      status: normalizeStatus(item.status ?? item["状态"]),
      note: asText(item.note ?? item["备注"]),
    }))
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  return calendar.length ? calendar : seedCalendar();
}

function normalizeBookings(items) {
  if (!Array.isArray(items)) return fallbackBookings;
  const bookings = items
    .map((item, index) => ({
      id: asText(item.id ?? item.recordId ?? item["ID"]) || `booking-${index}`,
      name: asText(item.name ?? item["姓名"]),
      phone: asText(item.phone ?? item["手机号"]),
      email: asText(item.email ?? item["邮箱"]),
      service: asText(item.service ?? item["服务类型"]),
      date: asText(item.date ?? item["拍摄日期"]),
      note: asText(item.note ?? item["备注"]),
      status: asText(item.status ?? item["状态"]) || "新提交",
      createdAt: asText(item.createdAt ?? item["创建时间"]),
    }))
    .filter((item) => item.name || item.phone || item.email);

  return bookings.length ? bookings : fallbackBookings;
}

function applyConfig(config = {}) {
  state.config = config;
  const baseCity = asText(config.base_city);
  const roots = asText(config.roots);
  const xhsUrl = asText(config.xhs_url);

  if (baseCity && $("[data-base-city]")) $("[data-base-city]").textContent = baseCity;
  if (roots && $("[data-roots]")) $("[data-roots]").textContent = roots;
  if (xhsUrl && $("[data-xhs-link]")) $("[data-xhs-link]").href = xhsUrl;
}

async function loadRemoteData() {
  try {
    const response = await fetch(API_ENDPOINTS.siteData, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Site data unavailable: ${response.status}`);

    const payload = await response.json();
    state.works = normalizeWorks(payload.works);
    state.calendar = normalizeCalendar(payload.calendar);
    state.bookings = normalizeBookings(payload.bookings);
    state.dataSource = payload.source === "lark" ? "feishu" : "local";
    applyConfig(payload.config);
  } catch {
    state.dataSource = "local";
  }

  renderAll();
}

function renderWorks() {
  const rail = $("[data-work-rail]");
  const allWorks = state.works.filter((work) => work.visible !== false);
  const items = state.filter === "all" ? allWorks : allWorks.filter((work) => work.type === state.filter);

  rail.innerHTML = items
    .map(
      (work) => `
        <article class="work-card">
          <figure>
            <img src="${escapeHtml(work.image)}" alt="${escapeHtml(work.title)}" loading="lazy" />
            <figcaption>
              <h3>${escapeHtml(work.title)}</h3>
              <p>${escapeHtml(work.year)}</p>
            </figcaption>
          </figure>
        </article>
      `,
    )
    .join("");

  if ($("[data-work-count]")) $("[data-work-count]").textContent = allWorks.length;
}

function renderCalendar() {
  const calendar = $("[data-calendar]");
  const month = $("[data-current-month]");
  month.textContent = `${state.monthIndex}月`;

  const monthItems = state.calendar.filter((day) => Number(day.date.slice(5, 7)) === state.monthIndex);
  calendar.innerHTML = monthItems
    .map(
      (day) => `
        <button
          type="button"
          class="${day.status}"
          data-date="${day.date}"
          aria-label="${day.date}：${statusLabel(day.status)}"
          title="${day.date} / ${statusLabel(day.status)}${day.note ? ` / ${escapeHtml(day.note)}` : ""}"
        ></button>
      `,
    )
    .join("");

  const openCount = monthItems.filter((day) => day.status === "open").length;
  $("[data-open-count]").textContent = openCount;
}

function statusLabel(status) {
  return {
    open: "可预约",
    hold: "已沟通",
    booked: "已满档",
  }[status];
}

function renderBookings() {
  const count = state.bookings.length;
  $("[data-booking-count]").textContent = count;
  $("[data-message-count]").textContent = state.bookings.filter((item) => item.note).length;

  const list = $("[data-booking-list]");
  if (!state.bookings.length) {
    list.innerHTML = `<p class="empty-state">暂无预约。提交表单后会出现在这里。</p>`;
    return;
  }

  list.innerHTML = state.bookings
    .slice()
    .reverse()
    .map(
      (item) => `
        <article class="booking-item">
          <div>
            <strong>${escapeHtml(item.name)} · ${escapeHtml(item.service)}</strong>
            <p>${escapeHtml(item.date)} / ${escapeHtml(item.phone)} / ${escapeHtml(item.email)}</p>
            <small>${escapeHtml(item.note || "未填写备注")}</small>
          </div>
          <small>${escapeHtml(item.status || item.createdAt || "NEW")}</small>
        </article>
      `,
    )
    .join("");
}

function renderUser() {
  const target = $("[data-user-state]");
  const sourceText = state.dataSource === "feishu" ? "飞书多维表格" : "本地 fallback";
  target.innerHTML = `
    <div class="booking-item">
      <div>
        <strong>${sourceText}</strong>
        <p>${state.dataSource === "feishu" ? "作品、档期和预约数据正在从飞书读取。" : "后台接口未配置或不可用，当前使用本地展示数据。"}</p>
        <small>登录 / 注册仍是前端原型，正式客户管理建议直接使用飞书权限。</small>
      </div>
      <small>${state.dataSource.toUpperCase()}</small>
    </div>
  `;
}

function renderDataSource() {
  const source = $("[data-data-source]");
  if (!source) return;
  source.textContent = state.dataSource === "feishu" ? "已连接飞书多维表格" : "本地备用数据";
}

function renderAll() {
  renderWorks();
  renderCalendar();
  renderBookings();
  renderUser();
  renderDataSource();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCreatedAt() {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

async function submitBookingToBackend(booking) {
  const response = await fetch(API_ENDPOINTS.bookings, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(booking),
  });

  if (!response.ok) throw new Error(`Booking API unavailable: ${response.status}`);
  return response.json();
}

function bindInteractions() {
  const header = $("[data-header]");
  const nav = $(".nav");
  const video = $("[data-hero-video]");
  const videoState = $("[data-video-state]");
  const authModal = $("[data-auth-modal]");
  const authForm = $("[data-auth-form]");
  const authSubmit = $("[data-auth-submit]");
  const authNote = $("[data-auth-note]");

  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 30);
  });

  $("[data-menu-toggle]").addEventListener("click", () => {
    nav.classList.toggle("open");
  });

  $$(".nav a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
    });
  });

  $("[data-video-toggle]").addEventListener("click", async () => {
    if (video.paused) {
      await video.play();
      videoState.textContent = "静音";
    } else {
      video.pause();
      videoState.textContent = "暂停";
    }
  });

  $$(".portfolio-tabs button").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      $$(".portfolio-tabs button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderWorks();
    });
  });

  $("[data-month-prev]").addEventListener("click", () => {
    state.monthIndex = Math.max(4, state.monthIndex - 1);
    renderCalendar();
  });

  $("[data-month-next]").addEventListener("click", () => {
    state.monthIndex = Math.min(9, state.monthIndex + 1);
    renderCalendar();
  });

  $("[data-calendar]").addEventListener("click", (event) => {
    if (state.dataSource === "feishu") return;
    const button = event.target.closest("button[data-date]");
    if (!button) return;
    const date = button.dataset.date;
    const day = state.calendar.find((item) => item.date === date);
    if (!day) return;
    day.status = day.status === "open" ? "hold" : day.status === "hold" ? "booked" : "open";
    writeJson(STORAGE_KEYS.calendar, state.calendar);
    renderCalendar();
  });

  $("[data-booking-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const booking = {
      id: crypto.randomUUID(),
      name: data.name,
      phone: data.phone,
      email: data.email,
      service: data.service,
      date: data.date,
      note: data.note,
      status: "新提交",
      createdAt: formatCreatedAt(),
    };

    const note = $("[data-form-note]");
    note.textContent = "正在提交预约...";

    try {
      await submitBookingToBackend(booking);
      state.bookings.push(booking);
      note.textContent = "预约已提交到飞书后台。";
    } catch {
      state.bookings.push(booking);
      writeJson(STORAGE_KEYS.bookings, state.bookings);
      note.textContent = "后台接口未配置，预约已暂存到本地浏览器。";
    }

    form.reset();
    renderBookings();
    document.querySelector("#admin").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $$("[data-open-auth]").forEach((button) => {
    button.addEventListener("click", () => {
      authModal.showModal();
      authNote.textContent = "";
    });
  });

  $("[data-close-auth]").addEventListener("click", () => {
    authModal.close();
  });

  $$("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.authMode = button.dataset.authMode;
      $$("[data-auth-mode]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      authSubmit.textContent = state.authMode === "login" ? "登录" : "注册";
      authNote.textContent = "";
    });
  });

  authForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(authForm).entries());
    const email = data.email.trim().toLowerCase();
    const password = data.password;

    if (state.authMode === "register") {
      if (state.users.some((user) => user.email === email)) {
        authNote.textContent = "该邮箱已注册，请直接登录。";
        return;
      }
      const user = { id: crypto.randomUUID(), email, password };
      state.users.push(user);
      state.currentUser = { id: user.id, email: user.email };
      writeJson(STORAGE_KEYS.users, state.users);
      writeJson(STORAGE_KEYS.currentUser, state.currentUser);
      authNote.textContent = "注册成功，已登录。";
    } else {
      const user = state.users.find((item) => item.email === email && item.password === password);
      if (!user) {
        authNote.textContent = "未找到匹配账号。可切换到注册创建本地账号。";
        return;
      }
      state.currentUser = { id: user.id, email: user.email };
      writeJson(STORAGE_KEYS.currentUser, state.currentUser);
      authNote.textContent = "登录成功。";
    }

    renderUser();
    setTimeout(() => authModal.close(), 650);
  });

  $$("[data-admin-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      $$("[data-admin-tab]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      document.querySelector("#admin").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

renderAll();
bindInteractions();
loadRemoteData();

const STORAGE_KEYS = {
  bookings: "shuangyinghua.bookings",
  users: "shuangyinghua.users",
  currentUser: "shuangyinghua.currentUser",
  calendar: "shuangyinghua.calendar",
};

const works = [
  {
    title: "婚礼 / 闽西农村婚礼",
    year: "2024",
    type: "wedding",
    image: "./public/assets/work-grandmother-child.png",
  },
  {
    title: "婚礼 / 仪式与情感",
    year: "2024",
    type: "wedding",
    image: "./public/assets/work-red-veil.png",
  },
  {
    title: "家庭 / 日常与陪伴",
    year: "2024",
    type: "family",
    image: "./public/assets/work-family-bw.png",
  },
  {
    title: "婚礼 / 传统与仪式",
    year: "2024",
    type: "wedding",
    image: "./public/assets/work-banquet-toast.png",
  },
  {
    title: "婚礼 / 细节与温度",
    year: "2024",
    type: "wedding",
    image: "./public/assets/work-tea-hands.png",
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

function seedCalendar() {
  const existing = readJson(STORAGE_KEYS.calendar, null);
  if (existing) return existing;

  const days = Array.from({ length: 45 }, (_, index) => {
    const status = [5, 6, 7, 14, 18, 22, 27, 31, 39].includes(index)
      ? "hold"
      : [10, 11, 20, 21, 33, 34].includes(index)
        ? "booked"
        : "open";
    return { id: index + 1, status };
  });
  writeJson(STORAGE_KEYS.calendar, days);
  return days;
}

const state = {
  filter: "all",
  authMode: "login",
  monthIndex: 4,
  bookings: readJson(STORAGE_KEYS.bookings, [
    {
      id: "sample-1",
      name: "林小姐",
      phone: "138****0912",
      email: "sample@example.com",
      service: "婚礼纪实",
      date: "2026-05-18",
      note: "希望多记录双方父母和敬茶环节。",
      createdAt: "2026-04-27 20:30",
    },
  ]),
  users: readJson(STORAGE_KEYS.users, []),
  currentUser: readJson(STORAGE_KEYS.currentUser, null),
  calendar: seedCalendar(),
};

function renderWorks() {
  const rail = $("[data-work-rail]");
  const items = state.filter === "all" ? works : works.filter((work) => work.type === state.filter);
  rail.innerHTML = items
    .map(
      (work) => `
        <article class="work-card">
          <figure>
            <img src="${work.image}" alt="${work.title}" loading="lazy" />
            <figcaption>
              <h3>${work.title}</h3>
              <p>${work.year}</p>
            </figcaption>
          </figure>
        </article>
      `,
    )
    .join("");
}

function renderCalendar() {
  const calendar = $("[data-calendar]");
  const month = $("[data-current-month]");
  month.textContent = `${state.monthIndex}月`;
  calendar.innerHTML = state.calendar
    .map(
      (day) => `
        <button
          type="button"
          class="${day.status}"
          data-day="${day.id}"
          aria-label="${state.monthIndex}月第${day.id}个档期：${statusLabel(day.status)}"
          title="${statusLabel(day.status)}"
        ></button>
      `,
    )
    .join("");

  $("[data-open-count]").textContent = state.calendar.filter((day) => day.status === "open").length;
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
          <small>${escapeHtml(item.createdAt)}</small>
        </article>
      `,
    )
    .join("");
}

function renderUser() {
  const target = $("[data-user-state]");
  if (!state.currentUser) {
    target.innerHTML = `<p class="empty-state">未登录。可以打开登录 / 注册弹窗创建本地账号。</p>`;
    return;
  }
  target.innerHTML = `
    <div class="booking-item">
      <div>
        <strong>${escapeHtml(state.currentUser.email)}</strong>
        <p>已登录本地后台原型</p>
        <small>账号数据保存在 localStorage，可作为后续真实鉴权接口的前端样板。</small>
      </div>
      <small>ACTIVE</small>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
    const button = event.target.closest("button[data-day]");
    if (!button) return;
    const id = Number(button.dataset.day);
    const day = state.calendar.find((item) => item.id === id);
    if (!day) return;
    day.status = day.status === "open" ? "hold" : day.status === "hold" ? "booked" : "open";
    writeJson(STORAGE_KEYS.calendar, state.calendar);
    renderCalendar();
  });

  $("[data-booking-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const booking = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
    };
    state.bookings.push(booking);
    writeJson(STORAGE_KEYS.bookings, state.bookings);
    form.reset();
    $("[data-form-note]").textContent = "预约已提交，并写入本地后台数据。";
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

renderWorks();
renderCalendar();
renderBookings();
renderUser();
bindInteractions();

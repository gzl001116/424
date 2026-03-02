const novels = [
  {
    id: "novel-1",
    title: "《云端侦探》",
    intro: "一个发生在近未来都市的悬疑故事。",
    chapters: [
      { id: 1, title: "第1章 雨夜追踪", price: 0, content: "林澈站在高架桥下，看着霓虹倒映在积水里。" },
      { id: 2, title: "第2章 消失的硬盘", price: 5, content: "线索指向一间被遗弃的数据中心，门锁却刚被人动过。" },
      { id: 3, title: "第3章 镜像中的人", price: 8, content: "监控画面里出现了另一个‘林澈’，时间戳却是明天。" }
    ]
  },
  {
    id: "novel-2",
    title: "《旧城月光》",
    intro: "民国背景下的情感与家族传奇。",
    chapters: [
      { id: 1, title: "第1章 青石巷", price: 0, content: "苏婉第一次回到旧城，巷口桂花香依旧。" },
      { id: 2, title: "第2章 戏台风波", price: 6, content: "一封遗失的信件，让两家恩怨再次浮出水面。" },
      { id: 3, title: "第3章 月下誓言", price: 10, content: "月色如水，她终于说出藏了十年的秘密。" }
    ]
  }
];

const methodLabel = {
  visa: "Visa",
  mastercard: "Mastercard",
  alipay: "支付宝",
  wechat: "微信支付",
  paypal: "PayPal"
};

const payoutLabel = {
  paypal: "PayPal",
  wise: "Wise",
  crypto: "虚拟币账户"
};

const state = {
  user: JSON.parse(localStorage.getItem("paid_novel_user") || "null"),
  balance: Number(localStorage.getItem("paid_novel_balance") || 0),
  unlocked: JSON.parse(localStorage.getItem("paid_novel_unlocked") || "{}"),
  payoutSettings: JSON.parse(
    localStorage.getItem("paid_novel_payout_settings") || '{"channel":"paypal","account":""}'
  ),
  payoutLogs: JSON.parse(localStorage.getItem("paid_novel_payout_logs") || "[]"),
  lastPayment: JSON.parse(localStorage.getItem("paid_novel_last_payment") || "null"),
  currentNovelId: novels[0].id
};

const dom = {
  novelList: document.getElementById("novelList"),
  chapterList: document.getElementById("chapterList"),
  chapterContent: document.getElementById("chapterContent"),
  bookTitle: document.getElementById("bookTitle"),
  balanceText: document.getElementById("balanceText"),
  welcomeText: document.getElementById("welcomeText"),
  loginBtn: document.getElementById("loginBtn"),
  rechargeBtn: document.getElementById("rechargeBtn"),
  rechargeAmount: document.getElementById("rechargeAmount"),
  paymentMethod: document.getElementById("paymentMethod"),
  lastPaymentText: document.getElementById("lastPaymentText"),
  payoutChannel: document.getElementById("payoutChannel"),
  payoutAccount: document.getElementById("payoutAccount"),
  savePayoutBtn: document.getElementById("savePayoutBtn"),
  nextPayoutText: document.getElementById("nextPayoutText"),
  payoutLogs: document.getElementById("payoutLogs"),
  authDialog: document.getElementById("authDialog"),
  authForm: document.getElementById("authForm"),
  googleLoginBtn: document.getElementById("googleLoginBtn")
};

function persist() {
  localStorage.setItem("paid_novel_user", JSON.stringify(state.user));
  localStorage.setItem("paid_novel_balance", String(state.balance));
  localStorage.setItem("paid_novel_unlocked", JSON.stringify(state.unlocked));
  localStorage.setItem("paid_novel_payout_settings", JSON.stringify(state.payoutSettings));
  localStorage.setItem("paid_novel_payout_logs", JSON.stringify(state.payoutLogs));
  localStorage.setItem("paid_novel_last_payment", JSON.stringify(state.lastPayment));
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function loginAs(userText) {
  state.user = userText;
  persist();
  dom.authDialog.close();
  renderHeader();
}


function mockGoogleProfileFetch() {
  const googleAccounts = ["reader.auto@gmail.com", "author.auto@gmail.com"];
  const picked = googleAccounts[Math.floor(Math.random() * googleAccounts.length)];
  return new Promise((resolve) => {
    setTimeout(() => resolve({ email: picked }), 600);
  });
}

function currentNovel() {
  return novels.find((item) => item.id === state.currentNovelId);
}

function canRead(novelId, chapter) {
  if (chapter.price === 0) {
    return true;
  }
  const list = state.unlocked[novelId] || [];
  return list.includes(chapter.id);
}

function unlockChapter(novelId, chapter) {
  if (!state.user) {
    alert("请先登录后购买章节。");
    return false;
  }
  if (state.balance < chapter.price) {
    alert("余额不足，请先充值。");
    return false;
  }

  state.balance -= chapter.price;
  state.unlocked[novelId] = state.unlocked[novelId] || [];
  state.unlocked[novelId].push(chapter.id);
  persist();
  return true;
}

function fmtDate(value) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function nextPayoutDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (now.getDate() === 1) {
    return new Date(year, month, 1, 10, 0, 0, 0);
  }
  return new Date(year, month + 1, 1, 10, 0, 0, 0);
}

function simulateMonthlyPayout() {
  if (!state.payoutSettings.account) {
    return;
  }
  const now = new Date();
  if (now.getDate() !== 1) {
    return;
  }

  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const exists = state.payoutLogs.some((log) => log.monthKey === monthKey);
  if (exists) {
    return;
  }

  const amount = Math.max(0, Math.floor(state.balance * 0.7));
  state.payoutLogs.unshift({
    monthKey,
    channel: state.payoutSettings.channel,
    account: state.payoutSettings.account,
    amount,
    createdAt: now.toISOString()
  });
  state.payoutLogs = state.payoutLogs.slice(0, 10);
  persist();
}

function renderHeader() {
  dom.welcomeText.textContent = state.user ? `欢迎你，${state.user}` : "游客模式";
  dom.balanceText.textContent = state.balance;
}

function renderPaymentInfo() {
  if (!state.lastPayment) {
    dom.lastPaymentText.textContent = "暂无充值记录。";
  } else {
    dom.lastPaymentText.textContent = `最近一次充值：${state.lastPayment.amount} 星币（${methodLabel[state.lastPayment.method]}），时间：${fmtDate(state.lastPayment.createdAt)}`;
  }
}

function renderPayoutInfo() {
  dom.payoutChannel.value = state.payoutSettings.channel;
  dom.payoutAccount.value = state.payoutSettings.account;
  dom.nextPayoutText.textContent = `下次自动打款时间：${fmtDate(nextPayoutDate().toISOString())}，渠道：${payoutLabel[state.payoutSettings.channel] || "未设置"}`;

  dom.payoutLogs.innerHTML = "";
  if (state.payoutLogs.length === 0) {
    dom.payoutLogs.innerHTML = '<div class="log-item">暂无自动打款记录。</div>';
    return;
  }

  state.payoutLogs.forEach((log) => {
    const div = document.createElement("div");
    div.className = "log-item";
    div.textContent = `${log.monthKey} 自动打款 ${log.amount} 星币 -> ${payoutLabel[log.channel]} (${log.account})，执行时间：${fmtDate(log.createdAt)}`;
    dom.payoutLogs.appendChild(div);
  });
}

function renderNovelList() {
  dom.novelList.innerHTML = "";
  novels.forEach((novel) => {
    const li = document.createElement("li");
    li.className = `novel-item ${novel.id === state.currentNovelId ? "active" : ""}`;
    li.innerHTML = `<strong>${novel.title}</strong><p>${novel.intro}</p>`;
    li.addEventListener("click", () => {
      state.currentNovelId = novel.id;
      render();
    });
    dom.novelList.appendChild(li);
  });
}

function readChapter(chapter) {
  const novel = currentNovel();
  if (!canRead(novel.id, chapter)) {
    const yes = confirm(`${chapter.title} 需要 ${chapter.price} 星币解锁，是否购买？`);
    if (!yes) {
      return;
    }
    const ok = unlockChapter(novel.id, chapter);
    if (!ok) {
      return;
    }
  }
  dom.chapterContent.innerHTML = `<h3>${chapter.title}</h3><p>${chapter.content}</p>`;
  renderHeader();
  renderChapterList();
}

function renderChapterList() {
  const novel = currentNovel();
  dom.bookTitle.textContent = novel.title;
  dom.chapterList.innerHTML = "";

  novel.chapters.forEach((chapter) => {
    const button = document.createElement("button");
    const readable = canRead(novel.id, chapter);
    button.className = `chapter-btn ${readable ? "" : "locked"}`;
    button.textContent = readable ? chapter.title : `${chapter.title}（${chapter.price}币）`;
    button.addEventListener("click", () => readChapter(chapter));
    dom.chapterList.appendChild(button);
  });
}

function render() {
  renderHeader();
  renderPaymentInfo();
  renderPayoutInfo();
  renderNovelList();
  renderChapterList();
}

dom.loginBtn.addEventListener("click", () => {
  dom.authDialog.showModal();
});

dom.authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(dom.authForm);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();

  if (!isEmail(email)) {
    alert("请输入有效邮箱地址。");
    return;
  }
  if (password.length < 6) {
    alert("密码至少 6 位。");
    return;
  }

  loginAs(`邮箱用户：${email}`);
});

dom.googleLoginBtn.addEventListener("click", async () => {
  dom.googleLoginBtn.disabled = true;
  const originalText = dom.googleLoginBtn.textContent;
  dom.googleLoginBtn.textContent = "Google 登录中...";

  try {
    const profile = await mockGoogleProfileFetch();
    if (!profile || !isEmail(profile.email)) {
      alert("Google 账号拉取失败，请稍后重试。");
      return;
    }
    loginAs(`Google用户：${profile.email}`);
  } finally {
    dom.googleLoginBtn.disabled = false;
    dom.googleLoginBtn.textContent = originalText;
  }
});

dom.rechargeBtn.addEventListener("click", () => {
  if (!state.user) {
    alert("请先登录后充值。");
    return;
  }

  const amount = Number(dom.rechargeAmount.value);
  const method = dom.paymentMethod.value;
  if (amount <= 0 || Number.isNaN(amount)) {
    alert("请输入有效充值金额。");
    return;
  }

  state.balance += amount;
  state.lastPayment = {
    amount,
    method,
    createdAt: new Date().toISOString()
  };
  persist();
  renderHeader();
  renderPaymentInfo();
});

dom.savePayoutBtn.addEventListener("click", () => {
  if (!state.user) {
    alert("请先登录后配置自动打款。");
    return;
  }

  const channel = dom.payoutChannel.value;
  const account = dom.payoutAccount.value.trim();
  if (!account) {
    alert("请填写收款账号。");
    return;
  }

  state.payoutSettings = { channel, account };
  persist();
  renderPayoutInfo();
  alert(`已保存：每月1号自动打款到 ${payoutLabel[channel]}。`);
});

simulateMonthlyPayout();
render();

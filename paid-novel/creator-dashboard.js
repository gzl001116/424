const payoutLabel = {
  paypal: "PayPal",
  wise: "Wise",
  crypto: "虚拟币账户"
};

const state = {
  balance: Number(localStorage.getItem("paid_novel_balance") || 0),
  payoutSettings: JSON.parse(localStorage.getItem("paid_novel_payout_settings") || '{"channel":"paypal","account":""}'),
  payoutLogs: JSON.parse(localStorage.getItem("paid_novel_payout_logs") || "[]")
};

const dom = {
  pendingPayout: document.getElementById("pendingPayout"),
  payoutChannel: document.getElementById("payoutChannel"),
  payoutAccount: document.getElementById("payoutAccount"),
  savePayoutBtn: document.getElementById("savePayoutBtn"),
  nextPayoutText: document.getElementById("nextPayoutText"),
  payoutLogs: document.getElementById("payoutLogs")
};

function persist() {
  localStorage.setItem("paid_novel_payout_settings", JSON.stringify(state.payoutSettings));
  localStorage.setItem("paid_novel_payout_logs", JSON.stringify(state.payoutLogs));
}

function fmtDate(value) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function nextPayoutDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1, 10, 0, 0, 0);
}

function render() {
  dom.pendingPayout.textContent = `${Math.max(0, Math.floor(state.balance * 0.7))} 星币`;
  dom.payoutChannel.value = state.payoutSettings.channel;
  dom.payoutAccount.value = state.payoutSettings.account;
  dom.nextPayoutText.textContent = `下次自动打款时间：${fmtDate(nextPayoutDate())}，渠道：${payoutLabel[state.payoutSettings.channel]}`;

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

dom.savePayoutBtn.addEventListener("click", () => {
  const channel = dom.payoutChannel.value;
  const account = dom.payoutAccount.value.trim();
  if (!account) {
    alert("请填写收款账号。");
    return;
  }
  state.payoutSettings = { channel, account };
  persist();
  render();
  alert("创作者后台结算设置已保存。");
});

render();

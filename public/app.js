const responseBox = document.querySelector("#responseBox");
const keyStatus = document.querySelector("#keyStatus");
const lastActionValue = document.querySelector("#lastActionValue");
const refundType = document.querySelector("#refundType");
const refundAmount = document.querySelector("#refundAmount");

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".tab")
      .forEach((item) => item.classList.remove("active"));
    document
      .querySelectorAll(".panel")
      .forEach((panel) => panel.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`#${tab.dataset.tab}`).classList.add("active");
  });
});

refundType.addEventListener("change", () => {
  const isPartial = refundType.value === "Partial";
  refundAmount.disabled = !isPartial;
  refundAmount.required = isPartial;
  if (!isPartial) {
    refundAmount.value = "";
  }
});

document.querySelector("#clearResponse").addEventListener("click", () => {
  responseBox.textContent = "Waiting for a request.";
});

document
  .querySelector("#refundForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    if (payload.refund_type !== "Partial") {
      delete payload.refund_amount;
    }

    await callApi("Refund request", "/api/refunds", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  });

document.querySelector("#loadDisputes").addEventListener("click", async () => {
  const result = await callApi("Load disputes", "/api/disputes");
  renderDisputes(result);
});

document
  .querySelector("#uploadUrlForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ticketId = encodeURIComponent(form.get("ticket_id"));
    const fileName = encodeURIComponent(form.get("file_name"));

    await callApi(
      "Generate upload URL",
      `/api/disputes/${ticketId}/upload-url/${fileName}`,
    );
  });

document
  .querySelector("#resolveForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ticketId = encodeURIComponent(form.get("ticket_id"));
    const payload = {
      action: form.get("action"),
      file_name: form.get("file_name") || undefined,
    };

    await callApi("Resolve dispute", `/api/disputes/${ticketId}/resolve`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  });

loadConfig();

async function loadConfig() {
  const config = await callApi(
    "Configuration check",
    "/api/config",
    undefined,
    false,
  );
  const data = config?.data || {};

  document.querySelector("#envValue").textContent = data.squadEnv || "-";
  document.querySelector("#baseUrlValue").textContent = data.baseUrl || "-";

  keyStatus.classList.remove("ready", "missing");
  if (data.hasSecretKey) {
    keyStatus.textContent = "Secret key configured";
    keyStatus.classList.add("ready");
  } else {
    keyStatus.textContent = "Missing secret key";
    keyStatus.classList.add("missing");
  }
}

async function callApi(label, url, options = {}, updateLastAction = true) {
  const requestOptions = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body,
  };

  responseBox.textContent = `Sending ${label.toLowerCase()}...`;

  try {
    const response = await fetch(url, requestOptions);
    const data = await response.json();
    responseBox.textContent = JSON.stringify(data, null, 2);
    if (updateLastAction) {
      lastActionValue.textContent = `${label} (${response.status})`;
    }
    return data;
  } catch (error) {
    const failed = {
      success: false,
      message: error.message,
    };
    responseBox.textContent = JSON.stringify(failed, null, 2);
    if (updateLastAction) {
      lastActionValue.textContent = `${label} failed`;
    }
    return failed;
  }
}

function renderDisputes(result) {
  const tbody = document.querySelector("#disputeRows");
  const rows = findRows(result);

  if (!rows.length) {
    tbody.innerHTML =
      '<tr><td colspan="4">No dispute rows found in the response.</td></tr>';
    return;
  }

  tbody.innerHTML = rows
    .map((row) => {
      const ticket = pick(row, ["ticket_id", "ticketId", "id", "ticket"]);
      const transaction = pick(row, [
        "transaction_ref",
        "transaction_reference",
        "transactionRef",
        "reference",
      ]);
      const amount = pick(row, [
        "amount",
        "principal_amount",
        "transaction_amount",
      ]);
      const status = pick(row, [
        "status",
        "dispute_status",
        "resolution_status",
      ]);
      return `<tr>
        <td>${escapeHtml(ticket || "-")}</td>
        <td>${escapeHtml(transaction || "-")}</td>
        <td>${escapeHtml(amount || "-")}</td>
        <td>${escapeHtml(status || "-")}</td>
      </tr>`;
    })
    .join("");
}

function findRows(result) {
  const data = result?.data?.data || result?.data || result;
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.rows)) {
    return data.rows;
  }
  if (Array.isArray(data?.disputes)) {
    return data.disputes;
  }
  if (Array.isArray(data?.data?.rows)) {
    return data.data.rows;
  }
  if (Array.isArray(data?.data)) {
    return data.data;
  }
  return [];
}

function pick(object, keys) {
  for (const key of keys) {
    if (object && object[key] !== undefined && object[key] !== null) {
      return String(object[key]);
    }
  }
  return "";
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[character];
  });
}

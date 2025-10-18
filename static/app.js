const form = document.getElementById("download-form");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const submitBtn = document.getElementById("submit");
const uploadCatboxChk = document.getElementById("upload_catbox");
const catboxUserhashWrap = document.getElementById("catbox_userhash_wrap");
const catboxUserhashInput = document.getElementById("catbox_userhash");

uploadCatboxChk.addEventListener("change", () => {
  catboxUserhashWrap.style.display = uploadCatboxChk.checked ? "block" : "none";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  resultEl.innerHTML = "";

  const url = document.getElementById("url").value.trim();
  const format = document.querySelector('input[name="format"]:checked').value;
  const agree = document.getElementById("agree").checked;
  const upload_to_catbox = uploadCatboxChk.checked;
  const catbox_userhash = catboxUserhashInput.value.trim() || null;

  if (!url) return;

  submitBtn.disabled = true;
  statusEl.textContent = "Downloading... This may take a moment.";

  try {
    const resp = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, format, agree, upload_to_catbox, catbox_userhash }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data?.detail || "Download failed");
    }

    statusEl.textContent = "Ready:";

    const a = document.createElement("a");
    a.href = data.download_url;
    a.textContent = `Click here to download ${data.filename}`;
    a.className = "download-link";
    resultEl.appendChild(a);

    if (data.catbox_url) {
      const br = document.createElement("div");
      br.style.marginTop = "8px";
      const share = document.createElement("a");
      share.href = data.catbox_url;
      share.textContent = `Shareable Catbox link`;
      share.className = "download-link";
      resultEl.appendChild(br);
      resultEl.appendChild(share);
    } else if (data.catbox_error) {
      const errEl = document.createElement("div");
      errEl.textContent = `Catbox upload failed: ${data.catbox_error}`;
      errEl.style.color = "#fca5a5";
      errEl.style.marginTop = "6px";
      resultEl.appendChild(errEl);
    }
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  } finally {
    submitBtn.disabled = false;
  }
});
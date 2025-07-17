export function render2FAPage(loggedUser: any, token : string, container: HTMLDivElement) {
  const section = document.createElement("div");
  section.className = "mt-6 p-4 border rounded bg-gray-100";

  const title = document.createElement("h4");
  title.textContent = "Two-Factor Authentication (2FA)";
  title.className = "font-semibold text-lg mb-2";
  section.appendChild(title);

  const enableBtn = document.createElement("button");
  enableBtn.textContent = "Enable 2FA";
  enableBtn.className = "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded";

  const qrContainer = document.createElement("div");
  qrContainer.className = "mt-4";
  qrContainer.style.display = "none";

  const qrImage = document.createElement("img");
  qrImage.alt = "Scan this QR code with your authenticator app";
  qrImage.className = "mx-auto mb-4";

  const codeInput = document.createElement("input");
  codeInput.type = "text";
  codeInput.placeholder = "Enter code from app";
  codeInput.className = "w-full mb-2 p-2 border rounded";

  const verifyBtn = document.createElement("button");
  verifyBtn.textContent = "Verify Code";
  verifyBtn.className = "bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded";

  const feedback = document.createElement("p");
  feedback.className = "mt-2 text-sm";

  qrContainer.appendChild(qrImage);
  qrContainer.appendChild(codeInput);
  qrContainer.appendChild(verifyBtn);
  qrContainer.appendChild(feedback);

  section.appendChild(enableBtn);
  section.appendChild(qrContainer);

  container.appendChild(section);

  enableBtn.addEventListener("click", async () => {
    try {
      const res = await fetch(`/api/2fa/generate`, {
        method: "GET",
        headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
      });
      if (!res.ok) throw new Error("Failed to start 2FA setup");
      const data = await res.json();
      qrImage.src = data.qrCodeImageUrl; 
      qrContainer.style.display = "block";
      enableBtn.disabled = true;
    } catch (err: any) {
      alert(err.message || "Error enabling 2FA");
    }
  });

  verifyBtn.addEventListener("click", async () => {
    const code = codeInput.value.trim();
    if (!code) {
      feedback.textContent = "Please enter the code";
      feedback.className = "text-red-500 mt-2";
      return;
    }
    try {
      const res = await fetch(`/api/2fa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ userId: loggedUser.id, code }),
      });
      const data = await res.json();
      if (res.ok) {
        feedback.textContent = "2FA enabled successfully!";
        feedback.className = "text-green-500 mt-2";
        enableBtn.style.display = "none";
        qrContainer.style.display = "none";
      } else {
        feedback.textContent = data.error || "Verification failed";
        feedback.className = "text-red-500 mt-2";
      }
    } catch (err: any) {
      feedback.textContent = err.message || "Verification error";
      feedback.className = "text-red-500 mt-2";
    }
  });
}

import { loadMainPage } from "./main";

export function render2FAPage(loggedUser: any, token : string, topRow: HTMLDivElement) {
  	const section = document.createElement("div");
  	section.className = "mx-2 mt-6 p-4 border rounded bg-gray-100";

  	const title = document.createElement("h4");
  	title.textContent = "Two-Factor Authentication (2FA)";
  	title.className = "font-semibold text-lg mb-2";
  	section.appendChild(title);

  	const enableButton = document.createElement("button");
  	enableButton.textContent = "Generate 2FA";
  	enableButton.className = "mx-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded";

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

  	const verifyButton = document.createElement("button");
  	verifyButton.textContent = "Verify Code";
  	verifyButton.className = "bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded";

  	const feedback = document.createElement("p");
  	feedback.className = "mt-2 text-sm";

  	const removeButton = document.createElement("button");
  	removeButton.textContent = "Remove 2FA";
  	removeButton.className = "mx-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded";

  	qrContainer.appendChild(qrImage);
  	qrContainer.appendChild(codeInput);
  	qrContainer.appendChild(verifyButton);
	  
  	section.appendChild(enableButton);
  	section.appendChild(removeButton);
  	section.appendChild(qrContainer);
  	section.appendChild(feedback);

  	topRow.appendChild(section);

  	enableButton.addEventListener("click", async () => {
  	  	try {
			feedback.textContent = "";
  	  		const res = await fetch(`/api/2fa/generate`, {
  	  	    	method: "GET",
  	  	    	headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
  	  	  	});
  	  	  	if (!res.ok) {
				const errData = await res.json();
        		throw new Error(errData.error || "Failed to start 2FA setup");
			}
  	  	  	const data = await res.json();
			console.log(data.message);
  	  	  	qrImage.src = data.qrCodeImageUrl; 
  	  	  	qrContainer.style.display = "block";
  	  	  	enableButton.disabled = true;
			removeButton.disabled = false;
  	  	} 
		catch (err: any) {
  	  		alert(err.message || "Error enabling 2FA");
  	  	}
  	});

  	removeButton.addEventListener("click", async () => {
		try {
			feedback.textContent = "";
  	    	const res = await fetch(`/api/2fa/disable`, {
  	    		method: "POST",
  	    		headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
				body: JSON.stringify({ userId : loggedUser.id }),
  	    	});
  	    	if (!res.ok) {
				const errData = await res.json();
        		throw new Error(errData.error || "Failed to disable 2FA");
			}
  	    	const data = await res.json();
  	    	console.log(data.message);
			feedback.textContent = "2FA removed successfully!";
  	  	    feedback.className = "text-green-500 mt-2";
			removeButton.style.display = "none";
			enableButton.style.display = "block";
			alert("2FA removed successfully!");
			loadMainPage();
  	  	} 
		catch (err: any) {
			feedback.textContent = err.message || "Error disabling 2FA";
  	  	    feedback.className = "text-red-500 mt-2";
  	 	}
  	});

  	verifyButton.addEventListener("click", async () => {
		feedback.textContent = "";
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
  	  	    	enableButton.style.display = "none";
				removeButton.style.display = "block";
  	  	    	qrContainer.style.display = "none";
				console.log(data.message);
				alert("2FA enabled successfully!");
				loadMainPage();
  	  	  	} 
			else {
  	  	    	feedback.textContent = data.error || "Verification failed";
  	  	    	feedback.className = "text-red-500 mt-2";
				console.log(data.error);
  	  	  	}
  	  	} 
		catch (err: any) {
  	  		feedback.textContent = err.message || "Verification error";
  	  		feedback.className = "text-red-500 mt-2";
  	  	}
  	});
}

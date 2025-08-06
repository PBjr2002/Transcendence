import { loadMainPage } from "./main";

export function render2FAPage(loggedUser: any, token : string, topRow: HTMLDivElement) {
  	const section = document.createElement("div");
  	section.className = "mx-2 mt-6 p-4 border rounded bg-gray-100";

  	const title = document.createElement("h4");
  	title.textContent = "Two-Factor Authentication (2FA)";
  	title.className = "font-semibold text-lg mb-2 mx-auto";
  	section.appendChild(title);

  	const enableButton = document.createElement("button");
  	enableButton.textContent = "Generate 2FA";
  	enableButton.className = "mx-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded";

  	const qrContainer = document.createElement("div");
  	qrContainer.className = "hidden";

  	const qrImage = document.createElement("img");
  	qrImage.alt = "Scan this QR code with your authenticator app";
  	qrImage.className = "mx-auto mb-4";

  	const codeInput = document.createElement("input");
  	codeInput.type = "text";
  	codeInput.placeholder = "Enter code";
  	codeInput.className = "w-full mb-2 p-2 border rounded";

  	const verifyButton = document.createElement("button");
  	verifyButton.textContent = "Verify Code";
  	verifyButton.className = "bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded";

  	const feedback = document.createElement("p");
  	feedback.className = "mt-2 text-sm";

  	const removeButton = document.createElement("button");
  	removeButton.textContent = "Remove 2FA";
  	removeButton.className = "mx-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded";

	const optionsContainer = document.createElement("div");
	optionsContainer.className = "hidden";

	const optionTitle = document.createElement("h4");
	optionTitle.textContent = "Choose how to set the 2FA";
  	optionTitle.className = "font-semibold text-lg mb-2 mx-auto";

	const SMSOption = document.createElement("button");
	SMSOption.textContent = "SMS";
	SMSOption.className = "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 mx-2 rounded";

	const qrOption = document.createElement("button");
	qrOption.textContent = "QR Code";
	qrOption.className = "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 mx-2 mt-2 rounded";

	const emailButttonOption = document.createElement("button");
	emailButttonOption.textContent = "Email";
	emailButttonOption.className = "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 mx-2 mt-2 rounded";

	const SMSContainer = document.createElement("div");
	SMSContainer.className = "hidden";

	const contactNumber = document.createElement("input");
  	contactNumber.type = "text";
  	contactNumber.placeholder = "Enter PhoneNumber with the right prefix";
  	contactNumber.className = "w-full mb-2 p-2 border rounded";

	const getSMSButton = document.createElement("button");
  	getSMSButton.textContent = "Send SMS";
  	getSMSButton.className = "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded";

	SMSContainer.appendChild(contactNumber);
	SMSContainer.appendChild(getSMSButton);
	
	const emailContainer = document.createElement("div");
	emailContainer.className = "hidden";

	const emailToSend = document.createElement("input");
	emailToSend.type = "text";
  	emailToSend.placeholder = "Enter Email";
  	emailToSend.className = "w-full mb-2 p-2 border rounded";

	const getEmailButton = document.createElement("button");
	getEmailButton.textContent = "Send Email";
  	getEmailButton.className = "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded";

	emailContainer.appendChild(emailToSend);
	emailContainer.appendChild(getEmailButton);

	const SMSorEmailCodeInput = document.createElement("input");
  	SMSorEmailCodeInput.type = "text";
  	SMSorEmailCodeInput.placeholder = "Enter code";
  	SMSorEmailCodeInput.className = "w-full mb-2 p-2 border rounded";

  	const SMSorEmailVerifyButton = document.createElement("button");
  	SMSorEmailVerifyButton.textContent = "Verify Code";
  	SMSorEmailVerifyButton.className = "bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded";
	  
	optionsContainer.appendChild(optionTitle);
	optionsContainer.appendChild(SMSOption);
	optionsContainer.appendChild(qrOption);
	optionsContainer.appendChild(emailButttonOption);
	optionsContainer.appendChild(SMSContainer);
	optionsContainer.appendChild(emailContainer);
	optionsContainer.appendChild(SMSorEmailCodeInput);
	optionsContainer.appendChild(SMSorEmailVerifyButton);
	
	qrContainer.appendChild(qrImage);
	qrContainer.appendChild(codeInput);
	qrContainer.appendChild(verifyButton);
	
	section.appendChild(enableButton);
	section.appendChild(optionsContainer);
  	section.appendChild(removeButton);
  	section.appendChild(qrContainer);
  	section.appendChild(feedback);

  	topRow.appendChild(section);

  	enableButton.addEventListener("click", async () => {
		feedback.textContent = "";
		enableButton.className = "hidden"
		removeButton.className = "hidden";
		SMSorEmailCodeInput.className = "hidden";
		SMSorEmailVerifyButton.className = "hidden";
		optionsContainer.className = "mt-4 mx-auto";
		SMSContainer.className = "hidden";
		emailContainer.className = "hidden";
  	});

	SMSOption.addEventListener("click", async () => {
		feedback.textContent = "";
		qrOption.className = "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 mx-2 mt-2 rounded";
		SMSOption.className = "hidden";
		emailButttonOption.className = "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 mx-2 mt-2 rounded";
		SMSContainer.className = "mt-4 mx-auto";
		qrContainer.className = "hidden";
		emailContainer.className = "hidden";
		SMSorEmailCodeInput.className = "hidden";
		SMSorEmailVerifyButton.className = "hidden";
	});

	getSMSButton.addEventListener("click", async () => {
		try {
			feedback.textContent = "";
			const contact = contactNumber.value.trim();
  	  		const res = await fetch(`/api/2fa/generateSMS`, {
  	  	    	method: "POST",
  	  	    	headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
				body: JSON.stringify({ contact }),
  	  	  	});
  	  	  	if (!res.ok) {
				const errData = await res.json();
        		throw new Error(errData.error || "Failed to start 2FA setup");
			}
  	  	  	const data = await res.json();
			console.log(data.message);
			qrOption.className = "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 mx-2 mt-2 rounded";
			SMSOption.className = "hidden";
			emailButttonOption.className = "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 mx-2 mt-2 rounded";
			SMSContainer.className = "hidden";
			SMSorEmailCodeInput.className = "w-full mb-2 p-2 border rounded";
			SMSorEmailVerifyButton.className = "bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded";
		}
		catch (err: any) {
			feedback.textContent = err.message || "Error sending the SMS";
  	  		feedback.className = "text-red-500 mt-2";
		}
	});

	SMSorEmailVerifyButton.addEventListener("click", async () => {
		feedback.textContent = "";
  	  	const code = codeInput.value.trim();
  	  	if (!code) {
  	  		feedback.textContent = "Please enter the code";
  	  		feedback.className = "text-red-500 mt-2";
  	  		return;
  	  	}
  	  	try {
  	  	  	const res = await fetch(`/api/2fa/verifySMSorEmail`, {
  	  	    	method: "POST",
  	  	    	headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
  	  	    	body: JSON.stringify({ userId: loggedUser.id, code }),
  	  	  	});
  	  	  	const data = await res.json();
  	  	  	if (res.ok) {
  	  	    	feedback.textContent = "2FA enabled successfully!";
  	  	    	feedback.className = "text-green-500 mt-2";
  	  	    	enableButton.className = "mx-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded";
				removeButton.className = "mx-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded";
  	  	    	qrContainer.className = "hidden";
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

	qrOption.addEventListener("click", async () => {
		try {
			feedback.textContent = "";
  	  		const res = await fetch(`/api/2fa/generateQR`, {
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
  	  	  	qrContainer.className = "mt-4 mx-auto";
			qrOption.className = "hidden";
			SMSOption.className = "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 mx-2 mt-2 rounded";
			emailButttonOption.className = "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 mx-2 mt-2 rounded";
			SMSContainer.className = "hidden";
			emailContainer.className = "hidden";
			codeInput.className = "w-full mb-2 p-2 border rounded";
			verifyButton.className = "bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded";
  	  	}
		catch (err: any) {
  	  		alert(err.message || "Error generating QR for 2FA");
  	  	}
	});

	emailButttonOption.addEventListener("click", async () => {
		feedback.textContent = "";
		qrOption.className = "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 mx-2 mt-2 rounded";
		SMSOption.className = "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 mx-2 mt-2 rounded";
		emailButttonOption.className = "hidden";
		emailContainer.className = "mt-4 mx-auto";
		SMSContainer.className = "hidden";
		qrContainer.className = "hidden";
		SMSorEmailCodeInput.className = "hidden";
		SMSorEmailVerifyButton.className = "hidden";
	});

	getEmailButton.addEventListener("click", async () => {
		try {
			feedback.textContent = "";
			const email = emailToSend.value.trim();
  	  		const res = await fetch(`/api/2fa/generateEmail`, {
  	  	    	method: "POST",
  	  	    	headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
				body: JSON.stringify({ email }),
  	  	  	});
  	  	  	if (!res.ok) {
				const errData = await res.json();
        		throw new Error(errData.error || "Failed to start 2FA setup");
			}
  	  	  	const data = await res.json();
			console.log(data.message);
			qrOption.className = "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 mx-2 mt-2 rounded";
			SMSOption.className = "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 mx-2 mt-2 rounded";
			emailButttonOption.className = "hidden";
			emailContainer.className = "hidden";
			SMSorEmailCodeInput.className = "w-full mb-2 p-2 border rounded";
			SMSorEmailVerifyButton.className = "bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded";
		}
		catch (err: any) {
			feedback.textContent = err.message || "Error sending the Email";
  	  		feedback.className = "text-red-500 mt-2";
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
			enableButton.className = "mx-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded";
			removeButton.className = "hidden";
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
  	  	  	const res = await fetch(`/api/2fa/verifyQRCode`, {
  	  	    	method: "POST",
  	  	    	headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
  	  	    	body: JSON.stringify({ userId: loggedUser.id, code }),
  	  	  	});
  	  	  	const data = await res.json();
  	  	  	if (res.ok) {
  	  	    	feedback.textContent = "2FA enabled successfully!";
  	  	    	feedback.className = "text-green-500 mt-2";
  	  	    	enableButton.className = "mx-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded";
				removeButton.className = "mx-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded";
  	  	    	qrContainer.className = "hidden";
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

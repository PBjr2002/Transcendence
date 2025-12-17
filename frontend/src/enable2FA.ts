import { loadMainPage } from "./main";
import { t } from './i18n';

function update2FATranslations() {
	const title = document.querySelector('h4');
	if (title) 
		title.textContent = t('twoFA.setup');

	const generateButton = document.querySelector('button.bg-blue-500') as HTMLButtonElement;
	if (generateButton && generateButton.textContent?.includes('Generate')) 
		generateButton.textContent = t('twoFA.generate');

	const removeButton = document.querySelector('button.bg-red-500') as HTMLButtonElement;
	if (removeButton && removeButton.textContent?.includes('Remove')) 
		removeButton.textContent = t('twoFA.remove');

	const choiceTitle = document.querySelectorAll('h4')[1];
	if (choiceTitle && choiceTitle.textContent?.includes('Choose')) 
		choiceTitle.textContent = t('twoFA.chooseMethod');

	const buttons = document.querySelectorAll('button');
	buttons.forEach(btn => {
		if (btn.textContent === 'SMS')
			btn.textContent = t('twoFA.sms');
		if (btn.textContent === 'QR Code')
			btn.textContent = t('twoFA.qrCode');
		if (btn.textContent === 'Email')
			btn.textContent = t('twoFA.email');
		if (btn.textContent?.includes('Send SMS'))
			btn.textContent = t('twoFA.sendSMS');
		if (btn.textContent?.includes('Send Email'))
			btn.textContent = t('twoFA.sendEmail');
		if (btn.textContent?.includes('Verify Code'))
			btn.textContent = t('twoFA.verifyCode');
		if (btn.textContent?.includes('Verify and Enable'))
			btn.textContent = t('twoFA.verify');
		if (btn.textContent?.includes('Back to Profile'))
			btn.textContent = t('twoFA.backToProfile');
	});

	const inputs = document.querySelectorAll('input');
	inputs.forEach(input => {
		const placeholder = input.placeholder;
		if (placeholder.includes('Enter code'))
			input.placeholder = t('twoFA.enterCodePlaceholder');
		if (placeholder.includes('6-digit'))
			input.placeholder = t('twoFA.enterCode');
		if (placeholder.includes('email') || placeholder.includes('Email'))
			input.placeholder = t('forms.email');
	});

	const qrImage = document.querySelector('img');
	if (qrImage) 
		qrImage.alt = t('twoFA.scanQR');
}

export function render2FAPage(loggedUser: any, topRow: HTMLDivElement) {
  	const section = document.createElement("div");
  	section.className = "mx-2 mt-6 p-4 border rounded bg-gray-100";

  	window.removeEventListener('languageChanged', update2FATranslations);
  	window.addEventListener('languageChanged', update2FATranslations);

  	const title = document.createElement("h4");
  	title.textContent = t('twoFA.setup');
  	title.className = "font-semibold text-lg mb-2 mx-auto";
  	section.appendChild(title);

  	const enableButton = document.createElement("button");
  	enableButton.textContent = t('twoFA.generate');
  	enableButton.className = "mx-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded";

  	const qrContainer = document.createElement("div");
  	qrContainer.className = "hidden";

  	const qrImage = document.createElement("img");
  	qrImage.alt = t('twoFA.scanQR');
  	qrImage.className = "mx-auto mb-4";

  	const codeInput = document.createElement("input");
  	codeInput.type = "text";
  	codeInput.placeholder = t('twoFA.enterCode');
  	codeInput.className = "w-full mb-2 p-2 border rounded";

  	const verifyButton = document.createElement("button");
  	verifyButton.textContent = t('twoFA.verify');
  	verifyButton.className = "bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded";

  	const feedback = document.createElement("p");
  	feedback.className = "mt-2 text-sm";

  	const removeButton = document.createElement("button");
  	removeButton.textContent = t('twoFA.remove');
  	removeButton.className = "mx-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded";

	const optionsContainer = document.createElement("div");
	optionsContainer.className = "hidden";

	const optionTitle = document.createElement("h4");
	optionTitle.textContent = t('twoFA.chooseMethod');
  	optionTitle.className = "font-semibold text-lg mb-2 mx-auto";

	const qrOption = document.createElement("button");
	qrOption.textContent = t('twoFA.qrCode');
	qrOption.className = "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 mx-2 mt-2 rounded";
	  
	optionsContainer.appendChild(optionTitle);
	optionsContainer.appendChild(qrOption);
	
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
		try {
			feedback.textContent = "";
			const res = await fetch(`/api/2fa/checkFor2FA`, {
  	  	    	method: "GET",
				credentials: 'include',
  	  	    	headers: { "Content-Type": "application/json" },
  	  	  	});
  	  	  	if (!res.ok) {
				const errData = await res.json();
        		throw new Error(errData.error || "Failed to check the 2FA");
			}
  	  	  	feedback.textContent = "";
			enableButton.className = "hidden"
			removeButton.className = "hidden";
			optionsContainer.className = "mt-4 mx-auto";
		}
		catch (err : any) {
			feedback.textContent = err.message || t('twoFA.setupError');
  	  		feedback.className = "text-red-500 mt-2";
		}
  	});

	qrOption.addEventListener("click", async () => {
		try {
			feedback.textContent = "";
  	  		const res = await fetch(`/api/2fa/generateQR`, {
  	  	    	method: "GET",
				credentials: 'include',
  	  	    	headers: { "Content-Type": "application/json" },
  	  	  	});
  	  	  	if (!res.ok) {
				const errData = await res.json();
        		throw new Error(errData.error || "Failed to start 2FA setup");
			}
  	  	  	const data = await res.json();
			console.log("DATA:", data);
  	  	  	qrImage.src = data.data.qrCodeImageUrl; 
  	  	  	qrContainer.className = "mt-4 mx-auto";
			qrOption.className = "hidden";
			codeInput.className = "w-full mb-2 p-2 border rounded";
			verifyButton.className = "bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded";
  	  	}
		catch (err: any) {
			feedback.textContent = err.message || "Error generating QR for 2FA";
  	  		feedback.className = "text-red-500 mt-2";
  	  	}
	});

  	removeButton.addEventListener("click", async () => {
		try {
			feedback.textContent = "";
  	    	const res = await fetch(`/api/2fa/disable`, {
  	    		method: "POST",
				credentials: 'include',
  	    		headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId : loggedUser.data.safeUser.id }),
  	    	});
  	    	if (!res.ok) {
				const errData = await res.json();
        		throw new Error(errData.error || "Failed to disable 2FA");
			}
  	    	const data = await res.json();
  	    	console.log(data.data);
			feedback.textContent = t('twoFA.removeSuccess');
  	  	    feedback.className = "text-green-500 mt-2";
			enableButton.className = "mx-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded";
			removeButton.className = "hidden";
			alert(t('twoFA.removeSuccess'));
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
				credentials: 'include',
  	  	    	headers: { "Content-Type": "application/json" },
  	  	    	body: JSON.stringify({ userId: loggedUser.data.safeUser.id, code }),
  	  	  	});
  	  	  	const data = await res.json();
  	  	  	if (res.ok) {
  	  	    	feedback.textContent = "2FA enabled successfully!";
  	  	    	feedback.className = "text-green-500 mt-2";
  	  	    	enableButton.className = "mx-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded";
				removeButton.className = "mx-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded";
  	  	    	qrContainer.className = "hidden";
				console.log(data.data);
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

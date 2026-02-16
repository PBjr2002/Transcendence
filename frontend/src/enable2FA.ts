import { loadMainPage } from './app';
import { t } from './i18n';

function update2FATranslations() {
	const title = document.querySelector('[data-role="2fa-title"]');
	if (title)
		title.textContent = t('twoFA.setup');

	const generateButton = document.querySelector('[data-role="2fa-generate"]') as HTMLButtonElement | null;
	if (generateButton)
		generateButton.textContent = t('twoFA.generate');

	const removeButton = document.querySelector('[data-role="2fa-remove"]') as HTMLButtonElement | null;
	if (removeButton)
		removeButton.textContent = t('twoFA.remove');

	const choiceTitle = document.querySelector('[data-role="2fa-method-title"]');
	if (choiceTitle)
		choiceTitle.textContent = t('twoFA.chooseMethod');

	const qrOption = document.querySelector('[data-role="2fa-qr-option"]') as HTMLButtonElement | null;
	if (qrOption)
		qrOption.textContent = t('twoFA.qrCode');

	const verifyButton = document.querySelector('[data-role="2fa-verify"]') as HTMLButtonElement | null;
	if (verifyButton)
		verifyButton.textContent = t('twoFA.verify');

	const codeInput = document.querySelector('[data-role="2fa-code"]') as HTMLInputElement | null;
	if (codeInput)
		codeInput.placeholder = t('twoFA.enterCode');

	const qrImage = document.querySelector('[data-role="2fa-qr-image"]') as HTMLImageElement | null;
	if (qrImage)
		qrImage.alt = t('twoFA.scanQR');

	const backToProfile = document.querySelector('[data-role="2fa-back"]') as HTMLButtonElement | null;
	if (backToProfile)
		backToProfile.textContent = t('twoFA.backToProfile');
}

export function render2FAPage(loggedUser: any, topRow: HTMLDivElement) {
	const section = document.createElement('div');
	section.className = 'glass-panel';
	section.style.maxWidth = '500px';
	section.style.margin = '0 auto';

	window.removeEventListener('languageChanged', update2FATranslations);
	window.addEventListener('languageChanged', update2FATranslations);

	const title = document.createElement('h2');
	title.textContent = t('twoFA.setup');
	title.dataset.role = '2fa-title';
	section.appendChild(title);

	const enableButton = document.createElement('button');
	enableButton.textContent = t('twoFA.generate');
	enableButton.className = 'submit';
	enableButton.style.marginBottom = '12px';
	enableButton.dataset.role = '2fa-generate';

	const qrContainer = document.createElement('div');
	qrContainer.className = 'hidden';
	qrContainer.style.display = 'none';

	const qrImage = document.createElement('img');
	qrImage.alt = t('twoFA.scanQR');
	qrImage.dataset.role = '2fa-qr-image';
	qrImage.style.width = '100%';
	qrImage.style.maxWidth = '280px';
	qrImage.style.margin = '0 auto 20px';
	qrImage.style.display = 'block';
	qrImage.style.borderRadius = '12px';

	const codeInput = document.createElement('input');
	codeInput.type = 'text';
	codeInput.placeholder = t('twoFA.enterCode');
	codeInput.className = 'modal-input';
	codeInput.style.marginBottom = '12px';
	codeInput.dataset.role = '2fa-code';

	const verifyButton = document.createElement('button');
	verifyButton.textContent = t('twoFA.verify');
	verifyButton.className = 'submit';
	verifyButton.dataset.role = '2fa-verify';

	const feedback = document.createElement('p');
	feedback.className = 'modal-feedback';
	feedback.style.minHeight = '20px';
	feedback.style.marginTop = '12px';

	const removeButton = document.createElement('button');
	removeButton.textContent = t('twoFA.remove');
	removeButton.className = 'submit';
	removeButton.style.background = 'rgba(239, 68, 68, 0.15)';
	removeButton.style.borderColor = 'rgba(239, 68, 68, 0.6)';
	removeButton.style.marginBottom = '12px';
	removeButton.style.display = 'none';
	removeButton.dataset.role = '2fa-remove';

	const optionsContainer = document.createElement('div');
	optionsContainer.className = 'hidden';
	optionsContainer.style.display = 'none';

	const optionTitle = document.createElement('h3');
	optionTitle.textContent = t('twoFA.chooseMethod');
	optionTitle.style.fontSize = '16px';
	optionTitle.style.marginBottom = '16px';
	optionTitle.style.textAlign = 'center';
	optionTitle.dataset.role = '2fa-method-title';

	const qrOption = document.createElement("button");
	qrOption.textContent = t('twoFA.qrCode');
	qrOption.className = "submit";
	qrOption.dataset.role = '2fa-qr-option';
	  
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

	const syncInitial2FAState = async () => {
		try {
			const res = await fetch(`/api/2fa/checkFor2FA`, {
				method: 'GET',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
			});
			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				const message = String(errData.error || errData.message || '').toLowerCase();
				if (message.includes('enabled') || message.includes('already') || message.includes('exists')) {
					enableButton.style.display = 'none';
					removeButton.style.display = 'block';
					optionsContainer.style.display = 'none';
					qrContainer.style.display = 'none';
					return;
				}
				return;
			}
			const data = await res.json().catch(() => ({}));
			const enabled = Boolean(
				data?.data?.enabled ??
				data?.enabled ??
				data?.data?.isEnabled ??
				data?.isEnabled ??
				data?.data?.twoFAEnabled ??
				data?.twoFAEnabled ??
				data?.data?.has2FA ??
				data?.has2FA
			);
			if (enabled) {
				enableButton.style.display = 'none';
				removeButton.style.display = 'block';
				optionsContainer.style.display = 'none';
				qrContainer.style.display = 'none';
			} else {
				enableButton.style.display = 'block';
				removeButton.style.display = 'none';
			}
		}
		catch {
			// Ignore status check errors to avoid blocking UI
		}
	};

	void syncInitial2FAState();

	topRow.appendChild(section);

	enableButton.addEventListener('click', async () => {
		try {
			feedback.textContent = '';
			feedback.dataset.status = '';
			const res = await fetch(`/api/2fa/checkFor2FA`, {
	   	    	method: 'GET',
				credentials: 'include',
	   	    	headers: { 'Content-Type': 'application/json' },
	   	  	});
	   	  	if (!res.ok) {
				const errData = await res.json();
        		throw new Error(errData.error || 'Failed to check the 2FA');
			}
  	  	  	feedback.textContent = "";
			enableButton.style.display = "none";
			removeButton.style.display = "none";
			optionsContainer.style.display = "block";
		}
		catch (err: any) {
			feedback.textContent = err.message || t('twoFA.setupError');
			feedback.dataset.status = 'error';
		}
  	});

	qrOption.addEventListener('click', async () => {
		try {
			feedback.textContent = '';
			feedback.dataset.status = '';
	  		const res = await fetch(`/api/2fa/generateQR`, {
	   	    	method: 'GET',
				credentials: 'include',
	   	    	headers: { 'Content-Type': 'application/json' },
	   	  	});
	   	  	if (!res.ok) {
				const errData = await res.json();
        		throw new Error(errData.error || 'Failed to start 2FA setup');
			}
  	  	  	const data = await res.json();
			console.log("DATA:", data);
  	  	  	qrImage.src = data.data.qrCodeImageUrl; 
  	  	  	qrContainer.style.display = "block";
			qrOption.style.display = "none";
  	  	}
		catch (err: any) {
			feedback.textContent = err.message || "Error generating QR for 2FA";
			feedback.dataset.status = 'error';
  	  	}
	});

	removeButton.addEventListener('click', async () => {
		try {
			feedback.textContent = '';
			feedback.dataset.status = '';
	    	const res = await fetch(`/api/2fa/disable`, {
	    		method: 'POST',
				credentials: 'include',
	    		headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: loggedUser.data.safeUser.id }),
	    	});
	    	if (!res.ok) {
				const errData = await res.json();
        		throw new Error(errData.error || 'Failed to disable 2FA');
			}
	    	const data = await res.json();
	    	console.log(data.data);
			feedback.textContent = t('twoFA.removeSuccess');
			feedback.dataset.status = 'success';
			enableButton.style.display = "block";
			removeButton.style.display = "none";
			loadMainPage();
	  	} 
		catch (err: any) {
			feedback.textContent = err.message || 'Error disabling 2FA';
			feedback.dataset.status = 'error';
	 	}
	});

	verifyButton.addEventListener('click', async () => {
		feedback.textContent = '';
		feedback.dataset.status = '';
		const code = codeInput.value.trim();
		if (!code) {
			feedback.textContent = 'Please enter the code';
			feedback.dataset.status = 'error';
			return;
		}
		try {
	  		const res = await fetch(`/api/2fa/verifyQRCode`, {
	   	    	method: 'POST',
				credentials: 'include',
	   	    	headers: { 'Content-Type': 'application/json' },
	   	    	body: JSON.stringify({ userId: loggedUser.data.safeUser.id, code }),
	   	  	});
	   	  	const data = await res.json();
	   	  	if (res.ok) {
	   	    	feedback.textContent = '2FA enabled successfully!';
	   	    	feedback.dataset.status = 'success';
	   	    	enableButton.style.display = "none";
				removeButton.style.display = "block";
	   	    	qrContainer.style.display = "none";
				optionsContainer.style.display = "none";
				console.log(data.data);
				loadMainPage();
	   	  	} 
			else {
	   	    	feedback.textContent = data.error || 'Invalid code';
	   	    	feedback.dataset.status = 'error';
	   	  	}
	   	}
		catch (err: any) {
			feedback.textContent = err.message || 'Error verifying code';
			feedback.dataset.status = 'error';
	  	}
	});

	const backToProfile = document.createElement('button');
	backToProfile.textContent = t('twoFA.backToProfile');
	backToProfile.className = 'profile-nav-button';
	backToProfile.style.width = '100%';
	backToProfile.style.marginTop = '16px';
	backToProfile.dataset.role = '2fa-back';
	section.appendChild(backToProfile);

	backToProfile.addEventListener('click', () => {
		topRow.removeChild(section);
		loadMainPage();
	});
}
export async function render2FAPageInline(loggedUser: any): Promise<HTMLDivElement> {
	const section = document.createElement('div');
	section.className = 'glass-panel';

	window.removeEventListener('languageChanged', update2FATranslations);
	window.addEventListener('languageChanged', update2FATranslations);

	const title = document.createElement('h2');
	title.textContent = t('twoFA.setup');
		title.style.marginBottom = '16px';
		title.dataset.role = '2fa-title';
		section.appendChild(title);

		const enableButton = document.createElement('button');
		enableButton.textContent = t('twoFA.generate');
		enableButton.className = 'submit';
		enableButton.style.marginBottom = '8px';
		enableButton.dataset.role = '2fa-generate';

		const qrContainer = document.createElement('div');
		qrContainer.style.display = 'none';

		const qrImage = document.createElement('img');
		qrImage.alt = t('twoFA.scanQR');
		qrImage.style.width = '100%';
		qrImage.style.maxWidth = '180px';
		qrImage.style.margin = '0 auto 12px';
		qrImage.style.display = 'block';
		qrImage.style.borderRadius = '12px';
		qrImage.dataset.role = '2fa-qr-image';

		const codeInput = document.createElement('input');
		codeInput.type = 'text';
		codeInput.placeholder = t('twoFA.enterCode');
		codeInput.className = 'modal-input';
		codeInput.style.marginBottom = '8px';
		codeInput.dataset.role = '2fa-code';

		const verifyButton = document.createElement('button');
		verifyButton.textContent = t('twoFA.verify');
		verifyButton.className = 'submit';
		verifyButton.dataset.role = '2fa-verify';

		const feedback = document.createElement('p');
		feedback.className = 'modal-feedback';
		feedback.style.minHeight = '18px';
		feedback.style.marginTop = '8px';
		feedback.style.fontSize = '13px';

		const removeButton = document.createElement('button');
		removeButton.textContent = t('twoFA.remove');
		removeButton.className = 'submit';
		removeButton.style.background = 'rgba(239, 68, 68, 0.15)';
		removeButton.style.borderColor = 'rgba(239, 68, 68, 0.6)';
		removeButton.style.marginBottom = '8px';
		removeButton.style.display = 'none';
		removeButton.dataset.role = '2fa-remove';

		const optionsContainer = document.createElement('div');
		optionsContainer.style.display = 'none';

		const optionTitle = document.createElement('h3');
		optionTitle.textContent = t('twoFA.chooseMethod');
		optionTitle.style.fontSize = '14px';
		optionTitle.style.marginBottom = '12px';
		optionTitle.style.textAlign = 'center';
		optionTitle.dataset.role = '2fa-method-title';

		const qrOption = document.createElement('button');
		qrOption.textContent = t('twoFA.qrCode');
		qrOption.className = 'submit';
		qrOption.dataset.role = '2fa-qr-option';

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

		const syncInitial2FAState = async () => {
			try {
				const res = await fetch(`/api/2fa/checkFor2FA`, {
					method: 'GET',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
				});
				if (!res.ok) {
					const errData = await res.json().catch(() => ({}));
					const message = String(errData.error || errData.message || '').toLowerCase();
					if (message.includes('enabled') || message.includes('already') || message.includes('exists')) {
						enableButton.style.display = 'none';
						removeButton.style.display = 'block';
						optionsContainer.style.display = 'none';
						qrContainer.style.display = 'none';
						return;
					}
					return;
				}
				const data = await res.json().catch(() => ({}));
				const enabled = Boolean(
					data?.data?.enabled ??
					data?.enabled ??
					data?.data?.isEnabled ??
					data?.isEnabled ??
					data?.data?.twoFAEnabled ??
					data?.twoFAEnabled ??
					data?.data?.has2FA ??
					data?.has2FA
				);
				if (enabled) {
					enableButton.style.display = 'none';
					removeButton.style.display = 'block';
					optionsContainer.style.display = 'none';
					qrContainer.style.display = 'none';
				} else {
					enableButton.style.display = 'block';
					removeButton.style.display = 'none';
				}
			}
			catch {
				// Ignore status check errors to avoid blocking UI
			}
		};

		void syncInitial2FAState();

	enableButton.addEventListener('click', async () => {
		try {
			feedback.textContent = '';
			feedback.dataset.status = '';
			const res = await fetch(`/api/2fa/checkFor2FA`, {
	   	    	method: 'GET',
				credentials: 'include',
	   	    	headers: { 'Content-Type': 'application/json' },
	   	  	});
	   	  	if (!res.ok) {
				const errData = await res.json();
        		throw new Error(errData.error || 'Failed to check the 2FA');
			}
  	  	  	feedback.textContent = "";
			enableButton.style.display = "none";
			removeButton.style.display = "none";
			optionsContainer.style.display = "block";
		}
		catch (err: any) {
			feedback.textContent = err.message || t('twoFA.setupError');
			feedback.dataset.status = 'error';
		}
  	});

	qrOption.addEventListener('click', async () => {
		try {
			feedback.textContent = '';
			feedback.dataset.status = '';
	  		const res = await fetch(`/api/2fa/generateQR`, {
	   	    	method: 'GET',
				credentials: 'include',
	   	    	headers: { 'Content-Type': 'application/json' },
	   	  	});
	   	  	if (!res.ok) {
				const errData = await res.json();
        		throw new Error(errData.error || 'Failed to start 2FA setup');
			}
  	  	  	const data = await res.json();
			console.log("DATA:", data);
  	  	  	qrImage.src = data.data.qrCodeImageUrl; 
  	  	  	qrContainer.style.display = "block";
			qrOption.style.display = "none";
  	  	}
		catch (err: any) {
			feedback.textContent = err.message || "Error generating QR for 2FA";
			feedback.dataset.status = 'error';
  	  	}
	});

	removeButton.addEventListener('click', async () => {
		try {
			feedback.textContent = '';
			feedback.dataset.status = '';
	    	const res = await fetch(`/api/2fa/disable`, {
	    		method: 'POST',
				credentials: 'include',
	    		headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: loggedUser.data.safeUser.id }),
	    	});
	    	if (!res.ok) {
				const errData = await res.json();
        		throw new Error(errData.error || 'Failed to disable 2FA');
			}
	    	const data = await res.json();
	    	console.log(data.data);
			feedback.textContent = t('twoFA.removeSuccess');
			feedback.dataset.status = 'success';
			enableButton.style.display = "block";
			removeButton.style.display = "none";
			
	  	} 
		catch (err: any) {
			feedback.textContent = err.message || 'Error disabling 2FA';
			feedback.dataset.status = 'error';
	 	}
	});

	verifyButton.addEventListener('click', async () => {
		feedback.textContent = '';
		feedback.dataset.status = '';
		const code = codeInput.value.trim();
		if (!code) {
			feedback.textContent = 'Please enter the code';
			feedback.dataset.status = 'error';
			return;
		}
		try {
	  		const res = await fetch(`/api/2fa/verifyQRCode`, {
	   	    	method: 'POST',
				credentials: 'include',
	   	    	headers: { 'Content-Type': 'application/json' },
	   	    	body: JSON.stringify({ userId: loggedUser.data.safeUser.id, code }),
	   	  	});
	   	  	const data = await res.json();
	   	  	if (res.ok) {
	   	    	feedback.textContent = '2FA enabled successfully!';
	   	    	feedback.dataset.status = 'success';
	   	    	enableButton.style.display = "none";
				removeButton.style.display = "block";
	   	    	qrContainer.style.display = "none";
				optionsContainer.style.display = "none";
				console.log(data.data);
	   	  	} 
			else {
	   	    	feedback.textContent = data.error || 'Invalid code';
	   	    	feedback.dataset.status = 'error';
	   	  	}
	   	}
		catch (err: any) {
			feedback.textContent = err.message || 'Error verifying code';
			feedback.dataset.status = 'error';
	  	}
	});

	return section;
}
import './style.css'
import { loadMainPage } from './main';
import { t } from './i18n';

function updateLoginTranslations() {
	const h1 = document.querySelector('h1');
	if (h1) 
		h1.textContent = t('auth.welcomeBack');
	
	const emailInput = document.querySelector('input[type="text"]') as HTMLInputElement;
	if (emailInput) 
		emailInput.placeholder = t('forms.email');
	
	const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
	if (passwordInput) 
		passwordInput.placeholder = t('forms.password');
	
	const loginButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
	if (loginButton) 
		loginButton.textContent = t('buttons.login');
}

export interface User {
	id: number;
	name: string;
	info: string;
	email: string;
	online: boolean;
}

export function renderLoginPage() {
    const app = document.querySelector<HTMLDivElement>('#app');
    if (!app)
		return;
    app.innerHTML = "";
    window.removeEventListener('languageChanged', updateLoginTranslations);
    window.addEventListener('languageChanged', updateLoginTranslations);
    
    const container = document.createElement("div");
    container.className = "max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg";
    app.appendChild(container);

    const h1 = document.createElement("h1");
    h1.textContent = t('auth.welcomeBack');
    h1.className = "text-3xl font-bold text-gray-800 mb-6 text-center";
    container.appendChild(h1);

    const form = document.createElement("form");
    form.className = "space-y-4";
    container.appendChild(form);

    const email = document.createElement("input");
    email.type = "text";
    email.placeholder = t('forms.email');
    email.className = "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
    form.appendChild(email);

    const password = document.createElement("input");
    password.type = "password";
    password.placeholder = t('forms.password');
    password.className = "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
    form.appendChild(password);

    const submitBtn = document.createElement("button");
    submitBtn.type = "submit";
    submitBtn.textContent = t('buttons.login');
    submitBtn.className = "w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 ease-in-out transform hover:scale-105";
    form.appendChild(submitBtn);

    form.addEventListener("submit", (e) => {
    	e.preventDefault();
    	const credentialEmail = email.value.trim();
    	const credentialPassword = password.value.trim();

    	if (!credentialEmail)
			return alert(t('validation.enterEmail'));
    	if (!credentialPassword)
			return alert(t('validation.enterPassword'));

    	const credentials = {
    		emailOrUser: credentialEmail,
    		password: credentialPassword,
    	};

    	fetch(`/api/login`, {
    		method: "POST",
    		headers: { "Content-Type": "application/json" },
    		body: JSON.stringify(credentials),
    	})
        .then(async (res) => {
        	if (!res.ok) {
        		const errData = await res.json();
        		throw new Error(errData.error || "Login failed");
        	}
        	return res.json();
        })
        .then((response) => {
			const	data = response.message || response;
			const	user = data.existingUser;
			if (data.message === "2FA required")
				twoFALogin(form, h1, user);
			else {
				localStorage.setItem("user", JSON.stringify(user));
        		email.value = "";
        		password.value = "";
        		loadMainPage();
			}
        })
        .catch((err) => {
        	alert(`${t('auth.loginError')}: ${err.message}`);
        	console.error("Login error:", err);
        });
    });
}

export function twoFALogin(form : HTMLFormElement, h1 : HTMLHeadElement, user : any) {
	h1.textContent = t('twoFA.enterCode')
	form.innerHTML = "";
	
	const update2FATranslations = () => {
		h1.textContent = t('twoFA.enterCode');
		const twoFAInput = form.querySelector('input[type="text"]') as HTMLInputElement;
		if (twoFAInput)
			twoFAInput.placeholder = t('twoFA.enterCode');
		const submitButton = form.querySelector('button') as HTMLButtonElement;
		if (submitButton)
			submitButton.textContent = t('buttons.submit');
	};
	window.addEventListener('languageChanged', update2FATranslations);
	
	const twoFAcode = document.createElement("input");
	twoFAcode.type = "text";
	twoFAcode.placeholder = t('twoFA.enterCode');
    twoFAcode.className = "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
    form.appendChild(twoFAcode);
	const submit2FA = document.createElement("button");
    submit2FA.textContent = t('buttons.submit');
    submit2FA.className = "w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 ease-in-out transform hover:scale-105";
    form.appendChild(submit2FA);
	submit2FA.addEventListener("click", () => {
		const credential2FACode = twoFAcode.value.trim();
		if (!credential2FACode)
			return alert (t('twoFA.invalidCode'));
		const credentials = {
			userId: user.id,
			twoFAcode: credential2FACode,
		};
		fetch('/api/login/2fa', {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ userId: credentials.userId }),
		})
		.then(async (res) => {
        	if (!res.ok) {
        		const errData = await res.json();
        		throw new Error(errData.error || "Login failed");
        	}
        	return res.json();
        })
		.then((response) => {
			const	data = response.message || response;
			if (data.message === "QR 2FA") {
				fetch('/api/login/2fa/QR', {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(credentials),
				})
				.then(async (res) => {
        			if (!res.ok) {
        				const errData = await res.json();
        				throw new Error(errData.error || "Login failed");
        			}
        			return res.json();
        		})
				.then((response) => {
					const data = response.message || response;
					const user = data.existingUser;
					localStorage.setItem("user", JSON.stringify(user));
        			loadMainPage();
				})
				.catch((err) => {
        			alert(`${t('auth.loginError')}: ${err.message}`);
        			console.error("Login error:", err);
        		});
			}
			if (data.message === "SMS or Email 2FA") {
				fetch('/api/login/2fa/SMSOrEmail', {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(credentials),
				})
				.then(async (res) => {
        			if (!res.ok) {
        				const errData = await res.json();
        				throw new Error(errData.error || "Login failed");
        			}
        			return res.json();
        		})
				.then((response) => {
					const data = response.message || response;
					const user = data.existingUser;
					localStorage.setItem("user", JSON.stringify(user));
        			loadMainPage();
				})
				.catch((err) => {
        			alert(`${t('auth.loginError')}: ${err.message}`);
        			console.error("Login error:", err);
        		});
			}
        })
		.catch((err) => {
        	alert(`${t('auth.loginError')}: ${err.message}`);
        	console.error("Login error:", err);
        });
	});
}

export function editUserInfo(loggedUser : User) {
	const form = document.createElement("div");
	form.className = "fixed top-0 left-0 w-full h-full bg-black bg-opacity-40 flex justify-center items-center z-50";

	const formBox = document.createElement("div");
	formBox.className = "bg-white p-6 rounded-lg shadow-lg space-y-4 space-x-2 max-w-md w-full";
  
	const nameInput = document.createElement("input");
	nameInput.type = "text";
	nameInput.placeholder = t('userEdit.newName');
	nameInput.value = loggedUser.name;
	nameInput.className = "w-full border border-gray-300 px-3 py-2 rounded";

	const infoInput = document.createElement("input");
	infoInput.type = "text";
	infoInput.placeholder = t('userEdit.newInfo');
	infoInput.value = loggedUser.info;
	infoInput.className = "w-full border border-gray-300 px-3 py-2 rounded";

	const emailInput = document.createElement("input");
	emailInput.type = "email";
	emailInput.placeholder = t('userEdit.newEmail');
	emailInput.value = loggedUser.email;
	emailInput.className = "w-full border border-gray-300 px-3 py-2 rounded";

	const passwordInput = document.createElement("input");
	passwordInput.type = "password";
	passwordInput.placeholder = t('userEdit.newPassword');
	passwordInput.className = "w-full border border-gray-300 px-3 py-2 rounded";

	const saveButton = document.createElement("button");
	saveButton.textContent = t('buttons.save');
	saveButton.className = "bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded";

	const cancelButton = document.createElement("button");
	cancelButton.textContent = t('buttons.cancel');
	cancelButton.className = "bg-gray-400 hover:bg-gray-500 text-white font-bold px-4 py-2 rounded";

	formBox.append(nameInput, infoInput, emailInput, passwordInput, saveButton, cancelButton);
	form.appendChild(formBox);
	document.body.appendChild(form);

	cancelButton.onclick = () => form.remove();

	saveButton.onclick = () => {
		const updatedUser = {
			name: nameInput.value.trim(),
			info: infoInput.value.trim(),
			email: emailInput.value.trim(),
			password: passwordInput.value.trim(),
		};

		fetch(`/api/users/${loggedUser.id}`, {
    		method: "PUT",
    		headers: { "Content-Type": "application/json" },
    		body: JSON.stringify(updatedUser),
    	})
    	.then(async (res) => {
    		if (!res.ok) {
        		const errData = await res.json();
        		throw new Error(errData.error || "Failed to update");
        	}
        	return res.json();
    	})
    	.then((response) => {
			const	data = response.message || response;
    		localStorage.setItem("user", JSON.stringify(data.user));
    		form.remove();
    		loadMainPage();
    	})
    	.catch((err) => {
    		console.error(err);
    		alert(`${t('userEdit.updateError')}: ${err.message}`);
    	});
	};
}

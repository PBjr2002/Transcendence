import './style.css'
import { loadMainPage } from './main';

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
    const container = document.createElement("div");
    container.className = "max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg";
    app.appendChild(container);

    const h1 = document.createElement("h1");
    h1.textContent = "Login";
    h1.className = "text-3xl font-bold text-gray-800 mb-6 text-center";
    container.appendChild(h1);

    const form = document.createElement("form");
    form.className = "space-y-4";
    container.appendChild(form);

    const email = document.createElement("input");
    email.type = "text";
    email.placeholder = "Email or Username";
    email.className = "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
    form.appendChild(email);

    const password = document.createElement("input");
    password.type = "password";
    password.placeholder = "Password";
    password.className = "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
    form.appendChild(password);

    const submitBtn = document.createElement("button");
    submitBtn.type = "submit";
    submitBtn.textContent = "Login";
    submitBtn.className = "w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 ease-in-out transform hover:scale-105";
    form.appendChild(submitBtn);

    form.addEventListener("submit", (e) => {
    	e.preventDefault();
    	const credentialEmail = email.value.trim();
    	const credentialPassword = password.value.trim();

    	if (!credentialEmail) return alert("Please fill with a Email or a Username");
    	if (!credentialPassword) return alert("Please fill with a Password");

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
        .then((data) => {
			const	user = data.existingUser;
			if (data.message === "2FA required") {
				twoFALogin(form, h1, user);
			}
			else {
				const	token = data.token;
				localStorage.setItem("token", token);
				localStorage.setItem("user", JSON.stringify(user));
        		email.value = "";
        		password.value = "";
        		loadMainPage();
			}
        })
        .catch((err) => {
        	alert(`Login failed: ${err.message}`);
        	console.error("Login error:", err);
        });
    });
}

export function twoFALogin(form : HTMLFormElement, h1 : HTMLHeadElement, user : any) {
	h1.textContent = "2FA Code"
	form.innerHTML = "";
	const twoFAcode = document.createElement("input");
	twoFAcode.type = "text";
	twoFAcode.placeholder = "Enter 2FA Code if enabled";
    twoFAcode.className = "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
    form.appendChild(twoFAcode);
	const submit2FA = document.createElement("button");
    submit2FA.textContent = "Submit";
    submit2FA.className = "w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 ease-in-out transform hover:scale-105";
    form.appendChild(submit2FA);
	submit2FA.addEventListener("click", () => {
		const credential2FACode = twoFAcode.value.trim();
		if (!credential2FACode)
			return alert ("Please enter a 2FA code");
		const credentials = {
			userId: user.id,
			twoFAcode: credential2FACode,
		};
		fetch('/api/login/2fa', {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(credentials.userId),
		})
		.then(async (res) => {
        	if (!res.ok) {
        		const errData = await res.json();
        		throw new Error(errData.error || "Login failed");
        	}
        	return res.json();
        })
		.then((data) => {
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
				.then((data) => {
					const token = data.token;
					const user = data.existingUser;
					localStorage.setItem("token", token);
					localStorage.setItem("user", JSON.stringify(user));
        			loadMainPage();
				})
				.catch((err) => {
        			alert(`Login failed: ${err.message}`);
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
				.then((data) => {
					const token = data.token;
					const user = data.existingUser;
					localStorage.setItem("token", token);
					localStorage.setItem("user", JSON.stringify(user));
        			loadMainPage();
				})
				.catch((err) => {
        			alert(`Login failed: ${err.message}`);
        			console.error("Login error:", err);
        		});
			}
        })
		.catch((err) => {
        	alert(`Login failed: ${err.message}`);
        	console.error("Login error:", err);
        });
	});
}

export function editUserInfo(loggedUser : User, token : string) {
	const form = document.createElement("div");
	form.className = "fixed top-0 left-0 w-full h-full bg-black bg-opacity-40 flex justify-center items-center z-50";

	const formBox = document.createElement("div");
	formBox.className = "bg-white p-6 rounded-lg shadow-lg space-y-4 space-x-2 max-w-md w-full";
  
	const nameInput = document.createElement("input");
	nameInput.type = "text";
	nameInput.placeholder = "New Name";
	nameInput.value = loggedUser.name;
	nameInput.className = "w-full border border-gray-300 px-3 py-2 rounded";

	const infoInput = document.createElement("input");
	infoInput.type = "text";
	infoInput.placeholder = "New Info";
	infoInput.value = loggedUser.info;
	infoInput.className = "w-full border border-gray-300 px-3 py-2 rounded";

	const emailInput = document.createElement("input");
	emailInput.type = "email";
	emailInput.placeholder = "New Email";
	emailInput.value = loggedUser.email;
	emailInput.className = "w-full border border-gray-300 px-3 py-2 rounded";

	const passwordInput = document.createElement("input");
	passwordInput.type = "password";
	passwordInput.placeholder = "New Password";
	passwordInput.className = "w-full border border-gray-300 px-3 py-2 rounded";

	const saveButton = document.createElement("button");
	saveButton.textContent = "Save";
	saveButton.className = "bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded";

	const cancelButton = document.createElement("button");
	cancelButton.textContent = "Cancel";
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
    		headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
    		body: JSON.stringify(updatedUser),
    	})
    	.then(async (res) => {
    		if (!res.ok) {
        		const errData = await res.json();
        		throw new Error(errData.error || "Failed to update");
        	}
        	return res.json();
    	})
    	.then((data) => {
			console.log("User updated successfully:", data.user.name);
    		localStorage.setItem("user", JSON.stringify(data.user));
    		form.remove();
    		loadMainPage();
    	})
    	.catch((err) => {
    		console.error(err);
    		alert("Error updating user: " + err.message);
    	});
	};
}

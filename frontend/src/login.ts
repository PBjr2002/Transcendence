import './style.css'
import { loadMainPage } from './main';

const backendUrl = "https://localhost:3000";

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

    	fetch(`${backendUrl}/api/login`, {
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
			localStorage.setItem("user", JSON.stringify(user));
        	console.log("Login successful:", user.name);
        	email.value = "";
        	password.value = "";
        	loadMainPage();
        })
        .catch((err) => {
        	alert(`Login failed: ${err.message}`);
        	console.error("Login error:", err);
        });
    });
}

import './style.css'
import { renderLoginPage } from './login';
import { loadProfile } from './profile';
import { t } from './i18n';
import { LanguageSelector, injectLanguageSelectorStyles } from './components/LanguageSelector';

function updateTranslations() {
	const h1 = document.querySelector('h1');
	if (h1) 
		h1.textContent = t('nav.home');

	const formContainer = document.querySelector('.space-y-4');
	if (formContainer) {
		const usernameInput = formContainer.querySelector('input[type="text"]:first-of-type') as HTMLInputElement;
		if (usernameInput) 
			usernameInput.placeholder = t('forms.username');
		
		const userInfoInput = formContainer.querySelector('input[type="text"]:nth-of-type(2)') as HTMLInputElement;
		if (userInfoInput) 
			userInfoInput.placeholder = t('forms.userInfo');
		
		const emailInput = formContainer.querySelector('input[type="email"]') as HTMLInputElement;
		if (emailInput) 
			emailInput.placeholder = t('forms.email');
		
		const passwordInput = formContainer.querySelector('input[type="password"]') as HTMLInputElement;
		if (passwordInput) 
			passwordInput.placeholder = t('forms.password');
		
		const addUserButton = formContainer.querySelector('button.bg-blue-500') as HTMLButtonElement;
		if (addUserButton) 
			addUserButton.textContent = t('buttons.save');
		
		const loginButton = formContainer.querySelector('button.bg-green-500') as HTMLButtonElement;
		if (loginButton) 
			loginButton.textContent = t('buttons.login');
	}

	const listTitle = document.getElementById('userListTitle');
	if (listTitle)
		listTitle.textContent = t('nav.users');

	const userListItems = document.querySelectorAll('li p');
	userListItems.forEach((p, index) => {
		const text = p.textContent || '';
		if (text.includes(':')) {
			const [, value] = text.split(': ');
			const itemIndex = index % 3;
			if (itemIndex === 0)
				p.textContent = `${t('userList.userName')}: ${value}`;
			else if (itemIndex === 1)
				p.textContent = `${t('userList.userInfo')}: ${value}`;
			else if (itemIndex === 2)
				p.textContent = `${t('userList.userEmail')}: ${value}`;
		}
	});
}

export function loadMainPage() {
	const app = document.querySelector<HTMLDivElement>('#app');
	if (!app)
		return;
	app.innerHTML = "";

	window.removeEventListener('languageChanged', updateTranslations);
	injectLanguageSelectorStyles();
	const topRow = document.createElement("div");
	topRow.className = "relative w-full flex items-start mt-4";
	app.appendChild(topRow);

	const languageSelectorContainer = document.createElement("div");
	languageSelectorContainer.id = "language-selector-container";
	languageSelectorContainer.className = "absolute top-4 right-4 z-10";
	topRow.appendChild(languageSelectorContainer);

	new LanguageSelector("language-selector-container");
	window.addEventListener('languageChanged', () => {
		updateTranslations();
	});
	
	const storedUser = localStorage.getItem("user");
	const token = localStorage.getItem("token");
	if (storedUser && token)
		loadProfile(storedUser, token, topRow);

	const container = document.createElement("div");
	container.className = "absolute left-1/2 transform -translate-x-1/2 max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg";
	topRow.appendChild(container);

  	const h1 = document.createElement("h1");
  	h1.textContent = t('nav.home');
  	h1.className = "text-3xl font-bold text-gray-800 mb-6 text-center";
  	container.appendChild(h1);

  	const formContainer = document.createElement("div");
  	formContainer.className = "space-y-4 mb-6";
  	container.appendChild(formContainer);

  	const userName = document.createElement("input");
  	userName.type = "text";
  	userName.placeholder = t('forms.username');
  	userName.className = "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  	formContainer.appendChild(userName);

  	const userInfo = document.createElement("input");
  	userInfo.type = "text";
  	userInfo.placeholder = t('forms.userInfo');
  	userInfo.className = "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  	formContainer.appendChild(userInfo);

  	const userEmail = document.createElement("input");
  	userEmail.type = "email";
  	userEmail.placeholder = t('forms.email');
  	userEmail.className = "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  	formContainer.appendChild(userEmail);

  	const userPassword = document.createElement("input");
  	userPassword.type = "password";
  	userPassword.placeholder = t('forms.password');
  	userPassword.className = "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  	formContainer.appendChild(userPassword);

  	const addUser = document.createElement("button");
  	addUser.textContent = t('buttons.save');
  	addUser.className = "w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 ease-in-out transform hover:scale-105";
  	formContainer.appendChild(addUser);

	if (!storedUser || !token) {
		const login = document.createElement("button");
  		login.textContent = t('buttons.login');
  		login.className = "w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 ease-in-out transform hover:scale-105";
  		formContainer.appendChild(login);
		login.addEventListener("click", () => {
  			renderLoginPage();
		});
	}

  	const listContainer = document.createElement("div");
  	listContainer.className = "mt-6";
  	container.appendChild(listContainer);

	if (token) {
		const listTitle = document.createElement("h2");
		listTitle.id = "userListTitle";
		listTitle.textContent = t('nav.users');
		listTitle.className = "text-xl font-semibold text-gray-700 mb-3";
		listContainer.appendChild(listTitle);
	}

  	const userList = document.createElement("ul");
  	userList.className = "space-y-2";
  	listContainer.appendChild(userList);

  	function loadUsers() {
		if (!token) {
			console.warn("No token — skipping user fetch.");
			return;
		}
  		fetch(`/api/users`, {
			method: "GET",
    		headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
		})
  	    .then(async (res) => {
			if (!res.ok) {
				let errorMsg = res.statusText;
				try {
					const errData = await res.json();
					errorMsg = errData.error || errorMsg;
				}
				catch {
					const errText = await res.text();
					if (errText) errorMsg = errText;
				}
				throw new Error(errorMsg);
			}
			const text = await res.text();
			return text ? JSON.parse(text) : [];
		})
  	    .then((users) => {
  	    	userList.innerHTML = "";
  	    	users.forEach((user: any) => {
  	    		const li = document.createElement("li");
  	    		const userN = document.createElement("p");
  	    		userN.textContent = `${t('userList.userName')}: ${user.name}`;
  	    		const userI = document.createElement("p");
  	    		userI.textContent = `${t('userList.userInfo')}: ${user.info ? `${user.info}` : ""}`;
  	    		const userE = document.createElement("p");
  	    		userE.textContent = `${t('userList.userEmail')}: ${user.email}`;
  	    		[userN, userI, userE].forEach(p => {
  	    			li.appendChild(p);
  	    		});
  	    		li.className = "p-3 bg-gray-50 rounded-md border-l-4 border-blue-500 shadow-sm";
  	    		userList.appendChild(li);
  	    	});
  	    })
  	    .catch((err) => {
  	    	console.error("Error fetching users:", err);
  	    });
  	}

	if (token)
    	loadUsers();

    addUser.addEventListener("click", () => {
    	const name = userName.value.trim();
    	const info = userInfo.value.trim();
    	const email = userEmail.value.trim();
    	const password = userPassword.value.trim();
		
    	if (!name)
			return alert(t('validation.enterName'));
    	if (!info)
			return alert(t('validation.enterUserInfo'));
    	if (!email)
			return alert(t('validation.enterEmail'));
    	if (!password)
			return alert(t('validation.enterPassword'));

    	const userData = {
    		name: name,
    		info: info,
    		email: email,
    		password: password,
    	};

    	fetch(`/api/users`, {
    		method: "POST",
    		headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
    		body: JSON.stringify(userData),
    	})
    	.then(async (res) => {
    		if (!res.ok) {
    		  const errorData = await res.json();
    		  throw new Error(errorData.error || "Unknown error");
    		}
    		return res.json();
    	})
    	.then((data) => {
    		console.log("User added:", data);
    		userName.value = "";
    		userInfo.value = "";
    		userEmail.value = "";
    		userPassword.value = "";
    		loadUsers();
    	})
    	.catch((err) => {
    		alert(`${t('validation.addUserError')}: ${err.message}`);
    		console.error("Error adding user:", err);
    	});
  	});
}

if (typeof document !== "undefined") {
	/* localStorage.removeItem("user");
	localStorage.removeItem("token"); */
	loadMainPage();
}
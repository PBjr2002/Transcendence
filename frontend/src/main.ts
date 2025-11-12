import './style.css'
import { loadProfile } from './profile';
import { t } from './i18n';
import { LanguageSelector, injectLanguageSelectorStyles } from './components/LanguageSelector';
import { navigate, handleLocation } from './router';

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
	initializeUser();
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
	if (storedUser)
		loadProfile(storedUser, topRow);
	else {
		const editInfo = document.createElement("button");
		editInfo.className = "absolute top-4 right-90 text-gray-600 hover:text-blue-600 text-xl";
		editInfo.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-round-cog-icon lucide-user-round-cog"><path d="m14.305 19.53.923-.382"/><path d="m15.228 16.852-.923-.383"/><path d="m16.852 15.228-.383-.923"/><path d="m16.852 20.772-.383.924"/><path d="m19.148 15.228.383-.923"/><path d="m19.53 21.696-.382-.924"/><path d="M2 21a8 8 0 0 1 10.434-7.62"/><path d="m20.772 16.852.924-.383"/><path d="m20.772 19.148.924.383"/><circle cx="10" cy="8" r="5"/><circle cx="18" cy="18" r="3"/></svg>`;
		editInfo.addEventListener("click", () => {
			editInfo.className = "hidden";
			const nameInput = document.createElement("input");
			nameInput.type = "text";
			nameInput.placeholder = t('userEdit.newName');
			nameInput.className = "w-full border border-gray-300 px-3 py-2 rounded";
			const saveButton = document.createElement("button");
			saveButton.textContent = t('buttons.save');
			saveButton.className = "top-10 left-10 bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded";
			saveButton.onclick = () => {
				updateGuestAlias(nameInput.value);
				navigate('/');
			}
			topRow.appendChild(nameInput);
			topRow.appendChild(saveButton);
		});
		topRow.appendChild(editInfo);
	}

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

	const userPhoneNumber = document.createElement("input");
	userPhoneNumber.type = "text";
  	userPhoneNumber.placeholder = "Phone Number";
  	userPhoneNumber.className = "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  	formContainer.appendChild(userPhoneNumber);

  	const userPassword = document.createElement("input");
  	userPassword.type = "password";
  	userPassword.placeholder = t('forms.password');
  	userPassword.className = "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  	formContainer.appendChild(userPassword);

  	const addUser = document.createElement("button");
  	addUser.textContent = t('buttons.save');
  	addUser.className = "w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 ease-in-out transform hover:scale-105";
  	formContainer.appendChild(addUser);

	if (!storedUser) {
		const login = document.createElement("button");
  		login.textContent = t('buttons.login');
  		login.className = "w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 ease-in-out transform hover:scale-105";
  		formContainer.appendChild(login);
		login.addEventListener("click", () => {
			navigate('/login');
		});
	}

	const playButton = document.createElement("button");
	playButton.textContent = "PLAY";
  	playButton.className = "w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 ease-in-out transform hover:scale-105";
  	formContainer.appendChild(playButton);

  	const listContainer = document.createElement("div");
  	listContainer.className = "mt-6";
  	container.appendChild(listContainer);

	const listTitle = document.createElement("h2");
	listTitle.id = "userListTitle";
	listTitle.textContent = t('nav.users');
	listTitle.className = "text-xl font-semibold text-gray-700 mb-3";
	listContainer.appendChild(listTitle);

  	const userList = document.createElement("ul");
  	userList.className = "space-y-2";
  	listContainer.appendChild(userList);

	if (!storedUser) {
		fetch('/api/guest/info', {
			method: "GET",
			credentials: 'include',
			headers: { "Content-Type": "application/json" }
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
			const guestUserAlias = document.createElement("h2");
			guestUserAlias.textContent = data.currentSession.alias;
			guestUserAlias.className = "text-xl font-semibold text-gray-700 mb-3";
			const guestUserProfilePic = document.createElement("img");
			guestUserProfilePic.src = data.currentSession.profile_image;
			guestUserProfilePic.className = "absolute bottom-5 left-45 w-10 h-10 rounded-full mb-2 object-cover";
			container.appendChild(guestUserAlias);
			container.appendChild(guestUserProfilePic);
    	})
    	.catch((err) => {
    		console.error(err);
    	});
	}

  	function loadUsers() {
  		fetch(`/api/users`, {
			method: "GET",
			credentials: 'include',
    		headers: { "Content-Type": "application/json" }
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
  	    .then((response) => {
  	    	userList.innerHTML = "";
			const users = response.message || response;
			if (Array.isArray(users)) {
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
			}
  	    })
  	    .catch((err) => {
  	    	console.error("Error fetching users:", err);
			if (err.message.includes('401') || err.message.includes('Unauthorized'))
				listContainer.style.display = 'none';
			else
				userList.innerHTML = `<li class="text-red-500">Error loading users: ${err.message}</li>`;
  	    });
  	}

	loadUsers(); 

    addUser.addEventListener("click", () => {
    	const name = userName.value.trim();
    	const info = userInfo.value.trim();
    	const email = userEmail.value.trim();
		const phoneNumber = userPhoneNumber.value.trim();
    	const password = userPassword.value.trim();
		
    	if (!name)
			return alert(t('validation.enterName'));
    	if (!info)
			return alert(t('validation.enterUserInfo'));
    	if (!email)
			return alert(t('validation.enterEmail'));
    	if (!password)
			return alert(t('validation.enterPassword'));
		if (!phoneNumber)
			return alert("Please insert a phone number");

    	const userData = {
    		name: name,
    		email: email,
			phoneNumber: phoneNumber,
    		password: password,
    		info: info,
    	};

    	fetch(`/api/users`, {
    		method: "POST",
			credentials: 'include',
    		headers: { "Content-Type": "application/json" },
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
			userPhoneNumber.value = "";
    		userPassword.value = "";
    		loadUsers();
    	})
    	.catch((err) => {
    		alert(`${t('validation.addUserError')}: ${err.message}`);
    		console.error("Error adding user:", err);
    	});
  	});

	playButton.addEventListener("click", () => {
		navigate('/playGame');
	});
}

async function initializeUser() {
	try {
		await fetch('/api/init', {
			method: 'GET',
			credentials: 'include'
		});
	}
	catch (err) {
		console.log('Error initializing user:', err);
	}
}

async function updateGuestAlias(newAlias: string): Promise<{success: boolean, error?: string}> {
	const storedUser = localStorage.getItem("user");
	if (storedUser)
		return { success: false, error: 'Cannot update guest alias for authenticated user' };
	
	try {
		const response = await fetch('/api/guest/alias', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ alias: newAlias })
		});
		const data = await response.json();
		if (response.ok)
			return { success: true };
		else
			return { success: false, error: data.message || 'Failed to update alias' };
	}
	catch (error) {
		return { success: false, error: 'Network error' };
	}
}

handleLocation();

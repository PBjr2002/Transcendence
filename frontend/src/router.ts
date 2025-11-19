import { getUserInfo, loadMainPage } from "./main";
import { renderLoginPage } from "./login";
import { loadProfile } from "./profile";
import { editUserInfo } from "./login";

function ensureMainAndThen(fn: () => void) {
	loadMainPage();
	setTimeout(fn, 0);
}

export function navigate(path : string, state : any = {}) {
	history.pushState(state, '', path);
	handleLocation();
}

export function replace(path : string, state : any = {}) {
	history.replaceState(state, '', path);
	handleLocation();
}

export async function handleLocation() {
	const presentPath = window.location.pathname;
	if (presentPath === '/' || presentPath === '') {
		loadMainPage();
		return ;
	}
	if (presentPath === '/login') {
		renderLoginPage();
		return ;
	}
	if (presentPath === '/playGame') {
		//function to load Game
		return ;
	}
	if (presentPath === '/editProfile') {
		ensureMainAndThen(async () => {
			let response;
			try {
				response = await getUserInfo();
			}
			catch (err) {
				response = null;
			}
			const storedUser = response.data.safeUser;
			if (!storedUser) {
				replace('/');
				return ;
			}
			editUserInfo(storedUser);
		});
		return ;
	}
	if (presentPath === '/profile' || presentPath.startsWith('/profile')) {
		ensureMainAndThen(async () => {
			let response;
			try {
				response = await getUserInfo();
			}
			catch (err) {
				response = null;
			}
			const storedUser = response.data.safeUser;
			if (!storedUser) {
				replace('/login');
				return ;
			}
			const topRow = document.querySelector<HTMLDivElement>('.relative.w-full.flex.items-start.mt-4');
			if (topRow)
				loadProfile(storedUser, topRow);
			else
				console.warn('Could not find main topRow to mount profile');
		});
		return ;
	}
	loadMainPage();
}

window.addEventListener('popstate', () => {
	handleLocation();
});

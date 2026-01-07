import { getUserInfo, loadMainPage, loadHomepage } from './app';
//import { loadGame } from './Game/game';
import { loadProfilePage } from './profilePage';
import { editUserInfo } from './login';
import { renderLandingPage, teardownLanding } from './landing';
import { goToLobby} from './Game/beforeGame';
//import { loadGame } from './Game/game';

async function ensureMainAndThen(fn: () => void) {
	teardownLanding();
	await loadMainPage();
	setTimeout(fn, 0);
}

export function navigate(path: string, state: any = {}) {
	history.pushState(state, '', path);
	handleLocation();
}

export function replace(path: string, state: any = {}) {
	history.replaceState(state, '', path);
	handleLocation();
}

export async function handleLocation() {
	const presentPath = window.location.pathname;
	if (presentPath === '/' || presentPath === '') {
		renderLandingPage();
		return;
	}
	if (presentPath === '/home') {
		teardownLanding();
		await loadHomepage();
		return;
	}
	if (presentPath === '/login') {
		renderLandingPage({ openLogin: true });
		return;
	}
	if (presentPath === '/user_managment' || presentPath === '/user_management') {
		teardownLanding();
		await loadMainPage();
		return;
	}
	if (presentPath === '/playGame') {
		teardownLanding();
		// Acho que vamos ter de dar carregar uma pagina html aqui, depois quando tivermos juntos vemos isto Paulo
		//loadGame();
		goToLobby();
		return ;
	}
	if (presentPath === '/editProfile') {
		await ensureMainAndThen(async () => {
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
				return;
			}
			editUserInfo(storedUser);
		});
		return;
	}
	if (presentPath === '/profile' || presentPath.startsWith('/profile')) {
		teardownLanding();
		await loadProfilePage();
		return;
	}
	teardownLanding();
await loadHomepage();
}

window.addEventListener('popstate', () => {
	handleLocation();
});

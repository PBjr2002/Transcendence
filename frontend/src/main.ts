import './global.css'
import { handleLocation } from './router';

// Ensure app-mode is set by default on page load to prevent layout breaking
if (!document.body.classList.contains('landing-mode') && !document.body.classList.contains('app-mode')) {
	document.body.classList.add('app-mode');
}

handleLocation();

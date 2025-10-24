export interface GuestSession {
	id: string;
	alias: string;
	createdAt: number;
}

export function getCurrentGuestSession() : GuestSession | null {
	try {
		const cookies = document.cookie.split(';');
		for (let cookie of cookies) {
			const [name, value] = cookie.trim().split('=');
			if (name === 'guestSession')
				return JSON.parse(decodeURIComponent(value));
		}
		return null;
	}
	catch (error) {
		console.error('Error parsing guest session:', error);
		return null;
	}
}

export function isAuthenticatedUser() : boolean {
	const cookies = document.cookie.split(';');
	for (let cookie of cookies) {
		const [name, value] = cookie.trim().split('=');
		if (name === 'authToken' && value.trim() !== '')
			return true;
	}
	return false;
}

export function isGuestUser() : boolean {
	return !isAuthenticatedUser() && getCurrentGuestSession() !== null;
}

export async function updateGuestAlias(newAlias: string): Promise<{success: boolean, error?: string}> {
	if (isAuthenticatedUser())
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

// Get display name for current user (guest or authenticated)
export function getDisplayName(): string {
	if (isAuthenticatedUser()) {
		// TODO: You might want to get the actual username from your user context/store
		return 'Authenticated User';
	}
	
	const guestSession = getCurrentGuestSession();
	return guestSession ? guestSession.alias : 'Guest User';
}

// Validate alias format (client-side validation before API call)
export function validateAlias(alias: string): { isValid: boolean; error?: string } {
	if (!alias || alias.trim().length === 0) {
		return { isValid: false, error: 'Alias cannot be empty' };
	}
	
	const trimmedAlias = alias.trim();
	
	if (trimmedAlias.length < 3) {
		return { isValid: false, error: 'Alias must be at least 3 characters' };
	}
	
	if (trimmedAlias.length > 20) {
		return { isValid: false, error: 'Alias cannot exceed 20 characters' };
	}
	
	// Match your Security.validateUserName() pattern
	const validPattern = /^[a-zA-Z0-9_-]+$/;
	if (!validPattern.test(trimmedAlias)) {
		return { isValid: false, error: 'Alias can only contain letters, numbers, underscores, and hyphens' };
	}
	
	return { isValid: true };
}

// Get guest info for display purposes
export function getGuestInfo(): { isGuest: boolean; session: GuestSession | null } {
	const isGuest = isGuestUser();
	const session = isGuest ? getCurrentGuestSession() : null;
	
	return {
		isGuest,
		session
	};
}

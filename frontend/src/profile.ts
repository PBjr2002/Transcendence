import './style.css'
import { editUserInfo, type User } from './login';
import { loadMainPage } from './main';
import { render2FAPage } from './enable2FA';

export function loadProfile(storedUser : string, token : string, topRow : HTMLDivElement) {
	const loggedUser = JSON.parse(storedUser);
	const loggedContainerInfo = document.createElement("div");
	loggedContainerInfo.className = "relative w-70 h-40 mt-4 ml-4 p-5 bg-white rounded-lg shadow-lg flex flex-col items-center justify-between";
	const userTitle = document.createElement("h2");
	userTitle.textContent = loggedUser.name;
	userTitle.className = "text-2xl font-bold text-gray-800 text-center";
	loggedContainerInfo.appendChild(userTitle);
	const userRandomInfo = document.createElement("p");
	userRandomInfo.textContent = "Info: " + loggedUser.info;
	userRandomInfo.className = "text-gray-800 mb-5 text-center";
	loggedContainerInfo.appendChild(userRandomInfo);
	const editInfo = document.createElement("button");
	editInfo.className = "absolute top-4 right-4 text-gray-600 hover:text-blue-600 text-xl";
	editInfo.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-round-cog-icon lucide-user-round-cog"><path d="m14.305 19.53.923-.382"/><path d="m15.228 16.852-.923-.383"/><path d="m16.852 15.228-.383-.923"/><path d="m16.852 20.772-.383.924"/><path d="m19.148 15.228.383-.923"/><path d="m19.53 21.696-.382-.924"/><path d="M2 21a8 8 0 0 1 10.434-7.62"/><path d="m20.772 16.852.924-.383"/><path d="m20.772 19.148.924.383"/><circle cx="10" cy="8" r="5"/><circle cx="18" cy="18" r="3"/></svg>`;
	loggedContainerInfo.appendChild(editInfo);
	editInfo.addEventListener("click", () => {
		editUserInfo(loggedUser, token);
	});
	const buttonDiv = document.createElement("div");
	buttonDiv.className = "flex items-center space-x-2";
	const enable2FA = document.createElement("button");
	enable2FA.textContent = "2FA";
	enable2FA.className = "w-15 mx-2 bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-2 rounded-md transition duration-200 ease-in-out transform hover:scale-105";
	buttonDiv.appendChild(enable2FA);
	enable2FA.addEventListener("click", () => {
		render2FAPage(loggedUser, token, topRow);
		enable2FA.style.display = "none";
	});
	const logOut = document.createElement("button");
	logOut.textContent = "Logout";
	logOut.className = "w-20 mx-2 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-2 rounded-md transition duration-200 ease-in-out transform hover:scale-105";
	buttonDiv.appendChild(logOut);
	logOut.addEventListener("click", () => {
		const userData = {
			name: loggedUser.name.trim(),
	  	};
	  	fetch(`/api/logout`, {
			method: "POST",
			headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
			body: JSON.stringify(userData),
	  	})
	  	.then(() => {
			localStorage.removeItem("user");
			localStorage.removeItem("token");
			loadMainPage();
	  	})
	  	.catch((err) => {
			console.error("Error logging out:", err);
			alert("Logout failed. Please try again.");
	  	});
	});
	loggedContainerInfo.appendChild(buttonDiv);
	topRow.appendChild(loggedContainerInfo);
	loadFriendsUI(loggedUser, token, topRow);
}

function loadFriendsUI(loggedUser : any, token : string, topRow : HTMLDivElement) {
	const friendsSection = document.createElement("div");
	friendsSection.className = "absolute top-45 left-4 mt-4 p-4 bg-white shadow rounded-lg w-70";

	const friendsTitle = document.createElement("h3");
	friendsTitle.textContent = "Friends List";
	friendsTitle.className = "text-lg font-semibold mb-2";
	friendsSection.appendChild(friendsTitle);

	const friendsList = document.createElement("ul");
	friendsList.className = "space-y-1";
	friendsSection.appendChild(friendsList);

	topRow.appendChild(friendsSection);
	function loadFriends() {
		fetch(`/api/friends` , {
			method: "GET",
			headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
		})
		.then(async (res) => {
			if (!res.ok) {
        		const errData = await res.json();
        		throw new Error(errData.error || "Load of friends list failed");
        	}
        	return res.json();
		})
		.then(friends => {
			if (!Array.isArray(friends) || friends.length === 0) {
				friendsList.innerHTML = "<li class='text-gray-600'>No friends to list.</li>";
    			return;
			}
	    	friendsList.innerHTML = "";
	    	friends.forEach((friend : User) => {
	    		const li = document.createElement("li");
				li.className = "bg-white p-3 rounded shadow flex justify-between items-center";
				const friendNameContainer = document.createElement("div");
				friendNameContainer.className = "flex items-center space-x-2";
				const statusIndicator = document.createElement("span");
				if (friend.online)
					statusIndicator.className = "w-3 h-3 rounded-full bg-green-500";
				else
					statusIndicator.className = "w-3 h-3 rounded-full bg-red-500";
				const nameSpan = document.createElement("span");
				nameSpan.textContent = friend.name;
				friendNameContainer.appendChild(nameSpan);
				friendNameContainer.appendChild(statusIndicator);	
				const removeFriendButton = document.createElement("button");
				removeFriendButton.textContent = "Remove";
				removeFriendButton.className = "bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded";
				removeFriendButton.onclick = async () => {
					if (!confirm(`Are you sure you want to remove ${friend.name} as a friend?`))
						return;
					await fetch(`/api/friends/remove`, {
						method: "POST",
						headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
						body: JSON.stringify({userId1: loggedUser.id,friendId: friend.id}),
					});
					loadFriends();
				};
				li.appendChild(friendNameContainer);
				li.appendChild(removeFriendButton);
	    		friendsList.appendChild(li);
	    	});
	  	})
	  	.catch(err => {
	  		console.error("Failed to load friends:", err);
	  	});
	}
	loadFriends();
	loadRequestBox(friendsSection, token, loggedUser);
	loadPendingRequests(friendsSection, token, loggedUser);
}

function loadRequestBox(friendsSection : HTMLDivElement, token : string, loggedUser : any) {
	const requestBox = document.createElement("div");
	requestBox.className = "mt-4 p-4 border rounded bg-gray-100";

	const requestTitle = document.createElement("h4");
	requestTitle.textContent = "Send Friend Request";
	requestTitle.className = "font-semibold text-lg mb-2";
	requestBox.appendChild(requestTitle);

	const usernameInput = document.createElement("input");
	usernameInput.type = "text";
	usernameInput.placeholder = "Enter username";
	usernameInput.className = "w-full mb-2 p-2 border rounded";
	requestBox.appendChild(usernameInput);

	const sendButton = document.createElement("button");
	sendButton.textContent = "Send Request";
	sendButton.className = "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full";
	requestBox.appendChild(sendButton);

	const feedback = document.createElement("p");
	feedback.className = "mt-2 text-sm";
	requestBox.appendChild(feedback);

	friendsSection.appendChild(requestBox);

	sendButton.addEventListener("click", async () => {
		const username = usernameInput.value.trim();
		if (!username) {
			feedback.textContent = "Please enter a username.";
			feedback.className = "text-red-500 mt-2";
			return;
		}
		try {
			const response = await fetch(`/api/users/name/${username}`, {
				method: "GET",
				headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
			});
			if (response.status === 404) {
				feedback.textContent = "User not found.";
				feedback.className = "text-red-500 mt-2";
				return;
			}
    		const user = await response.json();
    		const currentUser = loggedUser;
    		const requestResponse = await fetch(`/api/friends/request`, {
    	    	method: "POST",
    	    	headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    	    	body: JSON.stringify({requesterId: currentUser.id, addresseeId: user.id,}),
    	  	});
    		const requestData = await requestResponse.json();
    		if (requestResponse.ok) {
    			feedback.textContent = "Friend request sent!";
    			feedback.className = "text-green-500 mt-2";
    			usernameInput.value = "";
    	  	} 
			else {
    			feedback.textContent = requestData.message || "Failed to send request.";
    			feedback.className = "text-red-500 mt-2";
    	  	}
		}
		catch (err) {
    		console.error("Error sending friend request:", err);
    		feedback.textContent = "An error occurred.";
    		feedback.className = "text-red-500 mt-2";
		}
	});
}

function loadPendingRequests(friendsSection : HTMLDivElement, token : string, loggedUser : any) {
	const incomingBox = document.createElement("div");
	incomingBox.className = "mt-6 p-4 border rounded bg-gray-100";

	const incomingTitle = document.createElement("h4");
	incomingTitle.textContent = "Friend Requests";
	incomingTitle.className = "font-semibold text-lg mb-2";
	incomingBox.appendChild(incomingTitle);

	const requestList = document.createElement("ul");
	requestList.className = "space-y-2";
	incomingBox.appendChild(requestList);

	friendsSection.appendChild(incomingBox);

	async function loadIncomingRequests() {
  		const currentUser = loggedUser;
  		requestList.innerHTML = "";

  		try {
    		const response = await fetch(`/api/friends/pending`, {
				method: "GET",
				headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
			});
    		const requests = await response.json();
    		if (!Array.isArray(requests) || requests.length === 0) {
    			requestList.innerHTML = "<li class='text-gray-600'>No pending requests.</li>";
    			return;
    		}
    		requests.forEach((req) => {
    			const li = document.createElement("li");
    			li.className = "bg-white p-3 rounded shadow";

				const nameContainer = document.createElement("div");
				nameContainer.className = "flex items-center";
			
    			const name = document.createElement("span");
    			name.textContent = `From: ${req.name}`;
    			name.className = "text-gray-800";
    			nameContainer.appendChild(name);
				li.appendChild(nameContainer);
			
    			const buttonDiv = document.createElement("div");
    			buttonDiv.className = "flex items-center space-x-2 mt-1";
			
    			const acceptButton = document.createElement("button");
    			acceptButton.textContent = "Accept";
    			acceptButton.className = "bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded";
    			acceptButton.onclick = async () => {
        			await fetch(`/api/friends/accept`, {
        				method: "POST",
        				headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
        				body: JSON.stringify({requesterId: req.requester_id, addresseeId: currentUser.id,}),
        			});
        			loadIncomingRequests();
     			};

      			const rejectButton = document.createElement("button");
      			rejectButton.textContent = "Reject";
      			rejectButton.className = "bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded";
      			rejectButton.onclick = async () => {
        			await fetch(`/api/friends/reject`, {
        				method: "POST",
        				headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
        				body: JSON.stringify({requesterId: req.requester_id, addresseeId: currentUser.id,}),
        			});
        			loadIncomingRequests();
      			};

      			buttonDiv.appendChild(acceptButton);
      			buttonDiv.appendChild(rejectButton);
      			li.appendChild(buttonDiv);
      			requestList.appendChild(li);
    		});
  		}
		catch (err) {
  			console.error("Error loading friend requests:", err);
  			requestList.innerHTML = "<li class='text-red-600'>Failed to load requests.</li>";
  		}
	}
	loadIncomingRequests();
}

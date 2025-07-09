const msg: string = "Hello from frontend TypeScript!";

if (typeof document !== "undefined") {
  const h1 = document.createElement("h1");
  h1.textContent = msg;
  document.body.appendChild(h1);

  const userName = document.createElement("input");
  userName.type = "text";
  userName.placeholder = "Enter user name";
  document.body.appendChild(userName);

  const userInfo = document.createElement("input");
  userInfo.type = "text";
  userInfo.placeholder = "Enter user information";
  document.body.appendChild(userInfo);

  const button = document.createElement("button");
  button.textContent = "Add User";
  document.body.appendChild(button);

  const userList = document.createElement("ul");
  document.body.appendChild(userList);

  const backendUrl = location.origin;

  function loadUsers() {
    fetch(`${backendUrl}/api/users`)
      .then((res) => res.json())
      .then((users) => {
        userList.innerHTML = "";
        users.forEach((user: { name: string; info?: string }) => {
          const li = document.createElement("li");
          li.textContent = `${user.name}${user.info ? ` - ${user.info}` : ""}`;
          userList.appendChild(li);
        });
      })
      .catch((err) => {
        console.error("Error fetching users:", err);
      });
  }

  loadUsers();

  button.addEventListener("click", () => {
    const name = userName.value.trim();
	const info = userInfo.value.trim();
    if (!name) return alert("Please enter a name");
	if (!info) return alert("Please enter some user information");
	const userData = {
		name: name,
		info: info,
	};

    fetch(`${backendUrl}/api/users`, {
      method: "POST",
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
        loadUsers();
      })
      .catch((err) => {
		alert(`Error adding user: ${err.message}`);
        console.error("Error adding user:", err);
      });
  });
}

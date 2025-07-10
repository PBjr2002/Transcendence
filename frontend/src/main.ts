import './style.css'

const msg = "User Management System";

if (typeof document !== "undefined") {
  const container = document.createElement("div");
  container.className = "max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg";
  document.querySelector<HTMLDivElement>('#app')!.appendChild(container);

  const h1 = document.createElement("h1");
  h1.textContent = msg;
  h1.className = "text-3xl font-bold text-gray-800 mb-6 text-center";
  container.appendChild(h1);

  const formContainer = document.createElement("div");
  formContainer.className = "space-y-4 mb-6";
  container.appendChild(formContainer);

  const userName = document.createElement("input");
  userName.type = "text";
  userName.placeholder = "Enter user name";
  userName.className = "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  formContainer.appendChild(userName);

  const userInfo = document.createElement("input");
  userInfo.type = "text";
  userInfo.placeholder = "Enter user information";
  userInfo.className = "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  formContainer.appendChild(userInfo);

  const button = document.createElement("button");
  button.textContent = "Add User";
  button.className = "w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 ease-in-out transform hover:scale-105";
  formContainer.appendChild(button);

  const listContainer = document.createElement("div");
  listContainer.className = "mt-6";
  container.appendChild(listContainer);

  const listTitle = document.createElement("h2");
  listTitle.textContent = "Users";
  listTitle.className = "text-xl font-semibold text-gray-700 mb-3";
  listContainer.appendChild(listTitle);

  const userList = document.createElement("ul");
  userList.className = "space-y-2";
  listContainer.appendChild(userList);

  const backendUrl = "https://localhost:3000";

  function loadUsers() {
    fetch(`${backendUrl}/api/users`)
      .then((res) => res.json())
      .then((users) => {
        userList.innerHTML = "";
        users.forEach((user: any) => {
          const li = document.createElement("li");
          li.textContent = `${user.name}${user.info ? ` - ${user.info}` : ""}`;
          li.className = "p-3 bg-gray-50 rounded-md border-l-4 border-blue-500 shadow-sm";
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
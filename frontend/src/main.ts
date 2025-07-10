import './style.css'

const msg = "User Management System";

if (typeof document !== "undefined") {
  const backendUrl = "https://localhost:3000";
  function loadMainPage() {
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

  const userEmail = document.createElement("input");
  userEmail.type = "email";
  userEmail.placeholder = "Enter user email";
  userEmail.className = "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  formContainer.appendChild(userEmail);

  const userPassword = document.createElement("input");
  userPassword.type = "password";
  userPassword.placeholder = "Enter user password";
  userPassword.className = "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  formContainer.appendChild(userPassword);

  const addUser = document.createElement("button");
  addUser.textContent = "Add User";
  addUser.className = "w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 ease-in-out transform hover:scale-105";
  formContainer.appendChild(addUser);

  const login = document.createElement("button");
  login.textContent = "Login";
  login.className = "w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 ease-in-out transform hover:scale-105";
  formContainer.appendChild(login);

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

  function loadUsers() {
    fetch(`${backendUrl}/api/users`)
      .then((res) => res.json())
      .then((users) => {
        userList.innerHTML = "";
        users.forEach((user: any) => {
          const li = document.createElement("li");
          const userN = document.createElement("p");
          userN.textContent = `User Name: ${user.name}`;
          const userI = document.createElement("p");
          userI.textContent = `User Info: ${user.info ? `${user.info}` : ""}`;
          const userE = document.createElement("p");
          userE.textContent = `User Email: ${user.email}`;
          const userP = document.createElement("p");
          userP.textContent = `User Password: ${user.password}`;
          [userN, userI, userE, userP].forEach(p => {
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

    loadUsers();
    addUser.addEventListener("click", () => {
    const name = userName.value.trim();
    const info = userInfo.value.trim();
    const email = userEmail.value.trim();
    const password = userPassword.value.trim();
    
    if (!name) return alert("Please enter a name");
    if (!info) return alert("Please enter some user information");
    if (!email) return alert("Please enter a email");
    if (!password) return alert("Please enter a password");

    const userData = {
      name: name,
      info: info,
      email: email,
      password: password,
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
        userEmail.value = "";
        userPassword.value = "";
        loadUsers();
      })
      .catch((err) => {
        alert(`Error adding user: ${err.message}`);
        console.error("Error adding user:", err);
      });
  });

  login.addEventListener("click", () => {
    renderLoginPage();
  });
  }

  loadMainPage();

  function renderLoginPage() {
    const app = document.querySelector<HTMLDivElement>('#app');
    if (!app) return;

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
    email.type = "email";
    email.placeholder = "Email";
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

      if (!credentialEmail) return alert("Please fill with a Email");
      if (!credentialPassword) return alert("Please fill with a Password");

      const credentials = {
        email: credentialEmail,
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
          alert(`Login successful with ${credentialEmail}`);
          console.log("Login successful:", credentialEmail);
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
}
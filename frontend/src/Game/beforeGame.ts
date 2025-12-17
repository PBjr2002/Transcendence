export function lobbyView(): string {
  return `
    <div class="flex items-center justify-center min-h-screen">
      <div
        id="lobbyMenu"
        class="bg-white rounded-3xl p-8 w-96 opacity-0 scale-75 transform transition-all duration-500 shadow-2xl"
      >
        <h1 class="text-2xl font-bold text-center text-blue-600 mb-6">
          Air Hockey Lobby
        </h1>

        <div class="mb-4">
          <label class="block text-black font-semibold mb-1">Paddle Color</label>
          <input type="color" class="w-full h-10 rounded-lg border" />
        </div>

        <button
          id="matchmakingBtn"
          class="w-full mb-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg transition"
        >
          Matchmaking
        </button>

        <div class="mb-4">
          <label class="block text-black font-semibold mb-1">Players Online</label>
          <ul class="bg-gray-50 border text-black rounded-lg max-h-24 overflow-y-auto">
            <li class="px-3 py-1 hover:bg-blue-100">Alice</li>
            <li class="px-3 py-1 hover:bg-blue-100">Bob</li>
            <li class="px-3 py-1 hover:bg-blue-100">Charlie</li>
          </ul>
        </div>

        <div class="mb-4">
          <label class="block text-black font-semibold mb-1">Power-Ups</label>
          ${[0,1,2].map(() => `
            <select class="w-full text-black mb-2 p-2 border rounded-lg powerup">
              <option>Select Power-Up</option>
              <option>Speed</option>
              <option>Shield</option>
              <option>Double Puck</option>
            </select>
          `).join("")}
        </div>

        <div class="flex items-center justify-between">
          <span class="font-semibold text-black">Enable Power-Ups</span>
          <button
            id="togglePowerUps"
            class="bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2 rounded-lg transition"
          >
            ON
          </button>
        </div>
      </div>
    </div>
  `;
}

export function initLobby() {
  const menu = document.getElementById("lobbyMenu")!;
  const toggleBtn = document.getElementById("togglePowerUps")!;
  const powerUps = document.querySelectorAll<HTMLSelectElement>(".powerup");

  // animação pop-up
  requestAnimationFrame(() => {
    menu.classList.remove("opacity-0", "scale-75");
    menu.classList.add("opacity-100", "scale-100");
  });

  let enabled = true;

  toggleBtn.addEventListener("click", () => {
    enabled = !enabled;

    powerUps.forEach(pu => pu.disabled = !enabled);

    toggleBtn.textContent = enabled ? "ON" : "OFF";
    toggleBtn.className =
      enabled
        ? "bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2 rounded-lg transition"
        : "bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-lg transition";
  });
}

const app = document.getElementById("app")!;

export function goToLobby() {
  app.innerHTML = lobbyView();
  initLobby();
}
const ACCESS_CODES = {
  "1234": "admin",    // Admin / Mariés (Theuriet & Naomi)
  "5678": "protocol"  // Agent du protocole (contrôle d'entrée uniquement)
};

export function loginWithCode(code) {
  const role = ACCESS_CODES[code.trim()] || null;
  if (!role) return null;
  localStorage.setItem("nuptia_role", role);
  return role;
}

export function getCurrentRole() {
  return localStorage.getItem("nuptia_role") || "guest";
}

export function logoutRole() {
  localStorage.removeItem("nuptia_role");
}

export function applyRolePermissions(role) {
  const isAdmin = role === "admin";
  const isProtocol = role === "protocol" || isAdmin;

  document.querySelectorAll('[data-role="admin"]').forEach((el) => {
    el.style.display = isAdmin ? "" : "none";
  });

  document.querySelectorAll('[data-role="protocol"]').forEach((el) => {
    el.style.display = isProtocol ? "" : "none";
  });
}

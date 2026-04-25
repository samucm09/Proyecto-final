// ===================== CONFIG =====================
const ADMIN_USER = "admin";
const ADMIN_PASS = "1234";


async function generarDescripcionIA(nombre) {
  try {
    const res = await fetch("http://localhost:3000/descripcion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ nombre })
    });

    const data = await res.json();

    console.log("RESPUESTA BACKEND:", data);

    if (!data || !data.descripcion) {
      return "Producto en alquiler";
    }

    return data.descripcion;

  } catch (error) {
    console.log("ERROR FRONT:", error);
    return "Producto en alquiler";
  }
}



// ===================== ESTADO =====================
let products = JSON.parse(localStorage.getItem("products")) || [
  { name: "Silla", price: 10, img: "https://via.placeholder.com/200", stock: 5 },
  { name: "Mesa", price: 25, img: "https://via.placeholder.com/200", stock: 3 },
  { name: "Carpa", price: 50, img: "https://via.placeholder.com/200", stock: 2 }
];

let historial = JSON.parse(localStorage.getItem("historial")) || [];
let cart = []; // se carga por usuario

// asegurar stock en todos
products.forEach(p => { if (p.stock === undefined) p.stock = 1; });
products.forEach(p => { 
  if (!p.desc || p.desc === "Producto en alquiler") {
    p.desc = "Sin descripción aún";
  }
});
localStorage.setItem("products", JSON.stringify(products));

// ===================== HELPERS =====================
function getCurrentUser() {
  return localStorage.getItem("currentUser");
}

function saveAll() {
  localStorage.setItem("products", JSON.stringify(products));
  localStorage.setItem("historial", JSON.stringify(historial));

  const user = getCurrentUser();
  if (user) {
    localStorage.setItem("cart_" + user, JSON.stringify(cart));
  }
}

function loadUserCart() {
  const user = getCurrentUser();
  if (!user) return;
  const saved = localStorage.getItem("cart_" + user);
  cart = saved ? JSON.parse(saved) : [];
}

// ===================== AUTH =====================
function register() {
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value.trim();

  if (!user || !pass) {
    alert("Completa todos los campos");
    return;
  }

  // multi-usuarios
  let users = JSON.parse(localStorage.getItem("users")) || [];
  if (users.find(u => u.user === user)) {
    alert("Ese usuario ya existe ❌");
    return;
  }

  users.push({ user, pass });
  localStorage.setItem("users", JSON.stringify(users));

  alert("Usuario registrado ✅");
}

function login() {
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value.trim();

  localStorage.setItem("currentUser", user);

  // ADMIN
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    localStorage.setItem("admin", "true");
    document.getElementById("auth").classList.add("hidden");
    document.getElementById("adminPanel").classList.remove("hidden");
    renderAdminProducts();
    return;
  }

  // USUARIOS
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const ok = users.find(u => u.user === user && u.pass === pass);

  if (!ok) {
    alert("Usuario o contraseña incorrectos ❌");
    return;
  }

  localStorage.setItem("logged", "true");

  document.getElementById("auth").classList.add("hidden");
  document.getElementById("main").classList.remove("hidden");

  loadUserCart();
  showProducts();
  renderCart();
}

window.onload = function () {
  if (localStorage.getItem("admin") === "true") {
    document.getElementById("auth").classList.add("hidden");
    document.getElementById("adminPanel").classList.remove("hidden");
    renderAdminProducts();
    return;
  }

  if (localStorage.getItem("logged") === "true") {
    document.getElementById("auth").classList.add("hidden");
    document.getElementById("main").classList.remove("hidden");

    loadUserCart();
    showProducts();
    renderCart();
  }
};

function logout() {
  localStorage.removeItem("logged");
  localStorage.removeItem("admin");
  localStorage.removeItem("currentUser");
  location.reload();
}

// ===================== PRODUCTOS =====================
function showProducts() {
  const container = document.getElementById("products");
  container.innerHTML = "";

  products.forEach((p, i) => {
    container.innerHTML += `
      <div class="card">
        <img src="${p.img}">
        <h3>${p.name}</h3>
        <p>${p.desc ? p.desc : "Producto en alquiler"}</p>
        <p>$${p.price}</p>
        <p>Disponibles: ${p.stock}</p>

        ${
          p.stock > 0
            ? `<button onclick="addToCart(${i})">Alquilar</button>`
            : `<button disabled style="background:red;">Agotado</button>`
        }
      </div>
    `;
  });
}

// ===================== CARRITO =====================
function addToCart(i) {
  const p = products[i];

  if (p.stock <= 0) {
    alert("No hay disponibles ❌");
    return;
  }

  // fecha límite (3 días)
  let limite = new Date();
  limite.setDate(limite.getDate() + 3);

  p.stock--;

  const item = cart.find(x => x.name === p.name);
  if (item) {
    item.quantity++;
  } else {
    cart.push({
      name: p.name,
      price: p.price,
      quantity: 1,
      fechaLimite: limite.toLocaleDateString()
    });
  }

  historial.push({
    usuario: getCurrentUser(),
    producto: p.name,
    accion: "alquilado",
    fecha: new Date().toLocaleString()
  });

  saveAll();
  renderCart();
  showProducts();
}

function increase(i) {
  const item = cart[i];
  const p = products.find(x => x.name === item.name);

  if (!p || p.stock <= 0) {
    alert("No hay más disponibles ❌");
    return;
  }

  p.stock--;
  item.quantity++;

  saveAll();
  renderCart();
  showProducts();
}

function decrease(i) {
  const item = cart[i];
  const p = products.find(x => x.name === item.name);

  if (p) p.stock++;

  item.quantity--;

  if (item.quantity <= 0) {
    cart.splice(i, 1);
  }

  saveAll();
  renderCart();
  showProducts();
}

function devolverUno(i) {
  const item = cart[i];
  const p = products.find(x => x.name === item.name);

  if (p) p.stock++;

  item.quantity--;

  if (item.quantity <= 0) {
    cart.splice(i, 1);
  }

  historial.push({
    usuario: getCurrentUser(),
    producto: item.name,
    accion: "devuelto",
    fecha: new Date().toLocaleString()
  });

  saveAll();
  renderCart();
  showProducts();
}

function renderCart() {
  const list = document.getElementById("cart");
  const totalText = document.getElementById("total");
  const count = document.getElementById("cart-count");

  list.innerHTML = "";

  let total = 0;
  let totalItems = 0;

  cart.forEach((item, i) => {
    total += item.price * item.quantity;
    totalItems += item.quantity;

    list.innerHTML += `
      <li>
        ${item.name} - $${item.price} x${item.quantity}
        <br>
        <small>Devuelve antes de: ${item.fechaLimite}</small>

        <div>
          <button onclick="decrease(${i})">➖</button>
          <button onclick="increase(${i})">➕</button>
          <button onclick="devolverUno(${i})">🔄</button>
        </div>
      </li>
    `;
  });

  totalText.innerText = "Total: $" + total;
  count.innerText = totalItems;
}

// ===================== ADMIN =====================
function renderAdminProducts() {
  const container = document.getElementById("adminProducts");
  container.innerHTML = "";

  products.forEach((p, i) => {
    container.innerHTML += `
      <div class="card">
        <h3>${p.name}</h3>
        <p>$${p.price}</p>
        <p>Stock: ${p.stock}</p>

        <button onclick="adminAddStock(${i})">➕ Stock</button>
        <button onclick="adminDelete(${i})">🗑️</button>
      </div>
    `;
  });
}

function adminAddStock(i) {
  const n = parseInt(prompt("¿Cuánto agregar?"));
  if (isNaN(n)) return;

  products[i].stock += n;
  saveAll();
  renderAdminProducts();
  showProducts();
}

function adminDelete(i) {
  products.splice(i, 1);
  saveAll();
  renderAdminProducts();
  showProducts();
}


async function adminAddProduct() {
  try {
    const name = document.getElementById("adminName").value.trim();
    const price = Number(document.getElementById("adminPrice").value);
    const img = document.getElementById("adminImg").value.trim();

    if (!name || !price || !img) {
      alert("Completa todo ❌");
      return;
    }

    console.log("GENERANDO IA...");

    let desc = await generarDescripcionIA(name);

    console.log("DESCRIPCIÓN FINAL:", desc);

    products.push({
      name,
      price,
      img,
      stock: 1,
      desc
    });

    saveAll();
    renderAdminProducts();
    showProducts();

    alert("Producto agregado con IA ✅");

  } catch (error) {
    console.log("ERROR ADD PRODUCT:", error);
    alert("Error agregando producto ❌");
  }
}

// ===================== HISTORIAL =====================
function verHistorial() {
  let txt = "📜 HISTORIAL\n\n";

  historial.forEach(h => {
    txt += `${h.usuario} - ${h.producto} - ${h.accion} - ${h.fecha}\n`;
  });

  alert(txt);
}
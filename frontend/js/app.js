const API_BASE = "http://127.0.0.1:8000";
let currentFlightId = null;
let selectedSeats = [];

function openAuthModal() { document.getElementById('auth-modal').style.display = 'block'; }
function closeAuthModal() { document.getElementById('auth-modal').style.display = 'none'; }
window.onclick = function(event) { if (event.target == document.getElementById('auth-modal')) closeAuthModal(); }

function switchAuthTab(tab) {
    if (tab === 'login') {
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('tab-login').classList.add('active');
        document.getElementById('tab-register').classList.remove('active');
    } else {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
        document.getElementById('tab-login').classList.remove('active');
        document.getElementById('tab-register').classList.add('active');
    }
}

function scrollToSection(id) { document.getElementById(id).scrollIntoView({ behavior: 'smooth' }); }

let currentLang = "en";
function toggleLanguage() {
    currentLang = currentLang === "en" ? "bn" : "en";
    document.getElementById("lang-toggle").innerText = currentLang === "en" ? "🌐 বাংলা" : "🌐 English";
    document.querySelectorAll("[data-en]").forEach(el => { el.innerText = el.getAttribute(`data-${currentLang}`); });
}

function checkAuth() {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    
    const heroSection = document.getElementById("hero-section");
    const heroPanelTitle = document.getElementById("hero-panel-title");
    
    if (token) {
        heroSection.classList.add("logged-in");
        heroPanelTitle.style.display = "block";
        document.getElementById("nav-login-btn").style.display = "none";
        document.getElementById("logout-btn").style.display = "block";
        document.getElementById("hero-buttons").style.display = "none";
        document.getElementById("public-section").style.display = "none";
        
        if (role === "admin") {
            heroPanelTitle.innerText = "ADMIN PANEL";
            document.getElementById("admin-section").style.display = "block";
            document.getElementById("customer-section").style.display = "none";
            loadAdminFlightsByDate();
            loadAllBookings();
        } else {
            heroPanelTitle.innerText = "CUSTOMER PANEL";
            document.getElementById("customer-section").style.display = "block";
            document.getElementById("admin-section").style.display = "none";
            searchCustomerFlights();
            loadMyBookings();
        }
    } else {
        heroSection.classList.remove("logged-in");
        heroPanelTitle.style.display = "none";
        document.getElementById("nav-login-btn").style.display = "block";
        document.getElementById("logout-btn").style.display = "none";
        document.getElementById("hero-buttons").style.display = "flex";
        document.getElementById("public-section").style.display = "grid";
        document.getElementById("admin-section").style.display = "none";
        document.getElementById("customer-section").style.display = "none";
        document.getElementById("seat-selection-section").style.display = "none";
        searchPublicFlights();
    }
}

async function register() {
    const name = document.getElementById("reg-name").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
    const role = document.getElementById("reg-role").value;
    const res = await fetch(`${API_BASE}/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role })
    });
    if (res.ok) {
        document.getElementById("auth-msg").innerText = "Registration successful! Please login.";
        document.getElementById("auth-msg").style.color = "green";
        switchAuthTab('login');
    } else {
        document.getElementById("auth-msg").innerText = "Registration failed.";
        document.getElementById("auth-msg").style.color = "red";
    }
}

async function login() {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const res = await fetch(`${API_BASE}/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    
    if (res.ok) {
        const data = await res.json();
        const payload = JSON.parse(atob(data.access_token.split('.')[1]));
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("role", payload.role);
        closeAuthModal();
        checkAuth();
    } else {
        document.getElementById("auth-msg").innerText = "Invalid credentials!";
        document.getElementById("auth-msg").style.color = "red";
    }
}

function logout() { localStorage.clear(); checkAuth(); }

async function fetchAllFlights() {
    try { const res = await fetch(`${API_BASE}/flights`); return await res.json(); } catch (e) { return []; }
}

async function searchPublicFlights() {
    try {
        const query = document.getElementById("search-query").value.toLowerCase().trim();
        const dateQuery = document.getElementById("search-date").value;
        const flights = await fetchAllFlights();
        const filtered = flights.filter(f => {
            const matchText = (f.origin||"").toLowerCase().includes(query) || (f.destination||"").toLowerCase().includes(query) || (f.flight_number||"").toLowerCase().includes(query);
            const matchDate = dateQuery ? (f.departure_time||"").includes(dateQuery) : true;
            return matchText && matchDate;
        });
        renderFlights(filtered, "public-flight-list", "public");
    } catch (e) { document.getElementById("public-flight-list").innerHTML = `<div class="not-found-msg">⚠️ Server error!</div>`; }
}

async function searchCustomerFlights() {
    const query = document.getElementById("cust-search").value.toLowerCase();
    const flights = await fetchAllFlights();
    const filtered = query ? flights.filter(f => (f.origin||"").toLowerCase().includes(query) || (f.destination||"").toLowerCase().includes(query) || (f.flight_number||"").toLowerCase().includes(query)) : flights;
    renderFlights(filtered, "customer-flight-list", "customer");
}

function renderFlights(flights, listId, role) {
    const list = document.getElementById(listId);
    list.innerHTML = "";
    if(flights.length === 0) { list.innerHTML = `<div class="not-found-msg">🚫 No flights found!</div>`; return; }

    flights.forEach(f => {
        const li = document.createElement("li");
        const dep = f.departure_time || f.departureTime || "";
        const arr = f.arrival_time || f.arrivalTime || "";
        li.innerHTML = `
            <div style="width: 100%;">
                <strong style="font-size: 1.2rem;">${f.flight_number}</strong> <br>
                <small>🛫 <strong>From:</strong> ${f.origin} ➡️ 🛬 <strong>To:</strong> ${f.destination}</small> <br>
                <hr style="border: 0.5px dashed #cbd5e1; margin: 8px 0;">
                <small style="color:#0250c5; font-weight:bold; display: block; line-height: 1.5;">
                    🟢 Dep: ${dep ? new Date(dep).toLocaleString() : 'N/A'} <br>
                    🔴 Arr: ${arr ? new Date(arr).toLocaleString() : 'N/A'}
                </small>
            </div>
        `;
        if (role === "customer") {
            const btn = document.createElement("button");
            btn.className = "btn-primary"; btn.innerText = "Book Seats"; btn.style.marginLeft = "15px";
            btn.onclick = () => openSeatSelection(f);
            li.appendChild(btn);
        }
        list.appendChild(li);
    });
}

function openSeatSelection(flight) {
    currentFlightId = flight.id; selectedSeats = [];
    document.getElementById("seat-selection-section").style.display = "block";
    document.getElementById("selected-flight-info").innerText = `Flight: ${flight.flight_number} | ${flight.origin} to ${flight.destination}`;
    
    const seatMap = document.getElementById("seat-map"); seatMap.innerHTML = "";
    const rows = 10; const cols = ['A', 'B', 'C', 'D'];
    for(let r=1; r<=rows; r++) {
        for(let c=0; c<4; c++) {
            let seatNo = `${r}${cols[c]}`; let isBooked = Math.random() < 0.3; 
            let div = document.createElement("div"); div.className = `seat ${isBooked ? 'booked' : 'available'}`; div.innerText = seatNo;
            if(!isBooked) { div.onclick = () => toggleSeat(div, seatNo); }
            seatMap.appendChild(div);
        }
    }
    scrollToSection("seat-selection-section");
}

function toggleSeat(seatElement, seatNo) {
    if (selectedSeats.includes(seatNo)) { selectedSeats = selectedSeats.filter(s => s !== seatNo); seatElement.classList.remove("selected"); } 
    else { selectedSeats.push(seatNo); seatElement.classList.add("selected"); }
}

async function confirmBooking() {
    if (selectedSeats.length === 0) return alert("Please select at least one seat!");
    const res = await fetch(`${API_BASE}/bookings`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ flight_id: currentFlightId, seat_count: selectedSeats.length })
    });
    if (res.ok) {
        alert(`Successfully booked ${selectedSeats.length} seats!`);
        document.getElementById("seat-selection-section").style.display = "none";
        loadMyBookings();
    } else { alert("Error booking flight."); }
}

async function loadMyBookings() {
    try {
        const res = await fetch(`${API_BASE}/bookings/me`, { headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` } });
        const flights = await fetchAllFlights(); 
        const list = document.getElementById("my-bookings-list"); list.innerHTML = "";
        
        if (res.ok) {
            const bookings = await res.json();
            if(bookings.length === 0) { list.innerHTML = "<p>No bookings yet.</p>"; return; }
            bookings.forEach(b => {
                const matchedFlight = flights.find(f => f.id === b.flight_id);
                const flightNum = matchedFlight ? matchedFlight.flight_number : "Unknown Flight";
                const li = document.createElement("li");
                li.innerHTML = `<div style="width: 100%;">Booking #${b.id} | Flight: <strong style="color: #0250c5; font-size: 1.1rem;">${flightNum}</strong> <br> Seats Booked: <strong>${b.seat_count || 1}</strong> <br> Status: <span style="color: green; font-weight: bold;">${(b.status || "Confirmed").toUpperCase()}</span></div>`;
                list.appendChild(li);
            });
        }
    } catch (e) {}
}

async function addFlight() {
    const flightData = {
        flight_number: document.getElementById("new-flight-num").value,
        origin: document.getElementById("new-origin").value,
        destination: document.getElementById("new-dest").value,
        departure_time: document.getElementById("new-dep").value,
        arrival_time: document.getElementById("new-arr").value
    };
    const res = await fetch(`${API_BASE}/flights`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify(flightData)
    });
    if (res.ok) { document.getElementById("admin-msg").innerText = "Added successfully!"; document.getElementById("admin-msg").style.color = "green"; loadAdminFlightsByDate(); } 
    else { document.getElementById("admin-msg").innerText = "Error adding flight."; }
}

async function loadAdminFlightsByDate() {
    const dateQuery = document.getElementById("admin-search-date").value;
    const flights = await fetchAllFlights();
    const filtered = dateQuery ? flights.filter(f => (f.departure_time || "").includes(dateQuery)) : flights;
    const list = document.getElementById("admin-flight-list"); list.innerHTML = "";
    if(filtered.length === 0) { list.innerHTML = `<div class="not-found-msg">No flights found.</div>`; return; }
    
    filtered.forEach(f => {
        const li = document.createElement("li");
        const dep = f.departure_time || ""; const arr = f.arrival_time || "";
        li.innerHTML = `<div style="width: 100%;"><strong style="font-size: 1.1rem;">${f.flight_number}</strong> <br><small>🛫 ${f.origin} ➡️ 🛬 ${f.destination}</small> <br><small style="color:#0250c5; font-weight:bold; display: block; margin-top: 5px;">🟢 Dep: ${dep ? new Date(dep).toLocaleString() : 'N/A'} <br>🔴 Arr: ${arr ? new Date(arr).toLocaleString() : 'N/A'}</small></div><button onclick="deleteFlight(${f.id})" style="background: red; color: white; padding: 5px 10px; border: none; border-radius: 5px; cursor: pointer; margin-left: 15px;">🗑️ Delete</button>`;
        list.appendChild(li);
    });
}

async function deleteFlight(flightId) {
    if(!confirm("Are you sure?")) return;
    const res = await fetch(`${API_BASE}/flights/${flightId}`, { method: "DELETE", headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` } });
    if(res.ok) { alert("Deleted!"); loadAdminFlightsByDate(); } else { alert("Failed to delete."); }
}

async function loadAllBookings() {
    try {
        const res = await fetch(`${API_BASE}/bookings`, { headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` } });
        const flights = await fetchAllFlights(); 
        const list = document.getElementById("admin-bookings-list"); list.innerHTML = "";
        
        if (res.ok) {
            const bookings = await res.json();
            if(bookings.length === 0) { list.innerHTML = "<p>No bookings yet.</p>"; return; }
            bookings.forEach(b => {
                const matchedFlight = flights.find(f => f.id === b.flight_id);
                const f_num = matchedFlight ? matchedFlight.flight_number : "Unknown";
                const li = document.createElement("li");
                li.innerHTML = `<div style="width: 100%;">Booking #${b.id} | Flight: <strong style="color: #0250c5; font-size: 1.1rem;">${f_num}</strong> <br> Seats Booked: <strong>${b.seat_count || 1}</strong></div>`;
                list.appendChild(li);
            });
        }
    } catch (e) {}
}

async function trackFlight() {
    const flightNum = document.getElementById("track-id").value.trim().toUpperCase();
    const resultBox = document.getElementById("track-result");
    if(!flightNum) return;
    const res = await fetch(`${API_BASE}/track/${flightNum}`);
    if (res.ok) {
        const f = await res.json(); resultBox.style.display = "block"; resultBox.style.background = "#f0fdf4";
        resultBox.innerHTML = `<strong>✈️ Found:</strong> ${f.flight_number} <br><strong>Route:</strong> ${f.origin} ➡️ ${f.destination} <br><strong>Status:</strong> <span style="color:blue;">${f.status.toUpperCase()}</span> <br><strong>Departure:</strong> ${new Date(f.departure_time).toLocaleString()}`;
    } else { resultBox.style.display = "block"; resultBox.style.background = "#fef2f2"; resultBox.innerHTML = `<strong style="color:red;">Cannot find flight!</strong>`; }
}

async function trackFlightAdmin() {
    const flightNum = document.getElementById("admin-track-id").value.trim().toUpperCase();
    const resultBox = document.getElementById("admin-track-result");
    if(!flightNum) return;
    const res = await fetch(`${API_BASE}/track/${flightNum}`);
    if (res.ok) {
        const f = await res.json(); const availableSeats = (f.total_seats || 40) - (f.booked_seats || 0);
        resultBox.style.display = "block"; resultBox.style.background = "#f0fdf4";
        resultBox.innerHTML = `<strong>✈️ Flight:</strong> ${f.flight_number} <br><strong>Route:</strong> ${f.origin} ➡️ ${f.destination} <br><hr style="border-top: 1px dashed #ccc; margin: 8px 0;"><strong style="color:#0250c5;">Total Seats:</strong> ${f.total_seats || 40} <br><strong style="color:green;">Available Seats:</strong> ${availableSeats}`;
    } else { resultBox.style.display = "block"; resultBox.style.background = "#fef2f2"; resultBox.innerHTML = `<strong style="color:red;">Cannot find flight!</strong>`; }
}

window.onload = checkAuth;

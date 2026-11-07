// ==========================================
// 1. SELECT DOM ELEMENTS
// ==========================================
const searchForm = document.querySelector('#search-form');
const cityInput = document.querySelector('#city-input');
const searchError = document.querySelector('#search-error');
const searchButton = searchForm.querySelector('.search-button');

const cityTitle = document.querySelector('#city-title');

// Current weather elements
const currentIcon = document.querySelector('#current-icon');
const currentTemp = document.querySelector('#current-temperature');
const currentCondition = document.querySelector('#current-condition');
const currentRain = document.querySelector('#current-rain');
const currentHumidity = document.querySelector('#current-humidity');
const currentWind = document.querySelector('#current-wind');

// Forecast containers
const hourlyList = document.querySelector('#hourly-list');
const weeklyList = document.querySelector('#weekly-list');

// Unit switch
const unitButtons = document.querySelectorAll('.unit-button');
let currentUnit = 'C'; // Đơn vị mặc định là độ C
let currentRawData = null; // Lưu lại dữ liệu gọi từ API để hỗ trợ chuyển °C / °F mà không cần fetch lại
let currentActiveCity = "Hanoi"; 
let currentLat = 21.0285;  
let currentLon = 105.8542;

// ==========================================
// 2. HELPER FUNCTIONS (ICON & CONDITION)
// ==========================================
// Chuyển weather_code thành Icon và Mô tả
function getWeatherMeta(code) {
    if (code === 0) return { icon: "☀️", text: "Clear sky" };
    if (code === 1) return { icon: "🌤️", text: "Mainly clear" };
    if (code === 2) return { icon: "⛅", text: "Partly cloudy" };
    if (code === 3) return { icon: "☁️", text: "Overcast" };
    if (code >= 45 && code <= 48) return { icon: "🌫️", text: "Foggy" };
    if (code >= 51 && code <= 67) return { icon: "🌧️", text: "Rainy" };
    if (code >= 71 && code <= 77) return { icon: "❄️", text: "Snowy" };
    if (code >= 80 && code <= 82) return { icon: "🌦️", text: "Rain showers" };
    if (code >= 95) return { icon: "⛈️", text: "Thunderstorm" };
    return { icon: "🌡️", text: "Unknown" };
}

// Chuyển đổi nhiệt độ C -> F nếu cần
function formatTemp(tempC) {
    if (currentUnit === 'F') {
        const tempF = Math.round((tempC * 9 / 5) + 32);
        return `${tempF}°`;
    }
    return `${Math.round(tempC)}°`;
}

// ==========================================
// 3. FETCH DATA FROM API
// ==========================================
async function getWeatherData(cityName) {
    // Hiệu ứng Đang tải (Loading state)
    searchButton.textContent = "Searching...";
    searchButton.disabled = true;
    searchError.textContent = "";

    try {
        // Step 1: Lấy tọa độ từ Geocoding API
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            searchError.textContent = "City not found. Please try another name.";
            resetDashboardToDefault();
            return;
        }

        const { latitude, longitude, name, country } = geoData.results[0];
        const fullLocationName = country ? `${name}, ${country}` : name;
        currentActiveCity = fullLocationName;
        currentLat = latitude;
        currentLon = longitude;

        // Step 2: Lấy dữ liệu thời tiết (Current, Hourly, Daily)
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}`
            + `&current=temperature_2m,relative_humidity_2m,rain,wind_speed_10m,weather_code`
            + `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m,weather_code`
            + `&daily=weather_code,temperature_2m_max,temperature_2m_min`
            + `&timezone=auto`;

        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();

        // Lưu dữ liệu vào biến toàn cục và Render ra giao diện
        currentRawData = { weatherData, fullLocationName };
        renderDashboard(weatherData, fullLocationName);

    } catch (error) {
        console.error("API Error:", error);
        searchError.textContent = "Connection error. Please try again.";
    } finally {
        searchButton.textContent = "Search";
        searchButton.disabled = false;
    }
}

// ==========================================
// 4. RENDER DATA TO UI
// ==========================================
function renderDashboard(data, locationName) {
    cityTitle.textContent = locationName;

    // --- A. Render Current Weather ---
    const current = data.current;
    const currentMeta = getWeatherMeta(current.weather_code);

    currentIcon.textContent = currentMeta.icon;
    currentTemp.textContent = formatTemp(current.temperature_2m);
    currentCondition.textContent = currentMeta.text;

    currentRain.textContent = `${current.rain} mm`;
    currentHumidity.textContent = `${current.relative_humidity_2m}%`;
    currentWind.textContent = `${current.wind_speed_10m} km/h`;

    // --- B. Render Hourly Forecast (Next 5 Hours) ---
    hourlyList.innerHTML = "";
    // Lấy mốc giờ hiện tại từ mốc thời gian của API
    const currentHourIndex = data.hourly.time.findIndex(timeStr => new Date(timeStr) >= new Date()) || 0;

    for (let i = currentHourIndex; i < currentHourIndex + 5; i++) {
        if (!data.hourly.time[i]) break;

        const timeStr = data.hourly.time[i];
        const hour = new Date(timeStr).getHours().toString().padStart(2, '0') + ":00";
        const temp = formatTemp(data.hourly.temperature_2m[i]);
        const code = data.hourly.weather_code[i];
        const meta = getWeatherMeta(code);
        const rainProb = data.hourly.precipitation_probability ? data.hourly.precipitation_probability[i] : 0;
        const humidity = data.hourly.relative_humidity_2m[i];
        const wind = data.hourly.wind_speed_10m[i];

        const hourlyItem = document.createElement('div');
        hourlyItem.className = 'hourly-item';
        hourlyItem.innerHTML = `
            <p class="hourly-time">${hour}</p>
            <div class="hourly-icon">${meta.icon}</div>
            <p class="hourly-temp">${temp}</p>
            <p class="hourly-condition">${meta.text}</p>
            <div class="hourly-details">
                <small>Rain ${rainProb}%</small>
                <small>Humidity ${humidity}%</small>
                <small>Wind ${wind} km/h</small>
            </div>
        `;
        hourlyList.appendChild(hourlyItem);
    }

    // --- C. Render 7-Day Forecast ---
    weeklyList.innerHTML = "";
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
        if (!data.daily.time[i]) break;

        const dateObj = new Date(data.daily.time[i]);
        const dayName = i === 0 ? "Today" : daysOfWeek[dateObj.getDay()];
        const maxTemp = formatTemp(data.daily.temperature_2m_max[i]);
        const minTemp = formatTemp(data.daily.temperature_2m_min[i]);
        const meta = getWeatherMeta(data.daily.weather_code[i]);

        const weeklyItem = document.createElement('div');
        weeklyItem.className = 'weekly-item';
        weeklyItem.innerHTML = `
            <p class="weekly-day">${dayName}</p>
            <div class="weekly-icon">${meta.icon}</div>
            <p class="weekly-temps">
                <strong>${maxTemp}</strong> <span>${minTemp}</span>
            </p>
            <p class="weekly-condition">${meta.text}</p>
        `;
        weeklyList.appendChild(weeklyItem);
    }
}

// ==========================================
// 5. EVENT LISTENERS
// ==========================================
// Bắt sự kiện Submit Form Tìm Kiếm
searchForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const cityName = cityInput.value.trim();

    if (cityName === "") {
        searchError.textContent = "Please enter a city name!";
        return;
    }

    getWeatherData(cityName);
    cityInput.value = "";
});

// Chuyển đổi đơn vị °C / °F
unitButtons.forEach(button => {
    button.addEventListener('click', function() {
        unitButtons.forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        });

        this.classList.add('active');
        this.setAttribute('aria-pressed', 'true');
        currentUnit = this.dataset.unit;

        // Nếu đã có dữ liệu thời tiết, render lại giao diện theo đơn vị mới
        if (currentRawData) {
            renderDashboard(currentRawData.weatherData, currentRawData.fullLocationName);
        }
    });
});

// Tải dữ liệu mặc định ban đầu khi mở trang (Mặc định: Sydney)
// Tự động lấy vị trí thực tế khi vừa mở trang web
document.addEventListener('DOMContentLoaded', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            try {
                // Dùng dịch vụ bản đồ miễn phí để dịch tọa độ sang Tên thành phố & Quốc gia
                const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
                const res = await fetch(reverseUrl);
                const data = await res.json();
                
                const city = data.address.city || data.address.town || data.address.village || "My Location";
                const country = data.address.country || "";
                const fullLocationName = country ? `${city}, ${country}` : city;

                // Gọi trực tiếp API thời tiết bằng tọa độ GPS lấy được
                fetchWeatherDirectly(latitude, longitude, fullLocationName);
            } catch (e) {
                // Nếu lỗi mạng khi dịch tên, mặc định gọi tọa độ kèm tên chung
                fetchWeatherDirectly(latitude, longitude, "Current Location");
            }
        }, (error) => {
            // Nếu người dùng bấm "Block" (Từ chối) quyền định vị, tự động fallback về Hà Nội
            console.warn("Người dùng từ chối quyền định vị, chuyển về Hà Nội mặc định.");
            getWeatherData('Hanoi');
        });
    } else {
        // Trình duyệt cũ không hỗ trợ GPS thì mặc định Hà Nội
        getWeatherData('Hanoi');
    }
});

// Hàm hỗ trợ gọi thời tiết trực tiếp bằng vĩ độ/kinh độ GPS
async function fetchWeatherDirectly(latitude, longitude, locationName) {
    searchError.textContent = "";
    currentActiveCity = locationName;
    currentLat = latitude;
    currentLon = longitude;
    try {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}`
            + `&current=temperature_2m,relative_humidity_2m,rain,wind_speed_10m,weather_code`
            + `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m,weather_code`
            + `&daily=weather_code,temperature_2m_max,temperature_2m_min`
            + `&timezone=auto`;

        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();

        currentRawData = { weatherData, fullLocationName: locationName };
        renderDashboard(weatherData, locationName);
    } catch (error) {
        console.error("GPS Weather Error:", error);
        getWeatherData('Hanoi'); // Lỗi thì quay về Hà Nội
    }
}

// Hàm đưa giao diện về trạng thái trống khi lỗi hoặc khởi tạo
function resetDashboardToDefault() {
    cityTitle.textContent = "No City Selected";
    
    // Reset Current Weather
    currentIcon.textContent = "❓";
    currentTemp.textContent = "--°";
    currentCondition.textContent = "No data available";
    currentRain.textContent = "-- mm";
    currentHumidity.textContent = "--%";
    currentWind.textContent = "-- km/h";

    // Reset Hourly List
    hourlyList.innerHTML = `<p style="text-align: center; width: 100%; color: #94a3b8; padding: 20px;">Please search for a valid city.</p>`;

    // Reset Weekly List
    weeklyList.innerHTML = `<p style="text-align: center; width: 100%; color: #94a3b8; padding: 20px;">No forecast data available.</p>`;
}

const API_BASE_URL = "http://127.0.0.1:8000/api";

async function fetchSearchHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/history`);
        if (!response.ok) throw new Error("Lỗi khi tải lịch sử");
        const data = await response.json();

        // Gọi hàm hiển thị giao diện hoặc vẽ biểu đồ
        renderHistoryTable(data);
        renderWeatherChart(data); // Nếu có dùng Chart.js
    } catch (error) {
        console.error("Fetch error:", error);
    }
}

async function saveSearchRecord(cityName, temp, weatherCondition) {
    try {
        const response = await fetch(`${API_BASE_URL}/history`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                city_name: cityName,
                temperature: temp,
                condition: weatherCondition
            })
        });
        if (response.ok) {
            fetchSearchHistory(); // Tải lại danh sách mới nhất
        }
    } catch (error) {
        console.error("Save error:", error);
    }
}

// --- XỬ LÝ AUTHENTICATION ---
function getAuthHeaders() {
    const token = localStorage.getItem("access_token");
    return token ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

async function handleRegister() {
    const username = document.getElementById("reg-username").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
    const agree_terms = document.getElementById("reg-terms").checked;

    if (!agree_terms) {
        showNotification("You must agree to the terms and conditions to register.", false);
        return;
    }

    try {
        const response = await fetch("http://127.0.0.1:8000/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password, agree_terms })
        });
        const data = await response.json();
        if (response.ok) {
            showNotification("Successfully registered! You can now log in.", true);
            
        } else {
            showNotification("Error: " + (data.detail||"Unsuccessful registration. Please try again."), false);
        }
    } catch (error) {
        console.error("Lỗi kết nối:", error);
    }
}

async function handleLogin() {
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    try {
        const response = await fetch("http://127.0.0.1:8000/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem("access_token", data.access_token);
            localStorage.setItem("username", data.username);
            localStorage.setItem("role", data.role);
            showNotification("Successfully logged in!", true);
            setTimeout(() => {checkAuthState();}, 1000); // Delay để người dùng thấy thông báo trước khi chuyển giao diện
            
        } else {
            showNotification("Error: " + (data.detail||"Failed to log in. Please try again."), false);
        }
    } catch (error) {
        console.error("Login error:", error);
        showNotification("Connection error. Please try again.", false);
    }
}

async function handleLogout() {
    try {
        await fetch("http://127.0.0.1:8000/api/auth/logout", {
            method: "POST",
            headers: getAuthHeaders()
        });
    } catch (e) {
        console.error(e);
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    showNotification("Logged out successfully.", true);
    checkAuthState();
}

// Hàm gửi yêu cầu quên mật khẩu qua Email
async function handleForgotPassword() {
    const email = document.getElementById("forgot-email").value;
    const msgBox = document.getElementById("forgot-message");

    if (!email) {
        msgBox.innerText = "Vui lòng nhập email của bạn!";
        msgBox.style.display = "block";
        msgBox.style.backgroundColor = "rgba(220, 53, 69, 0.2)";
        msgBox.style.color = "#f8d7da";
        return;
    }

    try {
        const response = await fetch("http://127.0.0.1:8000/api/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email })
        });
        const data = await response.json();
        
        msgBox.style.display = "block";
        if (response.ok) {
            msgBox.style.backgroundColor = "rgba(40, 167, 69, 0.2)";
            msgBox.style.color = "#d4edda";
            msgBox.innerText = data.message || "Email khôi phục đã được gửi thành công!";
        } else {
            msgBox.style.backgroundColor = "rgba(220, 53, 69, 0.2)";
            msgBox.style.color = "#f8d7da";
            msgBox.innerText = data.detail || "Không tìm thấy email này trong hệ thống.";
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

let resettingEmail="";
function switchView(viewName) {
    document.getElementById("view-login").style.display = "none";
    document.getElementById("view-register").style.display = "none";
    document.getElementById("view-forgot").style.display = "none";

    if (viewName === 'login') {
        document.getElementById("view-login").style.display = "block";
    } else if (viewName === 'register') {
        document.getElementById("view-register").style.display = "block";
    } else if (viewName === 'forgot') {
        document.getElementById("view-forgot").style.display = "block";
        // Reset về bước 1
        document.getElementById("forgot-step-1").style.display = "block";
        document.getElementById("forgot-step-2").style.display = "none";
        document.getElementById("forgot-message").style.display = "none";
    }
}

// Bước 1: Gửi yêu cầu lấy OTP
async function handleSendOtp() {
    const email = document.getElementById("forgot-email").value;
    const msgBox = document.getElementById("forgot-message");

    if (!email) {
        showCustomMsg(msgBox, "Please enter your email!", false);
        return;
    }

    try {
        const response = await fetch("http://127.0.0.1:8000/api/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email })
        });
        const data = await response.json();
        
        if (response.ok) {
            showCustomMsg(msgBox, data.message, true);
            
            // Gán email vào ô hiển thị ở Bước 2 để chống mất dữ liệu
            document.getElementById("reset-email-display").value = email;
            
            // Chuyển sang Bước 2 sau 1.5 giây
            setTimeout(() => {
                document.getElementById("forgot-step-1").style.display = "none";
                document.getElementById("forgot-step-2").style.display = "block";
                msgBox.style.display = "none";
            }, 1500);
        } else {
            showCustomMsg(msgBox, data.detail || "Email not found.", false);
        }
    } catch (error) {
        console.error("Error:", error);
        showCustomMsg(msgBox, "Connection error to server.", false);
    }
}

// Bước 2: Gửi OTP và Mật khẩu mới
async function handleResetPassword() {
    // Lấy trực tiếp email từ ô hiển thị cố định ở Bước 2
    const email = document.getElementById("reset-email-display").value;
    const otp = document.getElementById("reset-otp").value;
    const newPassword = document.getElementById("reset-new-password").value;
    const confirmPassword = document.getElementById("reset-confirm-password").value;
    const msgBox = document.getElementById("forgot-message");

    if (!otp || !newPassword || !confirmPassword) {
        showCustomMsg(msgBox, "Please fill in all fields!", false);
        return;
    }

    if (newPassword !== confirmPassword) {
        showCustomMsg(msgBox, "New passwords do not match!", false);
        return;
    }

    try {
        const response = await fetch("http://127.0.0.1:8000/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, otp: otp, new_password: newPassword })
        });
        const data = await response.json();

        if (response.ok) {
            showCustomMsg(msgBox, data.message, true);
            
            // Thành công -> Chờ 2 giây rồi quay về trang Đăng nhập
            setTimeout(() => {
                document.getElementById("forgot-step-2").style.display = "none";
                document.getElementById("forgot-step-1").style.display = "block";
                document.getElementById("forgot-email").value = "";
                document.getElementById("reset-otp").value = "";
                document.getElementById("reset-new-password").value = "";
                document.getElementById("reset-confirm-password").value = "";
                msgBox.style.display = "none";
                switchView('login');
            }, 2000);
        } else {
            showCustomMsg(msgBox, data.detail || "Invalid OTP or request failed.", false);
        }
    } catch (error) {
        console.error("Error:", error);
        showCustomMsg(msgBox, "Connection error to server.", false);
    }
}

// Hàm hỗ trợ hiển thị thông báo trạng thái màu sắc
function showCustomMsg(element, message, isSuccess) {
    element.innerText = message;
    element.style.display = "block";
    if (isSuccess) {
        element.style.backgroundColor = "rgba(40, 167, 69, 0.2)";
        element.style.color = "#d4edda";
        element.style.border = "1px solid #28a745";
    } else {
        element.style.backgroundColor = "rgba(220, 53, 69, 0.2)";
        element.style.color = "#f8d7da";
        element.style.border = "1px solid #dc3545";
    }
}

function checkAuthState() {
    const token = localStorage.getItem("access_token");
    const authContainer = document.getElementById("auth-container");
    const mainDashboard = document.getElementById("main-dashboard");

    if (token) {
        // Đã có token (Đã đăng nhập): Ẩn khung đăng nhập, HIỆN giao diện dashboard chính
        authContainer.style.display = "none";
        mainDashboard.style.display = "block";

        // Hiển thị tên user và role
        const usernameEl = document.getElementById("current-username");
        const roleEl = document.getElementById("current-role");
        if (usernameEl) usernameEl.innerText = localStorage.getItem("username") || "User";
        if (roleEl) roleEl.innerText = localStorage.getItem("role") || "user";

        // Tải dữ liệu cá nhân hóa của user đó
        loadFavorites();
        loadUserHistory();
    } else {
        // Chưa đăng nhập: HIỆN khung đăng nhập/đăng ký, ẨN toàn bộ dashboard chính
        authContainer.style.display = "block";
        mainDashboard.style.display = "none";
    }
}


function loadUserHistory() {
    // Tạm thời chưa dùng đến lịch sử tìm kiếm thì để trống ở đây
    console.log("Đang tải lịch sử tìm kiếm của user...");
}
// --- XỬ LÝ FAVORITE LOCATIONS ---
// Biến lưu tên thành phố đang tra cứu trên màn hình thời tiết

// 1. Tải danh sách yêu thích từ Database lên giao diện
async function loadFavorites() {
    const token = localStorage.getItem("access_token");
    if (!token) {
        const listContainer = document.getElementById("favorites-list");
        if (listContainer) {
            listContainer.innerHTML = `<p style="color: #ccc; font-size: 13px;">Vui lòng đăng nhập để xem danh sách yêu thích.</p>`;
        }
        return;
    }

    try {
        const response = await fetch("http://127.0.0.1:8000/api/favorites", {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            const favorites = await response.json();
            const listContainer = document.getElementById("favorites-list");
            listContainer.innerHTML = "";

            if (favorites.length === 0) {
                listContainer.innerHTML = `<p style="color: #ccc; font-size: 13px;">No favorite cities saved yet.</p>`;
                return;
            }

            favorites.forEach(fav => {
                const badge = document.createElement("div");
                badge.style.cssText = "background: rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 20px; display: flex; align-items: center; gap: 8px; color: white; font-size: 13px;";
                badge.innerHTML = `
                    <span style="cursor: pointer;" onclick="getWeatherData('${fav.city_name}')">${fav.city_name}</span>
                    <button onclick="removeFavorite(${fav.id})" style="background: transparent; border: none; color: #ff4d4d; cursor: pointer; font-weight: bold;">×</button>
                `;
                listContainer.appendChild(badge);
            });
        }
    } catch (error) {
        console.error("Error loading favorites:", error);
    }
}

// 2. Lưu thành phố hiện tại vào danh sách yêu thích
async function addCurrentCityToFavorites() {
    const token = localStorage.getItem("access_token");
    if (!token) {
        alert("You must be logged in to add favorites.");
        return;
    }

    // Kiểm tra kỹ lưỡng: Không phải undefined, không phải null, và phải là số hợp lệ (!isNaN)
    const cityName = (typeof currentActiveCity !== 'undefined' && currentActiveCity) ? currentActiveCity : "Hanoi";
    
    const lat = (typeof currentLat !== 'undefined' && currentLat !== null && !isNaN(currentLat)) ? currentLat : 21.0285; 
    const lon = (typeof currentLon !== 'undefined' && currentLon !== null && !isNaN(currentLon)) ? currentLon : 105.8542;

    console.log("Giá trị chuẩn bị gửi lên:", { cityName, lat, lon });
    
    try {
        const response = await fetch("http://127.0.0.1:8000/api/favorites", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` 
            },
            body: JSON.stringify({ 
                city_name: cityName, 
                latitude: lat, 
                longitude: lon 
            })
        });
        
        const data = await response.json();
        if (response.ok) {
            alert(data.message);
            loadFavorites(); // Tải lại danh sách sau khi thêm thành công
        } else {
            alert(data.detail || "Failed to add favorite.");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

// 3. Xóa địa điểm yêu thích
async function removeFavorite(favId) {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
        const response = await fetch(`http://127.0.0.1:8000/api/favorites/${favId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            loadFavorites(); // Tải lại danh sách sau khi xóa
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

// Gọi kiểm tra trạng thái đăng nhập ngay khi load trang
document.addEventListener("DOMContentLoaded", () => {
    checkAuthState();
});

// Hàm hiển thị thông báo đẹp mắt thay cho alert
function showNotification(message, isSuccess = true) {
    const msgBox = document.getElementById("auth-message");
    if (!msgBox) return;

    msgBox.innerText = message;
    msgBox.style.display = "block";
    
    // Tùy chỉnh màu sắc dựa vào thành công hay thất bại
    if (isSuccess) {
        msgBox.style.backgroundColor = "rgba(40, 167, 69, 0.2)";
        msgBox.style.color = "#d4edda";
        msgBox.style.border = "1px solid #28a745";
    } else {
        msgBox.style.backgroundColor = "rgba(220, 53, 69, 0.2)";
        msgBox.style.color = "#f8d7da";
        msgBox.style.border = "1px solid #dc3545";
    }

    // Tự động ẩn thông báo sau 3 giây
    setTimeout(() => {
        msgBox.style.display = "none";
    }, 3000);
}


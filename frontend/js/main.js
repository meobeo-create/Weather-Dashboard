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
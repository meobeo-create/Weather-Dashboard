const searchForm =document.querySelector('form');
const cityInput = document.querySelector('#city');
const currentCityName = document.querySelector('#current-city');
const currentTemp = document.querySelector('#current-temp');
const currentCondition = document.querySelector('#current-condition');
const currentFeels = document.querySelector('#current-feels');
const currentHumidity = document.querySelector('#current-humidity');
const currentWind = document.querySelector('#current-wind');
const errorMessage = document.querySelector('#error-message');
const dailyDate = document.querySelector('#daily-date');
const dailyTemp = document.querySelector('#daily-temp');
const dailyCondition = document.querySelector('#daily-condition');
const searchButton = searchForm.querySelector('button');
async function getWeatherData(cityName){
    searchButton.textContent = "Đang tải...";
    searchButton.disabled = true;
    try {
        errorMessage.textContent = "";
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${cityName}&count=1`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            errorMessage.textContent = "Không tìm thấy thành phố. Vui lòng thử lại.";
            currentCityName.textContent = "City Name";
            currentTemp.textContent = "Temperature: -- °C";
            currentCondition.textContent = "Weather condition: --";
            currentFeels.textContent = "Feels like: -- °C";
            currentHumidity.textContent = "Humidity: -- %";
            currentWind.textContent = "Wind speed: --";
            return;
        }
        const {latitude, longitude, name}=geoData.results[0];


        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code`;
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();
        updateUI(weatherData, name);
    } catch(error){
        console.error("Loi goi API", error);
        errorMessage.textContent ="Da xay ra loi ket noi may chu!";
    } finally {
        searchButton.textContent = "Tìm kiếm";
        searchButton.disabled = false;
    }
}
function updateUI(data, cityName){
    const current = data.current;
    errorMessage.textContent = "";
    currentCityName.textContent = cityName;
    currentTemp.textContent = `Temperature: ${current.temperature_2m} °C`;
    currentCondition.textContent = `Weather condition: ${getWeatherConditionText(current.weather_code)}`;
    currentFeels.textContent = `Feels like: ${current.apparent_temperature} °C`;
    currentHumidity.textContent = `Humidity: ${current.relative_humidity_2m} %`;
    currentWind.textContent = `Wind speed: ${current.wind_speed_10m} km/h`;
}

function getWeatherConditionText(code) {
    if (code === 0) return "Trời quang đãng (Clear sky)";
    if (code >= 1 && code <= 3) return "Có mây (Cloudy)";
    if (code >= 51 && code <= 67) return "Có mưa (Rainy)";
    if (code >= 71 && code <= 77) return "Có tuyết (Snow)";
    return "Bình thường (Normal)";
}

searchForm.addEventListener('submit', function(event){
    event.preventDefault(); 
    const cityName = cityInput.value.trim();
    if (cityName === "") {
        errorMessage.textContent = "Vui lòng nhập tên thành phố!";
        return;
    }
    getWeatherData(cityName);
    cityInput.value = "";
});



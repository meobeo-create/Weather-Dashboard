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

searchForm.addEventListener('submit', function(event){
    event.preventDefault();
    const cityName=cityInput.value.trim();
    if (cityName ===""){
        errorMessage.textContent="Vui lòng nhập tên thành phố!";
        return;
    } else {
        errorMessage.textContent="";
    }

    const mockWeatherData = {
    name: cityName,          // Lấy đúng tên thành phố người dùng vừa gõ vào
    temp: "28",              // Nhiệt độ mẫu
    condition: "Nắng nhẹ",   // Tình trạng mẫu
    feelsLike: "30",         // Cảm giác như
    humidity: "75",          // Độ ẩm
    wind: "12 km/h",         // Sức gió
    dailyDate: "Ngày mai (25/10)",
    dailyTemp: "27 - 31",
    dailyCondition: "Có mây"
    };

    currentCityName.textContent = mockWeatherData.name;
    currentTemp.textContent = `Temperature: ${mockWeatherData.temp} °C`;
    currentCondition.textContent = `Weather condition: ${mockWeatherData.condition}`;
    currentFeels.textContent = `Feels like: ${mockWeatherData.feelsLike} °C`;
    currentHumidity.textContent = `Humidity: ${mockWeatherData.humidity} %`;
    currentWind.textContent = `Wind speed: ${mockWeatherData.wind}`;
    dailyDate.textContent = `Date: ${mockWeatherData.dailyDate}`;
    dailyTemp.textContent=`Temperature: ${mockWeatherData.dailyTemp}  °C`;
    dailyCondition.textContent = `Weather condition: ${mockWeatherData.dailyCondition}`;

    cityInput.value="";
});

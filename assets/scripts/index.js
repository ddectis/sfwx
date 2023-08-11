//fetch this URL to get the forecast for the central grid location
const requestURL = "https://api.weather.gov/gridpoints/MTR/83,102/forecast" //this is for daily-level forecasts
const hourlyRequestUrl = `${requestURL}/hourly`
const weatherObjects = []; //an empty array to store the weather objects we'll create in Pull Local Weather



//FindGrid looks up the central sunset grid location / weather station
class FindGrid {
    findGrid = () => {
        fetch("https://api.weather.gov/points/37.7056,-122.42694") //this returns the central sunset location, replace lat and long to find other locations
            .then(response => response.json())
            .then(data => console.log(data));
    }
}

class PullLocalWeather {
    pullCast = () => {
        const weatherSummary = document.querySelector("#weather-summary");
        weatherSummary.insertAdjacentHTML("beforeend",`<h2>Fetching Forecast Data...</h2>`)
        fetch(hourlyRequestUrl)                           //fetch the requestURL that's been preconfigured to pull the expected weather grid
            .then(response => {
                if (response.status === 200) {
                    return response.json();
                } else {
                    const weatherSummary = document.querySelector("#weather-summary");
                    const cachedForecast = localStorage.getItem("cachedForecast")
                    
                    console.log("attempting to load cached forecast")
                    if (cachedForecast !== undefined) {
                        console.log("loading cached forecast")
                        const jsonForecast = JSON.parse(cachedForecast)
                        this.parseWeatherData(jsonForecast)
                        return;
                    } else {
                        return weatherSummary.insertAdjacentHTML("beforeend", `<p>This appears to be your first visit to the Danometer, as your device does not have a cached forecast to fallback to. The NWS Weather API sometimes returns an invalid forecast due to missing hours at the end of the forecast. This error will resolve in the next few hours, please check again.`)
                    }

                }
            })
            .then(data => {                         //then do stuff with the response
                console.log("about to set local storage")
                const stringifiedObject = JSON.stringify(data)
                localStorage.setItem("cachedForecast", stringifiedObject)
                this.parseWeatherData(data)
            }).catch(error => {
                console.log(error)
                const weatherSummary = document.querySelector("#weather-summary");
                weatherSummary.insertAdjacentHTML("beforeend", `<p class="alert"><b>Apologies.<br/><br/> The NWS Weather API sometimes returns an invalid forecast due to missing hours at the end of the period. <br/><br/> Therefore, I attempt to fallback to a cached version of the forecast. <br/><br/>However, this appears to be your first visit to the Danometer, as your device does not have a cached forecast to fallback to. <br/><br/>So, instead, you're seeing this error. Sorry about that. This error will resolve in the next few hours, please check again.</b>`)
            });
    }

    parseWeatherData = data => {
        const weatherSummary = document.querySelector("#weather-summary");
        weatherSummary.innerHTML = ``;
        console.log(data);
        const periods = data.properties.periods; //periods is an array of objects that represent the forecast data for the next 14 periods (each day has a day and night period)
        console.log(periods)                //optional console log to interrogate the whole periods definition

        const lastUpdated = document.querySelector("#last-updated") //grab a place on the page to place the time that the forecast was updated
        let updateTime = data.properties.updated.split("T");
        lastUpdated.innerHTML = `<p>Forecast Data Last Updated: ${updateTime[0]} @ ${updateTime[1].substring(0, 5)} UTC</p>`

        let countOfBlueHours = 0 //keep track of how many of the forecast hours are "blue" i.e. good conditions
        let streakOfBlueHours = 0; //every consecutive blue hour adds 1 to the streak, a nonblue hour sets it back to 0
        let longestBlueHourStreak = 0;
        let dayWithLongestBlueStreak = ``;
        let totalHours = 0;

        periods.forEach(period => {         //iterate over each period
            if (period.dewpoint !== null) { //check to ensure that the dewpoint value is not null. ONly try to create an add an object when it is not null
                let f = period.dewpoint.value * 9 / 5 + 32; //convert the C value we will receive into an F value
                let entryTime = period.startTime.split("T"); //split period.startTime into an array that splits at T

                let tempDewDelta = period.temperature - f; //compare the current temperature to the dewpoint and record the delta
                let windSpeed = period.windSpeed.substring(0, 2); //.eriod.windSpeed comes with "mph". This gets rid of it.
                let goodConditions = false;

                //check to see if conditions are good
                let windThreshold = 11; //looking for a wind value thats < threshold
                let dewDeltaThreshold = 4; //looking for a delta that's > threshold
                let temperatureThreshold = 65; //look for a temperature that's > threshold
                //console.log("Windspeed: " + windSpeed + " DewDelta: " + tempDewDelta);
                if (windSpeed < windThreshold && tempDewDelta > dewDeltaThreshold || period.temperature > temperatureThreshold) {
                    goodConditions = true;
                    countOfBlueHours++;
                    streakOfBlueHours++;
                    if (streakOfBlueHours > longestBlueHourStreak) {
                        dayWithLongestBlueStreak = this.getDayOfWeek(entryTime[0].substring(5))
                        longestBlueHourStreak = streakOfBlueHours;
                    }
                } else {
                    streakOfBlueHours = 0;
                }

                if (windSpeed < 10) { //insert a leading zero for a wind < 10
                    windSpeed = "0" + windSpeed; //windSpeed is converted to a string at this point!
                    //console.log("We appended a 0 to the front of a < 10 windspeed and got: " + windSpeed)
                }

                //create a new object for each iteration
                let obj = {

                    date: entryTime[0].substring(5),
                    time: entryTime[1].substring(0, 2),
                    temperature: period.temperature,
                    dewpoint: f,
                    windDirection: period.windDirection,
                    windSpeed: windSpeed,
                    goodConditions: goodConditions
                }
                weatherObjects.push(obj);   //add the new object to the array that stores the forecast objects
            }

            totalHours++;
            return weatherObjects;
        })
        console.log("Weather Objects Follow");
        //console.dir(weatherObjects);
        this.printSummary(countOfBlueHours, dayWithLongestBlueStreak, longestBlueHourStreak, totalHours)
        this.printCast(weatherObjects);
        return weatherObjects;
    }

    getDayOfWeek = (numericalDate, returnShort)=> {
        //given the current date, calculate a day of the week
        let currentYear = new Date().getFullYear(); //first find the year          

        let dateObj = new Date(currentYear + "-" + numericalDate); //then great a Date Object 
        let timezoneOffeset = dateObj.getTimezoneOffset(); //figure out the timezone offset in the user's timezone

        dateObj.setMinutes(dateObj.getMinutes() + timezoneOffeset) //adjust the minutes in that Date object to account for that offset. 
        //Failure to do this will e.g.lead to data from PDT showing up as 17: 00 on the day before because 24 - 7(the offset at time of writing) = 17!
        let date = dateObj.toString(); //convert the date object to a string so that you can take a substring from it

        
        //console.log("Date is: " + dateObj + " Logged Date is: " + object.date + " Logged Time is: " + object.time)
        let dayOfWeek = date.substring(0, 3); //grab just the first 3 characters of the date string e.g. SUN, MON etc

        

        return dayOfWeek
    }

    printSummary = (countOfBlueHours, dayWithLongestStreak, longestStreakCount, totalHours) => {
        const weatherSummary = document.querySelector("#weather-summary");
        let hourOrHours = "";
        if (longestStreakCount === 1) {
            hourOrHours = "hour"
        } else {
            hourOrHours = "hours"
        }

        let percentOfBlueHours = longestStreakCount / totalHours * 100
        percentOfBlueHours = percentOfBlueHours.toFixed(1);

        if (countOfBlueHours > 0) {
            weatherSummary.insertAdjacentHTML("beforeend", `
            <div class="forecast-summary-entry"><u>Best Looking Day:</u> <br/> On <b>${dayWithLongestStreak}</b> there will be <b>${longestStreakCount} blue ${hourOrHours}!</b></div>
            <div class="forecast-summary-entry"><u>Weekly Blue Score:</u> <br/><b>${countOfBlueHours} blue / ${totalHours} total = ${percentOfBlueHours}%</b></div>

            `)
        } else {
            weatherSummary.insertAdjacentHTML("beforeend", `<li>There are ZERO blue hours in the forecast!</li>`)
        }
        
    }

    printCast = objects => {
        console.dir(objects);
        let gridContainer = document.getElementById("grid");

        // Iterate through the array and create a grid cell for each object
        for (let i = 0; i < objects.length; i++) {
            let object = objects[i];

            // Create a grid cell element
            let cell = document.createElement("div");
            cell.className = "grid-cell";

            //console.log("Windspeed:" + object.windSpeed);
            let windSpeedRatio = object.windSpeed.substring(0, 2) / 20; // used to help calculate the scale of wind arrows
            let scale = 75 * windSpeedRatio; //where the first value is the max scale the arrow can grow to


            let qualityCategory = 0;
            if (object.goodConditions) {
                //this is the good category!
                //console.log("category 0");
                qualityCategory = 0;
            }
                
        
            if (!object.goodConditions) {
                //this is the not so good category
                //console.log("category 1");
                qualityCategory = 1;
            }

            let dayOfWeek = this.getDayOfWeek(object.date);
            

            // Populate the cell with object data
            cell.innerHTML = `
                <div class="weather-entry category-${qualityCategory}" id="${dayOfWeek.toLowerCase()}">
                    <div class="weather-time">${dayOfWeek} ${object.date} @ ${object.time}:00</div>
                    <div class="weather-data">
                        <div class="weather-temperature">
                            <div class="weather-item">
                                <div>TEMP</div>
                                <div>${object.temperature}</div>
                            </div>
                            <div class="weather-item">
                                <div>DEW</div>
                                <div>${object.dewpoint}</div>
                            </div>
                            <div class="weather-item">
                                <div>WIND</div>
                                <div>${object.windSpeed}</div>
                            </div>

                        </div>
                        <div class="weather-wind">

                            <img class="${object.windDirection} arrow" src="./assets/img/pointer-${qualityCategory}.png" alt="^" style="height: ${scale}px;"></div>
                        </div>
                    </div>

                `;

            // Append the cell to the grid container
            gridContainer.appendChild(cell);
        }

        //create a new instance of the class and run the instantiate function
        const filter = new FilterDaysOfWeek;
        filter.instantiateFilterButtons();


    }



}

//using buttons on the UI, filter which days of the week are visible
class FilterDaysOfWeek {

    constructor() {
        this.showOnlyBlue = false;
    }

    instantiateFilterButtons = () => {
        //create references to the UI buttons we're going to use to filter the results by day of the week
        const sundayButton = document.querySelector("#sunday");
        const mondayButton = document.querySelector("#monday");
        const tuesdayButton = document.querySelector("#tuesday");
        const wednesdayButton = document.querySelector("#wednesday");
        const thursdayButton = document.querySelector("#thursday");
        const fridayButton = document.querySelector("#friday");
        const saturdayButton = document.querySelector("#saturday");
        const allButton = document.querySelector("#all-days");

        const showOnlyBlueButton = document.querySelector("#only-blue-hours")

        showOnlyBlueButton.addEventListener("change", event => {
            this.showOnlyBlue = !this.showOnlyBlue;
            console.log("show only blue: " + this.showOnlyBlue)
        })

        //then put them all into an array
        const filterButtons = [sundayButton, mondayButton, tuesdayButton, wednesdayButton, thursdayButton, fridayButton, saturdayButton, allButton]

        //iterate over the button array and add an event listener on each one
        filterButtons.forEach(button => {
            button.addEventListener("click", event => {
                //each button calls the filter method and passses through the text on the button (e.g. "Sunday")
                this.filter(event.srcElement.innerHTML)
            })
        })

        

    }

    

    filter = day => {

        //trim the passed value e.d. "Sunday" becomes "sun"
        const trimmedFilterParam = day.toLowerCase().slice(0, 3);

        //these will return a node list so we'll have to forEach over them
        const sundays = document.querySelectorAll("#sun")
        const mondays = document.querySelectorAll("#mon")
        const tuesdays = document.querySelectorAll("#tue")
        const wednesdays = document.querySelectorAll("#wed")
        const thursdays = document.querySelectorAll("#thu")
        const fridays = document.querySelectorAll("#fri")
        const saturdays = document.querySelectorAll("#sat")

        

        //and then put all all of those together in an array so you can forEach over them all at once
        const dayGroup = [sundays, mondays, tuesdays, wednesdays, thursdays, fridays, saturdays]

        //so we start by iterating over the array, each entry in that array will then also need to have its members iterated over
        dayGroup.forEach(dayOfWeek => {
            //start by hiding all of the days
            dayOfWeek.forEach(day => {
                day.classList.add("hide")
            })
        })

        //then check the trimmed filter parameter for a match, unhide the matched days       
        if (trimmedFilterParam === "sun") {
            sundays.forEach(day => {
                day.classList.remove("hide");
            })
        } else if (trimmedFilterParam === "mon") {
            mondays.forEach(day => {
                day.classList.remove("hide");
            })
        } else if (trimmedFilterParam === "tue") {
            tuesdays.forEach(day => {
                day.classList.remove("hide");
            })
        } else if (trimmedFilterParam === "wed") {
            wednesdays.forEach(day => {
                day.classList.remove("hide");
            })
        } else if (trimmedFilterParam === "thu") {
            thursdays.forEach(day => {
                day.classList.remove("hide");
            })
        } else if (trimmedFilterParam === "fri") {
            fridays.forEach(day => {
                day.classList.remove("hide");
            })
        } else if (trimmedFilterParam === "sat") {
            saturdays.forEach(day => {
                day.classList.remove("hide");
            })
        } else if (trimmedFilterParam === "all") {
            dayGroup.forEach(dayOfWeek => {
                dayOfWeek.forEach(day => {
                    day.classList.remove("hide")
                })
            })
        }
        console.log(this.showOnlyBlue)
        if (this.showOnlyBlue) {
            console.log("yes")
            const nonBlueHours = document.querySelectorAll(".category-1")
            nonBlueHours.forEach(hour => {
                hour.classList.add("hide");
            })
        }

    }

    

}


//enable this code to find a grid location

//const find = new FindGrid;
//find.findGrid();

//pull the forecast for the configured url
const forecast = new PullLocalWeather;
forecast.pullCast();

const aboutButton = document.querySelector("#info-toggle")
const projectInfoPanel = document.querySelector("#project-info")
aboutButton.addEventListener("click", event => {
    projectInfoPanel.classList.toggle("hide")
    if (aboutButton.textContent === "i") {
        console.log("swapping")
        aboutButton.textContent = "x"
    } else {
        console.log("swapping back")
        aboutButton.textContent = "i"
    }
})




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
        let useCachedForecast = false;  //by default, we want to try to use the most recent forecast data
        const weatherSummary = document.querySelector("#weather-summary");
        weatherSummary.insertAdjacentHTML("beforeend", `<h2>Fetching Forecast Data...</h2>`) //indicate to the user that we're fetching the data
        fetch(hourlyRequestUrl)                           //fetch the requestURL that's been preconfigured to pull the expected weather grid
            .then(response => {
                if (response.status === 200) { //check the response status 
                    return response.json();  //parse it to a JSON if you get a 200 OK   
                } else {                        //if it's not 200 / OK, then indicate that we need to use the cached forecast
                    useCachedForecast = true;
                    //console.log("Use Cached Forecast!")
                }
            })
            .then(data => {                                                     //then do stuff with the response
                if (!useCachedForecast) {                                       //if you're not indicated to use the cahedForecast, 
                    //console.log("about to set local storage")
                    const stringifiedObject = JSON.stringify(data)              //parse the data back to a json string
                    localStorage.setItem("cachedForecast", stringifiedObject)   //and then save it to local storage. This is the cached forecast to use in the future if the forecast call fails
                    this.parseWeatherData(data, useCachedForecast)              //then parse the forecast data
                } else {                                                            //or in the case where you ARE using cachedForecast
                    const cachedForecast = localStorage.getItem("cachedForecast");  //load it from local storage
                    const jsonForecast = JSON.parse(cachedForecast)                 //parse it into a JSON
                    this.parseWeatherData(jsonForecast, useCachedForecast);         //and then parse the forecast data
                }
            }).catch(error => {                                                 //user should only end up in the catch block in the case that the API returns a bad response AND it's their first visit to the site/
                console.log(error)
                const weatherSummary = document.querySelector("#weather-summary");
                weatherSummary.insertAdjacentHTML("beforeend", `<p class="alert"><b>Apologies.<br/><br/> The NWS Weather API sometimes returns an invalid forecast due to missing hours at the end of the period. <br/><br/> Therefore, I attempt to fallback to a cached version of the forecast. <br/><br/>However, this appears to be your first visit to the Danometer, as your device does not have a cached forecast to fallback to. <br/><br/>So, instead, you're seeing this message. Sorry about that. This error will resolve in the next forecast update / within a few hours, please check again.</b>`)
            });
    }

    parseWeatherData = (data, usingCache) => {
        const weatherSummary = document.querySelector("#weather-summary");
        weatherSummary.innerHTML = ``;
        //console.log(data);
        const periods = data.properties.periods; //periods is an array of objects that represent the forecast data for the next 14 periods (each day has a day and night period)
        //console.log(periods)                //optional console log to interrogate the whole periods definition

        const lastUpdated = document.querySelector("#last-updated") //grab a place on the page to place the time that the forecast was updated
        let updateTime = data.properties.updated.split("T"); //data.properties.update comes in as: 2023-08-13T08:54:01+00:00
        //console.log(data.properties.updated)
        let dateString = updateTime[0] + "-" + updateTime[1] //re-combine the split updated time into the format expected to create a JS Date Object
        //console.log(dateString)
        const updateDateObject = this.createDateObject(dateString) //and then put the string into a Date object so that we can use Date Object methods later
        //console.log(updateDateObject)

        let updateHours = updateDateObject.getHours() //pull out the hours from the newly created Date object
        let amPM = "AM"
        if (updateHours > 12) { //the NWS API returns the time in 24 hours, so check to see if it's the afternoon
            amPM = "PM"         //if so, set the text to indicate
            updateHours -= 12   //and subtract 12 hours from the time so we can print something like 4:00 PM instead of 16:00
        }

        let updateDayOfWeek = this.getDayOfWeek(this.getNumericalDate(updateTime)); //get the day of the week e.g. Sun or Mon
        //console.log(updateTime[0].substring(5));
        //console.log(updateDate)

        lastUpdated.innerHTML = `<p>Data Updated @ ${updateHours}:${updateDateObject.getMinutes()} ${amPM} </p>`
        if (usingCache) {
            lastUpdated.insertAdjacentHTML("beforeend", `<h2><b>Warning: Using Cached Forecast due to API Issues</b></h2>`)
        }

        let countOfBlueHours = 0            //keep track of how many of the forecast hours are "blue" i.e. good conditions
        let streakOfBlueHours = 0;          //every consecutive blue hour adds 1 to the streak, a nonblue hour sets it back to 0
        let longestBlueHourStreak = 0;      //store the longest streak here
        let dayWithLongestBlueStreak = ``;  //store the day with the longest streak here
        let totalHours = 0;                 //keep track of the sum of blue hours in the whole week
        let currentDayBeingTabulated = ``;  //use this value as the periods.forEach loop goes through each period. Check to see when it changes and then tabulate how many blue hours each day has
        let lastDayTabulated = ``;          //when currentDay is not = lastDay, we know that the day has changed
        let periodIndex = 0;
        let dayIndex = 0;                   //this value increases by 1 every time we detect that the parser has advanced to the next day
        let dailyBlueHours = 0;
        let dailySummary = {}                //this object will store the count of blue hours in each day. Used to create a daily summary grap
        let dailySummaryDetail = [];         //this object will store the list of blue hours for each day in an object to feed to the charts.js bubble chart

        periods.forEach(period => {         //iterate over each period
            if (period.dewpoint !== null) { //check to ensure that the dewpoint value is not null. ONly try to create an add an object when it is not null
                let f = period.dewpoint.value * 9 / 5 + 32; //convert the C value we will receive into an F value
                let entryTime = period.startTime.split("T"); //split period.startTime into an array that splits at T
                //console.log(entryTime)
                //check which day the current period belongs to
                currentDayBeingTabulated = this.getDayOfWeek(this.getNumericalDate(entryTime))
                //check to see if the day has changed since the last period
                if (currentDayBeingTabulated !== lastDayTabulated && periodIndex !== 0) {
                    const newDailyBlueHourCount = {         //if so, then log the count of blue hours from the previous day to a new object
                        [lastDayTabulated]: dailyBlueHours
                    }
                    dailySummary = { ...dailySummary, ...newDailyBlueHourCount }    //and spread it into the dailySummary object
                    dailyBlueHours = 0; //reset the blue hours so that the next day begins at 0
                    console.log("the day has advanced")
                    dayIndex++;
                    console.log(dailySummary)
                }
                //console.log(currentDayBeingTabulated)


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

                    //add a blue hour to the current day being tabulated
                    dailyBlueHours++;
                    let currentBlueHour = parseInt(entryTime[1].substring(0, 2))
                    
                    console.log(currentBlueHour)

                    let obj = {
                        x: dayIndex,
                        y: currentBlueHour,
                        r: 10
                    }

                    dailySummaryDetail.push(obj);

                    //console.log(dailySummaryDetail)

                    streakOfBlueHours++;
                    if (streakOfBlueHours > longestBlueHourStreak) {
                        dayWithLongestBlueStreak = this.getDayOfWeek(this.getNumericalDate(entryTime))
                        //console.log(entryTime[0].substring(5))
                        longestBlueHourStreak = streakOfBlueHours;
                    }
                } else {
                    streakOfBlueHours = 0;
                }

                if (windSpeed < 10) { //insert a leading zero for a wind < 10
                    windSpeed = "0" + windSpeed; //windSpeed is converted to a string at this point!
                    //console.log("We appended a 0 to the front of a < 10 windspeed and got: " + windSpeed)
                }

                //create a new object for each iteration. Each of these objects corresponds to one hour within the forecast. We'll have 156 of these in total
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
                lastDayTabulated = currentDayBeingTabulated;
                periodIndex++;
                totalHours++;
            }


            return weatherObjects;
        })

        console.log(dailySummary)
        //console.log("Weather Objects Follow");
        //console.dir(weatherObjects);
        this.printSummary(countOfBlueHours, dayWithLongestBlueStreak, longestBlueHourStreak, totalHours, dailySummary)
        this.printCast(weatherObjects);
        this.createChart(dailySummary, dailySummaryDetail)
        return weatherObjects;
    }

    getYear = () => { //run this method to get the year expected in createDateObject
        return new Date().getFullYear();
    }

    getNumericalDate = timeArray => { //takes in the split entry time value which is mapped into an array. We take the first 5 character of the first index value of that array and
        return timeArray[0].substring(5) //e.g. returns 08-13 on August 13
    }

    createDateObject = (numericalDate, currentYear) => { //expects a Numerical Date e.g. 08-12 and currentYear e.g. 2023.
        return new Date(currentYear + "-" + numericalDate)
    }

    getTimezone = dateObj => { // expects a Date Object input e.g.: Wed Aug 16 2023 17:00:00 GMT-0700 (Pacific Daylight Time)
        //console.log(dateObj)
        return dateObj.getTimezoneOffset();
    }

    getDayOfWeek = numericalDate => { //getDayOfWeek expects a 5 character string e.g. 08-27 for August 27th and returns e.g. Wed for Wednesday
        //given the current date, calculate a day of the week
        let currentYear = this.getYear(); //first find the year          

        let dateObj = this.createDateObject(numericalDate, currentYear); //then create a Date Object that combines the year and the 5 character numerical date we took into this method
        //console.log(dateObj)
        let timezoneOffeset = this.getTimezone(dateObj) //figure out the timezone offset in the user's timezone

        dateObj.setMinutes(dateObj.getMinutes() + timezoneOffeset) //adjust the minutes in that Date object to account for that offset. 
        //Failure to do this will e.g.lead to data from PDT showing up as 17: 00 on the day before because 24 - 7(the offset at time of writing) = 17!
        let date = dateObj.toString(); //convert the date object to a string so that you can take a substring from it

        //console.log("Date is: " + dateObj + " Logged Date is: " + object.date + " Logged Time is: " + object.time)
        let dayOfWeek = date.substring(0, 3); //grab just the first 3 characters of the date string e.g. SUN, MON etc

        return dayOfWeek
    }

    //this function handles the summary that's printed at the top of the forecast
    printSummary = (countOfBlueHours, dayWithLongestStreak, longestStreakCount, totalHours, dailySummary) => {
        const weatherSummary = document.querySelector("#weather-summary");
        let hourOrHours = "";
        if (longestStreakCount === 1) {
            hourOrHours = "hour"
        } else {
            hourOrHours = "hours"
        }

        let percentOfBlueHours = countOfBlueHours / totalHours * 100
        percentOfBlueHours = percentOfBlueHours.toFixed(0);
        let grade = ``;
        if (countOfBlueHours <= 7) {
            grade = `F`
        } else if (countOfBlueHours > 14 && countOfBlueHours <= 21) {
            grade = `D`
        } else if (countOfBlueHours > 21 && countOfBlueHours <= 28) {
            grade = `C`
        } else if (countOfBlueHours > 28 && countOfBlueHours <= 35) {
            grade = `B`
        } else if (countOfBlueHours > 35 && countOfBlueHours <= 42) {
            grade = `A`
        } else if (countOfBlueHours > 42) {
            grade = `A+`
        }

        if (countOfBlueHours > 0) {
            weatherSummary.insertAdjacentHTML("beforeend", `
            <h2>Sunset + Richmond Forecast</h2>
            <div class="forecast-summary-entry"><u>Best Looking Day:</u> <br/> On <b>${dayWithLongestStreak}</b> there will be <b>${longestStreakCount} blue ${hourOrHours}!</b></div>
            <div class="forecast-summary-entry"><u>Weekly Blue Score:</u> <br/><h1>${countOfBlueHours}  (${grade})</h1></div>
            
            `)

        } else {
            weatherSummary.insertAdjacentHTML("beforeend", `<li>There are ZERO blue hours in the forecast!</li>`)
        }

    }

    printCast = objects => {
        //console.dir(objects);
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
                                <div><u>TEMP</u></div>
                                <div>${object.temperature}</div>
                            </div>
                            <div class="weather-item">
                                <div><u>DEW</u></div>
                                <div>${object.dewpoint}</div>
                            </div>
                            <div class="weather-item">
                                <div><u>WIND</u></div>
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

    createChart = (dailySummary, dailySummaryDetail) => {
        const weatherChart = document.getElementById('weather-chart');
        console.log(dailySummary);
        new Chart(weatherChart, {
            type: 'bar',
            data: {
                datasets: [{
                    data: dailySummary,
                    backgroundColor: '#6495ed',

                }]
            },
            options: {
                plugins: {
                    title: {

                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10,
                        title: {
                            display: true,
                            text: 'Blue Hours',
                        }
                    }
                },
                layout: {
                    padding: 20,

                },
                barBorderWidth: 1,
                barBorderColor: 'black',
                barBorderRadius: 1,
                maintainAspectRatio: false,
                responseive: true,



            }
        });
       
        const weatherBubbleChart = document.getElementById('weather-bubble-chart');
        new Chart(weatherBubbleChart, {
            type: 'bubble',
            data: {
                datasets: [{
                    label: 'First Dataset',
                    data: dailySummaryDetail,
                    backgroundColor: 'rgb(100 149 237)'
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        
                        reverse: true,
                        min: 0,
                        max: 24,
                        ticks: {
                            autoSkip: false,
                            stepSize: 4,
                            major: {
                                enabled: true,
                                stepSize: 1
                            },

                            
                        }
                    },
                    x: {
                        min: 0,
                        max: 6,
                        ticks: {
                            stepSize: 1
                        }
                        
                    }
                },
                elements: {
                    point: {
                        pointStyle: 'rectRounded'
                    }
                },
                maintainAspectRatio: false,
                width: 200
                
            }
        })

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

        ///trim the passed value e.d. "Sunday" becomes "sun"
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




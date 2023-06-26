//fetch this URL to get the forecast for the central grid location
const requestURL = "https://api.weather.gov/gridpoints/MTR/83,102/forecast" //this is for daily-level forecasts
const hourlyRequestUrl = `${requestURL}/hourly`
const weatherObjects = []; //an empty array to store the weather objects we'll create in Pull Local Weather
const dayConvertURL = "https://timeapi.io/api/Conversion/DayOfTheWeek/" //TODO: Implement the date to day of week conversion but in a way that caches the returns so you don't hammer the API


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
        fetch(hourlyRequestUrl)                           //fetch the requestURL that's been preconfigured to pull the expected weather grid
            .then(response => response.json())      //parse the resulting JSON string into a JSON
            .then(data => {                         //then do stuff with the response
                console.log(data);
                const periods = data.properties.periods; //periods is an array of objects that represent the forecast data for the next 14 periods (each day has a day and night period)
                console.log(periods)                //optional console log to interrogate the whole periods definition
                
                periods.forEach(period => {         //iterate over each period
                    if (period.dewpoint !== null) { //check to ensure that the dewpoint value is not null. ONly try to create an add an object when it is not null
                        let f = period.dewpoint.value * 9 / 5 + 32; //convert the C value we will receive into an F value
                        let entryTime = period.startTime.split("T"); //split period.startTime into an array that splits at T

                        let tempDewDelta = period.temperature - f; //compare the current temperature to the dewpoint and record the delta
                        let windSpeed = period.windSpeed.substring(0, 2); //.eriod.windSpeed comes with "mph". This gets rid of it.
                        let goodConditions = false;

                        //check to see if conditions are good
                        let windThreshold = 10; //looking for a wind value thats < threshold
                        let dewDeltaThreshold = 4; //looking for a delta that's > threshold
                        //console.log("Windspeed: " + windSpeed + " DewDelta: " + tempDewDelta);
                        if (windSpeed < windThreshold) {
                            //console.log("Possibly good conditions?");
                            if (tempDewDelta > dewDeltaThreshold) {
                                console.log("Good Conditions!");
                                goodConditions = true;
                            }
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
                    
                    
                    return weatherObjects;
                })
                console.log("Weather Objects Follow");
                //console.dir(weatherObjects);
                this.printCast(weatherObjects);
                return weatherObjects;
            }).catch(error => console.log(error));
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

            //given the current date, calculate a day of the week
            let currentYear = new Date().getFullYear(); //first find the year          

            let dateObj = new Date(currentYear + "-" + object.date); //then great a Date Object 
            let timezoneOffeset = dateObj.getTimezoneOffset(); //figure out the timezone offset in the user's timezone

            dateObj.setMinutes(dateObj.getMinutes() + timezoneOffeset) //adjust the minutes in that Date object to account for that offset. 
                                                                        //Failure to do this will e.g.lead to data from PDT showing up as 17: 00 on the day before because 24 - 7(the offset at time of writing) = 17!
            let date = dateObj.toString(); //convert the date object to a string so that you can take a substring from it

            //console.log("Date is: " + dateObj + " Logged Date is: " + object.date + " Logged Time is: " + object.time)
            let dayOfWeek = date.substring(0, 3); //grab just the first 3 characters of the date string e.g. SUN, MON etc
            

            // Populate the cell with object data
            cell.innerHTML = `
                <div class="weather-entry category-${qualityCategory}"><p>${dayOfWeek} ${object.date} @ ${object.time}:00 || TEMP ${object.temperature} || DEW ${object.dewpoint} || Wind ${object.windSpeed}</p>
                <img class="${object.windDirection} arrow" src="./assets/img/pointer-${qualityCategory}.png" alt="^" style="height: ${scale}px;"></div>
                `;

            // Append the cell to the grid container
            gridContainer.appendChild(cell);
        }
    }
}

//enable this code to find a grid location

//const find = new FindGrid;
//find.findGrid();

//pull the forecast for the configured url
const forecast = new PullLocalWeather;
forecast.pullCast();





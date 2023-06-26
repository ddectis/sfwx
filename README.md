# sfwx
A webpage build on a National Weather Service API. The goal is to great a hyperlocal forecast tool that highlights good (i.e. non-foggy) conditions on the west side of San Francisco

This all started when a Sunday with steady-strong onshore winds was brilliantly sunny. And that was after a Saturday which also had steady-strong onshore winds and plenty of marine layer. That got me thinking about the dewpoint. I noticed that many of the weather forecast tools focus on relative humidity as opposed to dew point. So I wanted a quick and easy way to visualize the trends. 

This API makes a fetch request to the National Weather Service hourly API:  https://www.weather.gov/documentation/services-web-api
It parses the response into a JSON and creates a new array of objects which pulls out:
  -Time
  -Temperature
  -Dewpoint
  -Wind Speed & Direction

The long term goal of the project is to combine this forecast data along with observational outcomes to know when to expect sunshine on the west side of San Francisco


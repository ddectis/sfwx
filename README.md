## sfwx
This project is an API + webpage built on a National Weather Service API. The goal is to creat a hyperlocal forecast tool that highlights good (i.e. non-foggy) conditions on the west side of San Francisco

This all started when a Sunday with steady-strong onshore winds was brilliantly sunny. And that was after a Saturday which also had steady-strong onshore winds and plenty of marine layer. That got me thinking about the dewpoint. I noticed that many of the weather forecast tools focus on relative humidity as opposed to dew point. So I wanted a quick and easy way to visualize the trends. 

## Overview
This API makes a fetch request to the National Weather Service hourly API:  https://www.weather.gov/documentation/services-web-api

Then, it parses the response into a JSON and creates a new array of objects which pulls out:

  -Time  
  -Temperature  
  -Dewpoint  
  -Wind Speed & Direction  

Then, it creates an HTML element for each hourly forecast object.
This element contains a wind direction and speed arrow. The arrow is rotated in the direction of the wind and scaled to represent the strength of the wind

## Functions

FindGrid()
-
The NWS Hourly Request URL expects a weather station (e.g. MTR) and a grid x, y value e.g. (83,102). FindGrid() will look up that information (and more) if you provide it with GPS coords. I only needed to run this method one time, so I just hardcoded the lat + long values.

PullLocalWeather()
- 
This method makes the fetch request to the hourly forecast API. Again because this URL doesn't change in my implementation (i.e. I am focusing just on one grid square), I have hardcoded this request URL. This method parses the response to JSON and then parses further to create an array containing an object for each hourly forecast. 


As part of this process, a calculation is performed to see if I estimate the conditions to be good or not. I'm looking for a high delta between temp and dewpoint as well as winds < 10 mph. At the end of the method, the printCast method is called. The array of hourly weather forecast objects is passed into PrintCast.

PrintCast(objects)
-
PrintCast takes in the array of hourly weather forecast objects that were created in PullLocalWeather() and prints them on the page. 

First it grabs a reference to the grid HTML element on the page as gridContainer. This element is where the forecast objects will be printed by this method. Then it iterates over each object and creates the relevant HTML for it. In this section the scale of the wind arrow is determined. You can also change the max scale of the wind arrow here.

Based on the determination in PullLocaLWeather, conditional formatting is applied to the weather-entry-category class. This makes the good condition periods have a blackground of blue.

The wind direction provided by the NWS is in one of 16 directions. So style.css has one class for each of those directions, the names of which match the value pased in object.windDirection. The relevant class is set when cell.innerHTML is set. Finally, once the new cell has been constructed it is appended to gridContainer


## Long Term Goal
The long term goal of the project is to combine this forecast data along with observational outcomes to know when to expect sunshine on the west side of San Francisco


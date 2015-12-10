var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
var request = require("request");
var async = require("async");
var cors = require('cors');
app.use(cors());

var config = require('/opt/apps/properties/config.json');
app.listen(3001);

app.get('/', function (req, res) {
  res.send({ "hello": "hi" });
});

var forecastUrl = "https://api.forecast.io/forecast";
app.get('/directions', function (req, res) {

  var origin = req.query.origin;
  var destination = req.query.destination;
  var directions = [];


  request({
    url: "https://maps.googleapis.com/maps/api/directions/json?origin=" + origin + "&destination=" + destination + "&key=" + config.google_maps_key,
    method: 'GET'

  }, function (error, response, body) {
    if (error) {
      res.status(500).json(error);
    } else {
      if (response.statusCode == 200) {
        var successResponse = JSON.parse(body);
        if (successResponse.status == "OK") {
          var steps = [];
          var firstLeg = successResponse.routes[0].legs[0];

          directions.distance = firstLeg.distance;
          directions.duration = firstLeg.duration;
          directions.start = firstLeg.start_location;
          directions.end = firstLeg.end_location;
          directions.end_address = firstLeg.end_address;
          directions.start_address = firstLeg.start_address;
          
          var googleSteps = firstLeg.steps;

          for (var i in googleSteps) {
            var step = new Object();
            step.html_instructions = googleSteps[i].html_instructions;
            step.start_location = googleSteps[i].start_location;
            step.distance = googleSteps[i].distance;
            step.duration = googleSteps[i].duration;
            steps.push(step)
          }
          directions.steps = steps;


          var unixTimeStamp = Math.floor(Date.now() / 1000);
          async.each(directions.steps, function (step, callback) {
            if (step.duration) {

              unixTimeStamp = unixTimeStamp + step.duration.value;
              var urlForGettingWeather = forecastUrl + "/" + config.forecast_api_key + "/" + step.start_location.lat + "," + step.start_location.lng + "," + unixTimeStamp;
              
              request({
                url: urlForGettingWeather,
                method: 'GET'

              }, function (error, response, body) {
                if (error) {
                  callback(error)
                } else {
                  try {
                    var weather = JSON.parse(body);
                    step.weather = weather.currently;
                    callback();
                  } catch (err) {
                    callback(err);
                  }

                }
              });



            } else {
              callback(false);
            }


          }, function (err) {
            if (err) {
              console.log(err);
              res.status(500).json(err);
              return;
            } else {
              var finalDirections = new Object();
              finalDirections.distance = directions.distance;
              finalDirections.duration = directions.duration;
              finalDirections.start = directions.start;
              finalDirections.end = directions.end;
              finalDirections.steps = directions.steps;
              finalDirections.end_address = directions.end_address
              finalDirections.start_address =  directions.start_address
              res.status(200).json(finalDirections);
              return;
            }
          });



        }
        else {
          res.status(200).json([]);
        }
      }
      else {
        console.log(body);
        var errorBody = JSON.parse(body);
        res.status(400).send(errorBody);

      }
    }
  });







});


var _ = require('lodash');
var axios = require('axios');
const admin = require('firebase-admin');

var serviceAccount = require("./modus-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://modus-dev-us.firebaseio.com"
});
const db = admin.firestore();

require('dotenv').config();

const PHILADELPHIA_COUNTIES = [
"Bucks",
"Philadelphia",
"Delaware",
"Montgomery",
"Chester",
];

let results = [];
let previousMarker = {};

_.forEach(PHILADELPHIA_COUNTIES, function(county) {
  axios.get("https://data.pa.gov/resource/ug4h-nsj9.json", {
    params: {
      "$order": 'historicalmarkerid',
      county: county
    },
    headers: {
      app_token: process.env.PA_TOKEN
    }
  })
  .then(function(data) {
    console.log("Retrieved " + data.data.length + " records from the dataset!");

    _.forEach(data.data, function(marker) {
      if (_.isEmpty(previousMarker) || marker.historicalmarkerid !== previousMarker.historicalmarkerid) {
        if (!_.isEmpty(previousMarker)) {
          addToFirestore(previousMarker);
        }
        marker.dedicateddate = marker.dedicateddate !== undefined ? marker.dedicateddate : '1';
        marker.dedicatedmonth = marker.dedicatedmonth !== undefined ? marker.dedicatedmonth : '1';
        previousMarker = {
          historicalmarkerid: marker.historicalmarkerid,
          categories: [marker.category || ''],
          dedicatedDate: new Date(marker.dedicatedyear, marker.dedicatedmonth, marker.dedicateddate),
          latitude: parseFloat(marker.latitude) || '',
          longitude: parseFloat(marker.longitude) || '',
          location: marker.location,
          markertext: marker.markertext,
          markertype: marker.markertype,
          name: marker.name
        };
      } else {
        previousMarker.categories.push(marker.category);
      }
    });
    addToFirestore(previousMarker);
    previousMarker = {};

  })
  .catch(function(error) {
    console.log(error);
  });
});

function addToFirestore(marker) {
  var docName = marker.historicalmarkerid;
  db.collection('markers').doc(docName).set(marker)
  .then(function(resp){
    console.log(resp);
  })
  .catch(function(error) {
    console.log(error);
  });
}

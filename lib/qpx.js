'use strict';

let http = require('./http'),
    moment = require('moment');

// https://content.googleapis.com/qpxExpress/v1/trips/search?fields=trips(data(airport(code%2Cname)%2Ccarrier(code%2Cname))%2CtripOption)&key=AIzaSyD-a9IF8KKYgoC3cpgS-Al7hLQDbugrDcw&alt=json
const FIELD_LIST = 'trips(data(airport(code,name),carrier(code,name)),tripOption(id,saleTotal,slice(duration,segment(connectionDuration,duration,flight,id,leg(arrivalTime,changePlane,connectionDuration,departureTime,destination,duration,id,origin)))))';
const API_ENDPOINT = 'https://content.googleapis.com/qpxExpress/v1/trips/search';

module.exports = function(apiKey) {
    return {
        search: (origin, destination, date) => {
            return search(apiKey, FIELD_LIST, {
                request: {
                    saleCountry: 'AU',
                    passengers: { adultCount: 1 },
                    slice: [ {
                        origin: origin,
                        destination: destination,
                        date: moment(date).format('YYYY-MM-DD'),
                        preferredCabin: 'COACH'
                    }]
                }
            });
        }
    };
};

function search(apiKey, fields, query) {
    const url = `${API_ENDPOINT}?key=${encodeURIComponent(apiKey)}&search=${encodeURIComponent(fields)}&alt=json`;
    return http.post(url, query);
}
'use strict';

const moment = require('moment');
const http = require('./http');

const FIELD_LIST = 'trips(data(airport(code,name),carrier(code,name)),tripOption(id,saleTotal,slice(duration,segment(connectionDuration,duration,flight,id,leg(arrivalTime,changePlane,connectionDuration,departureTime,destination,duration,id,origin)))))';
const API_ENDPOINT = 'https://content.googleapis.com/qpxExpress/v1/trips/search';

const SEARCH_QUERY = {
    request: {
        saleCountry: 'AU',
        passengers: { adultCount: 1 },
        slice: [{
            // origin,
            // destination,
            // date,
            preferredCabin: 'COACH'
        }]
    }
};

module.exports = function(apiKey) {
    const endpoint = `${API_ENDPOINT}?key=${encodeURIComponent(apiKey)}&search=${encodeURIComponent(FIELD_LIST)}&alt=json`;

    return {
        search: (slice) => {
            Object.assign(SEARCH_QUERY.request.slice[0], slice);
            return http.post(endpoint, SEARCH_QUERY);
        }
    };
};

function search(apiKey, fields, query) {
    const url = `${API_ENDPOINT}?key=${encodeURIComponent(apiKey)}&search=${encodeURIComponent(fields)}&alt=json`;
    return http.post(url, query);
}
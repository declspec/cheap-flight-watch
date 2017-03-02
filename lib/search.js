'use strict';

const Q = require('q');
const moment = require('moment');
const qpx = require('./qpx')('AIzaSyAaPygu-icX_Fr_qHueEF1d0oCWt_DGqkw');

module.exports = function(searches, filters) {
    const promise = Q.all(searches.map(slice => 
        qpx.search(slice).then(mapTrips)));

    return promise.then(results => Array.prototype.concat.apply([], results))
        .then(results => filters.reduce(Q.when, Q(results)));
};

function codeReduction(acc, obj) {
    acc[obj.code] = obj;
    return acc;
}

function mapTrips(qpxData) {
    const trips = qpxData.trips;

    if (!trips.tripOptions || !trips.data.airport || !trips.data.carrier)
        return [];

    const airportMap = trips.data.airport.reduce(codeReduction, {});
    const carrierMap = trips.data.carrier.reduce(codeReduction, {});

    return trips.tripOption.map(opt => {
        let slice = opt.slice[0],
            events = [],
            carriers = [];

        slice.segment.forEach(segment => {
            if (carriers.indexOf(segment.flight.carrier) < 0)
                carriers.push(segment.flight.carrier);

            segment.leg.forEach(leg => {
                events.push({ 
                    type: 'flight', 
                    departure: moment.parseZone(leg.departureTime),
                    arrival: moment.parseZone(leg.arrivalTime),
                    origin: airportMap[leg.origin],
                    destination: airportMap[leg.destination],
                    duration: leg.duration,
                    number: segment.flight.number 
                        ? `${segment.flight.carrier}-${segment.flight.number}` 
                        : null
                });

                if (leg.hasOwnProperty('connectionDuration')) {
                    events.push({ 
                        type: 'connection', 
                        duration: leg.connectionDuration, 
                        location: airportMap[leg.destination]
                    });
                }
            });

            if (segment.hasOwnProperty('connectionDuration')) {
                events.push({ 
                    type: 'connection', 
                    duration: segment.connectionDuration, 
                    location: airportMap[segment.leg[segment.leg.length - 1].destination]
                });
            }
        });

        const priceMatch = /[0-9]/.exec(opt.saleTotal);

        return {
            id: opt.id,
            price: parseFloat(opt.saleTotal.substring(priceMatch.index)),
            currency: opt.saleTotal.substring(0, priceMatch.index),
            duration: slice.duration,
            carriers: carriers.map(code => carrierMap[code]),
            events: events
        };
    });
};
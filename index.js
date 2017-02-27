let Q = require('q'),
    fs = require('fs'),
    moment = require('moment'),
    filter = require('./lib/trip-filter');

const codeReduction = (acc, item) => {
    acc[item.code] = item;
    return acc;
};

const minutesToReadable = (mins) => {
    let hours = Math.floor(mins / 60),
        suffix = hours !== 1 ? 's' : '';
    mins = mins % 60;
    return `${hours} hour${suffix} ${mins} minutes`;
};

const eventToReadable = (event) => {
    switch(event.type) {
    case 'connection':
        return `[ ${minutesToReadable(event.duration)} stop at ${event.location.name} ]`;
    case 'flight':
        return `${event.origin.name} (${event.origin.code}) -> ${event.destination.name} (${event.destination.code}) : ${minutesToReadable(event.duration)}`
            + (event.number ? ` [${event.number}]` : '');
    default:
        throw new TypeError('Invalid event type provided');
    }
};

const optionToReadable = (option) => {
    const dateFormat = 'DD/MM/YYYY HH:mm (Z)';
    const flights = option.events.filter(e => e.type === 'flight');
    const carrierNames = option.carriers.map(c => c.name);

    return `$${option.price} (${option.currency}) | ${flights.length} flights | ${minutesToReadable(option.duration)} | ${carrierNames.join(', ')} | ${flights[0].departure.format(dateFormat)} -> ${flights[flights.length-1].arrival.format(dateFormat)}`
        + `\n    ${option.events.map(eventToReadable).join("\n    ")}\n`;
};

const mapTrips = (qpxData) => {
    const airportMap = qpxData.trips.data.airport.reduce(codeReduction, {});
    const carrierMap = qpxData.trips.data.carrier.reduce(codeReduction, {});

    return qpxData.trips.tripOption.map(opt => {
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

// --
// Main
// --

const qpx = require('./lib/qpx')('AIzaSyAaPygu-icX_Fr_qHueEF1d0oCWt_DGqkw');
const departure = new Date(2017, 5, 28);

const promise = Q.all([ 
    qpx.search('BCN', 'AMS', departure).then(mapTrips),
    //qpx.search('SPU', 'ATH', departure).then(mapTrips)
]);

promise.then(searches => Array.prototype.concat.apply([], searches))
    .then(filter)
    .then(options => {
        options.sort((a,b) => a.price - b.price);

        options.forEach(opt => {
            console.log(optionToReadable(opt));
        });
    }, console.error);
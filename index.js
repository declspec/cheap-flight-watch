let fs = require('fs'),
    moment = require('moment'),
    filter = require('./lib/trip-filter');

const qpxData = JSON.parse(fs.readFileSync('results.json', 'utf8'));

const codeReduction = (acc, item) => {
    acc[item.code] = item;
    return acc;
};

const minutesToReadable = (mins) => {
    let hours = Math.floor(mins / 60),
        suffix = hours !== 1 ? 's' : '';
    mins = mins % 60;
    return `${hours} hour${suffix} & ${mins} minutes`;
};

const eventToReadable = (event, airportLookup) => {
    switch(event.type) {
    case 'connection':
        const location = airportLookup[event.location];
        return `[ ${minutesToReadable(event.duration)} stop at ${location.name} ]`;
    case 'flight':
        const origin = airportLookup[event.origin];
        const dest = airportLookup[event.destination];

        return `${origin.name} (${origin.code}) -> ${dest.name} (${dest.code}) : ${minutesToReadable(event.duration)}`;
    default:
        throw new TypeError('Invalid event type provided');
    }
};

const optionToReadable = (option, airportLookup, carrierLookup) => {
    const flights = option.events.filter(e => e.type === 'flight');
    const carrierNames = option.carriers.map(c => carrierLookup[c].name);

    return `$${option.price} (${option.currency}) | ${flights.length} flights | ${minutesToReadable(option.duration)} | ${carrierNames.join(', ')}`
        + `\n    ${option.events.map(e => eventToReadable(e, airportLookup)).join("\n    ")}\n`;
};

const getFirstSegment = (tripOption) => {
    const slice = tripOption.slice[0];
    return slice && slice.segment[0];
};

const getLastSegment = (tripOption) => {
    const slice = tripOption.slice[tripOption.slice.length - 1];
    return slice && slice.segment[slice.segment.length - 1];
};

const getFirstLeg = (tripOption) => {
    const segment = getFirstSegment(tripOption);
    return segment && segment.leg[0];
};

const getLastLeg = (tripOption) => {
    const segment = getLastSegment(tripOption);
    return segment && segment.leg[segment.leg.length - 1];
};

const options = qpxData.trips.tripOption.map(opt => {
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
                origin: leg.origin,
                destination: leg.destination,
                duration: leg.duration
            });

            if (leg.hasOwnProperty('connectionDuration')) {
                events.push({ 
                    type: 'connection', 
                    duration: leg.connectionDuration, 
                    location: leg.destination 
                });
            }
        });

        if (segment.hasOwnProperty('connectionDuration')) {
            events.push({ 
                type: 'connection', 
                duration: segment.connectionDuration, 
                location: segment.leg[segment.leg.length - 1].destination 
            });
        }
    });

    const priceMatch = /[0-9]/.exec(opt.saleTotal);

    return {
        id: opt.id,
        price: parseFloat(opt.saleTotal.substring(priceMatch.index)),
        currency: opt.saleTotal.substring(0, priceMatch.index),
        duration: slice.duration,
        carriers: carriers,
        events: events
    };
});

filter(options).then(options => {
    const airports = qpxData.trips.data.airport.reduce(codeReduction, {});
    const carriers = qpxData.trips.data.carrier.reduce(codeReduction, {});

    options.forEach(opt => {
        console.log(optionToReadable(opt, airports, carriers));
    });
});

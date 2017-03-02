'use strict';

const minimist = require('minimist');
const moment = require('moment');
const search = require('./lib/search');

const args = minimist(process.argv.slice(2), {
    default: { date: null, maxPrice: null, maxDuration: null },
    alias: { 'max-price': 'maxPrice', 'max-duration': 'maxDuration' },
    stopEarly: true
});

const maxPrice = args.maxPrice !== null ? parseFloat(args.maxPrice) : null;
const maxDuration = args.maxDuration !== null ? parseInt(args.maxDuration, 10) : null;
const defaultDate = args.date ? moment(args.date) : null;
const filters = [];

if (args._.length === 0 || !args._.every(a => a.indexOf(':') >= 0))
    exit('must specify at least one trip in ORIGIN:DESTINATION[:DATE] format');

if (defaultDate !== null && !defaultDate.isValid())
    exit('--date is not given in a valid date format')

if (maxDuration !== null) {
    if (isNaN(maxDuration) || maxDuration <= 0)
        exit('--max-duration must be a valid positive integer');
    filters.push((options) => options.filter(opt => opt.duration <= maxDuration));
}

if (maxPrice !== null) {
    if (isNaN(maxPrice) || maxPrice <= 0)
        exit('--max-price must be a valid positive number');
    filters.push((options) => options.filter(opt => opt.price < maxPrice));
}

const journeys = args._.map(raw => {
    const parts = raw.split(':');
    const date = parts.length >= 3 ? moment(parts[2]) : defaultDate;

    if (!date || !date.isValid())
        exit(`invalid date found in journey "${raw}", you may specify a default date with --date`);

    return { 
        origin: parts[0].toUpperCase(), 
        destination: parts[1].toUpperCase(),
        date: date.format('YYYY-MM-DD')
    };
});

search(journeys, filters).then(options => {
    options.sort((a,b) => a.price - b.price);
    options.forEach(opt => console.log(optionToReadable(opt)));
}).catch(console.error);



function exit(message, code) {
    console.error(`error: ${message}`);
    process.exit(code || 1);
}

function minutesToReadable(mins) {
    let hours = Math.floor(mins / 60),
        suffix = hours !== 1 ? 's' : '';
    mins = mins % 60;
    return `${hours} hour${suffix} ${mins} minutes`;
};

function eventToReadable(event) {
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

function optionToReadable(option) {
    const dateFormat = 'DD/MM/YYYY HH:mm (Z)';
    const flights = option.events.filter(e => e.type === 'flight');
    const carrierNames = option.carriers.map(c => c.name);

    return `$${option.price} (${option.currency}) | ${flights.length} flights | ${minutesToReadable(option.duration)} | ${carrierNames.join(', ')} | ${flights[0].departure.format(dateFormat)} -> ${flights[flights.length-1].arrival.format(dateFormat)}`
        + `\n    ${option.events.map(eventToReadable).join("\n    ")}\n`;
};
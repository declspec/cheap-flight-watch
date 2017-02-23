let fs = require('fs'),
    moment = require('moment');

const qpxData = JSON.parse(fs.readFileSync('results.json', 'utf8'));

const codeReduction = (acc, item) => {
    acc[item.code] = item;
    return acc;
};

const minutesToReadable = (mins) => {
    let hours = Math.floor(mins / 60);
    mins = mins % 60;

    if (mins < 10) mins = '0'+mins;
    if (hours < 10) hours = '0'+hours;

    return `${hours}:${mins}`;
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

const airports = qpxData.trips.data.airport.reduce(codeReduction, {});
const carriers = qpxData.trips.data.carrier.reduce(codeReduction, {});

console.log(qpxData.trips.tripOption.filter(opt => opt.slice[0].segment.some(s => s.leg.length > 1)).length);


qpxData.trips.tripOption.forEach((opt) => {
    const dateFormat = 'DD-MM-YYYY HH:mm';

    let slice = opt.slice[0],
        firstLeg = getFirstLeg(opt),
        lastLeg = getLastLeg(opt);

    if (!firstLeg || !lastLeg)
        return;
    
    const stops = slice.segment.reduce((acc, s) => acc + s.leg.length, 0);
    const departure = moment(firstLeg.departureTime).zone('+01:00');
    const arrival = moment(lastLeg.arrivalTime).zone('+01:00');

    console.log(`${opt.saleTotal} | ${minutesToReadable(slice.duration)} | ${departure.format(dateFormat)} => ${arrival.format(dateFormat)} | ${stops} stops`);

    slice.segment.forEach((seg) => {

    });
});
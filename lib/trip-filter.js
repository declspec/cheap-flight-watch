var Q = require('q');

const MAX_PRICE = 150;
const MAX_DURATION = 780; // 13 hours

const filters = [
    priceFilter,
    durationFilter
];

module.exports = function filter(tripOptions) {
    return filters.reduce(Q.when, Q(tripOptions));
};

function priceFilter(tripOptions) {
    return tripOptions.filter(opt => opt.price <= MAX_PRICE);
}

function durationFilter(tripOptions) {
    return tripOptions.filter(opt => opt.duration <= MAX_DURATION);
}
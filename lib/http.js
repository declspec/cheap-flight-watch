'use strict';

let Q = require('q'),
    request = require('request');
    
module.exports.get = function(url, headers) {
    let deferred = Q.defer();
    request(url, resolver(deferred, headers));
    return deferred.promise;
};

module.exports.post = function(url, body, headers) {
    let deferred = Q.defer();
    request.post({ 
        url: url, 
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
    }, resolver(deferred, headers));

    return deferred.promise.then(res => JSON.parse(res));
};

function resolver(deferred, headers) {
    return (err, res, body) => {
        if (err != null) 
            deferred.reject(err);
        else {
            if (headers != null && typeof(headers) === 'object') {
                Object.assign(headers, res.headers);
                headers['status-code'] = res.statusCode;
            }

            deferred.resolve(body);
        }
    }
}
var Q = require('q'),
    sqlite3 = require('sqlite3');

const DDL_TABLE_FEED_ENTRY = `
CREATE TABLE IF NOT EXISTS feed_entry (
    id              integer primary key,
    guid            varchar(32) not null,
    feed            varchar(128) not null,
    description     text not null,
    sources         text not null,
    date_created    integer not null
);`;

const DDL_TABLE_FEED_CACHE = `
CREATE TABLE IF NOT EXISTS feed_cache (
    feed            varchar(128) not null primary key,
    xml             text not null,
    date_modified   integer not null
) WITHOUT ROWID;`;

const DDL_IDX_FEED_ENTRY_FEED = `
CREATE INDEX IF NOT EXISTS idx_feed_entry_feed_guid ON feed_entry(feed, guid);`;

const SQL_INSERT_FEED_ENTRY = `
INSERT INTO feed_entry(feed, guid, description, sources, date_created) VALUES(?,?,?,?,CURRENT_TIMESTAMP);`;

const SQL_SELECT_FEED_ENTRY = `
SELECT id, guid, description, sources, date_created FROM feed_entry WHERE feed = ? ORDER BY date_created DESC`;

const SQL_SELECT_LATEST_FEED_ENTRY = `
SELECT id, guid, description, sources, date_created FROM feed_entry WHERE feed = ? ORDER BY date_created DESC LIMIT 1;`;

const SQL_SELECT_FEED_CACHE = `
SELECT feed, xml, date_modified FROM feed_cache WHERE feed = ?;`;

const SQL_INSERT_FEED_CACHE = `
INSERT INTO feed_cache(feed, xml, date_modified) VALUES(?, ?, CURRENT_TIMESTAMP);`;

const SQL_UPDATE_FEED_CACHE = `
UPDATE feed_cache SET xml = ?, date_modified = CURRENT_TIMESTAMP WHERE feed = ?;`;

module.exports = function(path) {
    const db = new sqlite3.Database(path),
        dbRun = Q.nbind(db.run, db);

    return dbRun(DDL_TABLE_FEED_ENTRY)
        .then(() => dbRun(DDL_TABLE_FEED_CACHE))
        .then(() => dbRun(DDL_IDX_FEED_ENTRY_FEED))
        .then(() => new Database(db));
};

class Database {
    constructor(db) {
        this.$db = db;
        this.$all = Q.nbind(db.all, db);
        this.$get = Q.nbind(db.get, db);
        this.$run = Q.nbind(db.run, db);
    }

    saveFeedEntries(feed, entries) {
        return this.$transaction((db) => {
            let stmt = db.prepare(SQL_INSERT_FEED_ENTRY);

            for(var entry of entries) 
                stmt.run([ feed, entry.guid, entry.description, JSON.stringify(entry.sources) ]);

            stmt.finalize();
        });
    }  

    saveFeedEntry(feed, entry) {
        const params = [ feed, entry.guid, entry.description, JSON.stringify(entry.sources) ];
        return this.$run(SQL_INSERT_FEED_ENTRY, params);
    }

    saveFeedCache(feed, xml) {
        return this.$run(SQL_INSERT_FEED_CACHE, [ feed, xml ]);
    }

    updateFeedCache(feed, xml) {
        return this.$run(SQL_UPDATE_FEED_CACHE, [ xml, feed ]);
    }

    findFeedEntries(feed, limit=200) {
        return this.$all(SQL_SELECT_FEED_ENTRY + ` LIMIT ${limit};`, [ feed ])
            .then(deserializeRows);
    }

    findFeedLatestEntry(feed) {
        return this.$get(SQL_SELECT_LATEST_FEED_ENTRY, [ feed ])
            .then(deserializeRow);
    }

    findFeedCache(feed) {
        return this.$get(SQL_SELECT_FEED_CACHE, [ feed ]);
    }

    $transaction(fn) {
        let promise = null;

        this.$db.serialize(() => {
            this.$db.exec('begin transaction');
            fn(this.$db);
            promise = Q.ninvoke(this.$db, 'exec', 'commit');
        });

        return promise;
    }
};


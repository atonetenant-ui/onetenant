// db.js — NeDB embedded database
// Data stored in /data folder (persists on Render disk)
const Datastore = require('nedb-promises');
const path      = require('path');
const fs        = require('fs');

// Use /data for persistent storage on Render, fallback to local
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = {
  users:         Datastore.create({ filename: path.join(DATA_DIR, 'users.db'),         autoload: true }),
  properties:    Datastore.create({ filename: path.join(DATA_DIR, 'properties.db'),    autoload: true }),
  units:         Datastore.create({ filename: path.join(DATA_DIR, 'units.db'),          autoload: true }),
  tenants:       Datastore.create({ filename: path.join(DATA_DIR, 'tenants.db'),        autoload: true }),
  payments:      Datastore.create({ filename: path.join(DATA_DIR, 'payments.db'),       autoload: true }),
  subscriptions: Datastore.create({ filename: path.join(DATA_DIR, 'subscriptions.db'), autoload: true }),
  notifications: Datastore.create({ filename: path.join(DATA_DIR, 'notifications.db'), autoload: true }),
};

db.users.ensureIndex({ fieldName: 'email', unique: true });
db.properties.ensureIndex({ fieldName: 'landlordId' });
db.tenants.ensureIndex({ fieldName: 'landlordId' });
db.payments.ensureIndex({ fieldName: 'tenantId' });

module.exports = db;

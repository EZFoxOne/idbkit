/**
 * Runs migration functions during database upgrade
 * @param {IDBDatabase} db
 * @param {IDBTransaction} transaction
 * @param {number} oldVersion
 * @param {number} newVersion
 * @param {Function[]} migrations - Array of (db, transaction, { fromVersion, toVersion }) => void
 */
export function runMigrations(db, transaction, oldVersion, newVersion, migrations = []) {
  if (!Array.isArray(migrations) || migrations.length === 0) {
    return;
  }

  const context = { fromVersion: oldVersion, toVersion: newVersion };

  for (const migrate of migrations) {
    if (typeof migrate === 'function') {
      migrate(db, transaction, context);
    }
  }
}

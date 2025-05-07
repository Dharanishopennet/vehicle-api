const fs = require('fs');
const neo4j = require('neo4j-driver');

const uri = 'neo4j+s://17f00839.databases.neo4j.io';
const user = 'neo4j';
const password = 'ksefw7fY45lB14tK27p4y4S0hA5wkDp8qKO1gqhynq8';

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
const session = driver.session();

// Read the vehicle data from the vehicle_data.json file
let vehicles = JSON.parse(fs.readFileSync('vehicle_data.json'));

// Automatically assign an id to each vehicle
vehicles = vehicles.map((vehicle, index) => {
  vehicle.id = index + 1; // Set id starting from 1
  return vehicle;
});

async function insertVehicles() {
  try {
    for (const vehicle of vehicles) {
      await session.run(
        `MERGE (v:Vehicle {license_plate: $license_plate})
         SET v.color = $color, v.year = $year, v.model = $model, v.id = $id`,
        vehicle
      );
      console.log(`✅ Synced vehicle ${vehicle.license_plate}`);
    }
    console.log('🚗 All vehicle data synced to Neo4j.');
  } catch (error) {
    console.error('❌ Error inserting data:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

insertVehicles();

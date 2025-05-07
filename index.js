const express = require('express');
const neo4j = require('neo4j-driver');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const basicAuth = require('express-basic-auth');

const app = express();
const port = 3009;

app.use(express.json());

// Neo4j connection setup
const uri = 'neo4j+s://17f00839.databases.neo4j.io';
const user = 'neo4j';
const password = 'ksefw7fY45lB14tK27p4y4S0hA5wkDp8qKO1gqhynq8';
const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
const session = driver.session();

// Swagger setup
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Vehicle API',
      version: '1.0.0',
      description: 'API for managing vehicles in Neo4j database',
    },
    servers: [
      {
        url: `http://localhost:${port}`,
      },
    ],
  },
  apis: ['index.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// 🔒 Basic auth for Swagger only
app.use('/api-docs',
  basicAuth({
    users: { 'admin': 'secret123' }, // Set your credentials
    challenge: true,
  }),
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocs)
);

/**
 * @swagger
 * /vehicle:
 *   get:
 *     summary: Get vehicles based on query filters
 *     parameters:
 *       - in: query
 *         name: license_plate
 *         schema:
 *           type: string
 *       - in: query
 *         name: color
 *         schema:
 *           type: string
 *       - in: query
 *         name: model
 *         schema:
 *           type: string
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of vehicles
 */
app.get('/vehicle', async (req, res) => {
  const { license_plate, color, model, year } = req.query;

  let conditions = [];
  let params = {};

  if (license_plate) {
    conditions.push("v.license_plate = $license_plate");
    params.license_plate = license_plate;
  }
  if (color) {
    conditions.push("v.color = $color");
    params.color = color;
  }
  if (model) {
    conditions.push("v.model = $model");
    params.model = model;
  }
  if (year) {
    conditions.push("v.year = toInteger($year)");
    params.year = parseInt(year);
  }

  const query = `
    MATCH (v:Vehicle)
    ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
    RETURN v
  `;

  try {
    const result = await session.run(query, params);
    const vehicles = result.records.map(record => record.get('v').properties);
    if (vehicles.length === 0) {
      res.status(404).json({ message: 'No vehicles found for the given filters' });
    } else {
      res.json(vehicles);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /vehicle:
 *   post:
 *     summary: Add a new vehicle
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - license_plate
 *               - color
 *               - model
 *               - year
 *             properties:
 *               license_plate:
 *                 type: string
 *               color:
 *                 type: string
 *               model:
 *                 type: string
 *               year:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Vehicle added
 */
app.post('/vehicle', async (req, res) => {
  const { license_plate, color, model, year } = req.body;

  const query = `
    CREATE (v:Vehicle {
      license_plate: $license_plate,
      color: $color,
      model: $model,
      year: toInteger($year)
    })
    RETURN v
  `;

  try {
    const result = await session.run(query, { license_plate, color, model, year });
    const vehicle = result.records[0].get('v').properties;
    res.status(201).json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /vehicle/{license_plate}:
 *   delete:
 *     summary: Delete a vehicle by license plate
 *     parameters:
 *       - in: path
 *         name: license_plate
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vehicle deleted
 *       404:
 *         description: Vehicle not found
 */
app.delete('/vehicle/:license_plate', async (req, res) => {
  const { license_plate } = req.params;

  const query = `
    MATCH (v:Vehicle {license_plate: $license_plate})
    DELETE v
  `;

  try {
    const result = await session.run(query, { license_plate });

    if (result.summary.counters.updates().nodesDeleted === 0) {
      res.status(404).json({ message: 'Vehicle not found' });
    } else {
      res.status(200).json({ message: 'Vehicle deleted' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚗 Vehicle API running at http://localhost:${port}`);
  console.log(`🔐 Swagger docs at http://localhost:${port}/api-docs`);
});

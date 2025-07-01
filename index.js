const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// load environment variabl from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleweare 
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@clustersheauly.6uz8dzi.mongodb.net/?retryWrites=true&w=majority&appName=ClusterSheauly`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const db = client.db('percelDB');
        const parcelCollection = db.collection('parcels');

        app.get('/parcels', async (req, res) => {
            const parcel = await parcelCollection.find().toArray();
            res.send(parcel);
        })
        // paarcels api
        // Get: All parcels  or parcels by user (created_by), sorted by latest 
        app.get('/parcels', async (req, res) => {
            try {
                const id = req.params.id;

                const parcel = await parcelCollection.findOne({
                    _id: new ObjectId(id)
                });

                if (!parcel) {
                    return res.status(404).send({ message: 'Parcel not found' })
                }
                res.send(parcel);
            }

            catch (error) {
                console.error('Error featching prcels:', error);
                res.status(500).send({ message: 'Falled to get parceles' })
            }
        })


        // Inside your run() function
        app.get('/parcels/:id', async (req, res) => {
            try {
                const { id } = req.params;

                // Validate ID
                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({ message: 'Invalid Parcel ID' });
                }

                // Fetch parcel by _id
                const parcel = await parcelCollection.findOne({ _id: new ObjectId(id) });

                if (!parcel) {
                    return res.status(404).send({ message: 'Parcel not found' });
                }

                res.send(parcel);
            } catch (error) {
                console.error('Error fetching parcel by ID:', error);
                res.status(500).send({ message: 'Failed to fetch parcel' });
            }
        });

        app.post('/parcels', async (req, res) => {
            try {
                const newParcel = req.body;
                // newParcel.createAt = Date();
                const result = await parcelCollection.insertOne(newParcel);
                res.status(201).send(result);
            }
            catch (error) {
                console.error('error inserting parcel:', error)
                res.status(500).send({ message: 'Failed to create parcel' })
            }
        })

        app.delete('/parcels/:id', async (req, res) => {
            try {
                const id = req.params.id;

                const result = await parcelCollection.deleteOne({ _id: new ObjectId(id) });

                res.send(result);
            }
            catch (error) {
                console.error('Error deleting parcel:', error);
                res.status(500).send({ message: "Failed to delete " })
            }

        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


// Sample route 
app.get('/', (req, res) => {
    res.send('parcel Server is running');
})

// Start the server 
app.listen(port, () => {
    console.log(`server is listing on port ${port}`);
})

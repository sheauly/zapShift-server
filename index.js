const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// load environment variabl from .env file
dotenv.config();

const stripe = require('stripe')(process.env.PAYMENT_GATE_KEY);

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
        const paymentsCollection = db.collection('payment')

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

        app.get('/payments', async (req, res) => {
            try {
                const userEmail = req.query.email;
                const query = userEmail ? { email: userEmail } : {}
                const options = { sort: { paid_at: -1 } };

                const payments = await paymentsCollection.find(query, options).toArray();
                res.send(payments);

            }
            catch (error) {
                console.error('Error fetching peyment history:', error);
                res.status(500).send({ message: 'Faled to get payments' })
            }
        })

        app.post("/tracking", async (req, res) => {
            const { tracking_id, parcel_id, status, message, updated_by } = req.body;

            const log = {
                tracking_id,
                parcel_id: parcel_id ? new ObjectId(parcel_id) : undefined,
                status,
                message,
                time: new Date(),
                updated_by,
            }
        });


        // POst: Record payment and update parcel status
        app.post('/payments', async (req, res) => {

            try {
                const { parcelId, email, amount, paymentMethod, transactionId } = req.body;

                console.log(req.body);
                // 1. update parcel's payment_staus
                const updateResult = await parcelCollection.updateOne(
                    { _id: new ObjectId(parcelId) },
                    {
                        $set: {
                            payment_status: 'paid'
                        }
                    }
                )

                if (updateResult.modifiedCount === 0) {
                    return res.status(404).send({ message: 'Parcel not found or already paid' });
                }
                // 2. Insert payment recors
                const paymentDoc = {
                    parcelId,
                    email, amount,
                    paymentMethod,
                    transactionId,
                    paid_at_string: new Date().toISOString(),
                    paid_at: new Date(),
                };
                const paymentResult = await paymentsCollection.insertOne(paymentDoc);

                res.status(201).send({
                    message: 'Payment recorded and parcel marked as parcel paid',
                    insertedId: paymentResult.insertedId,
                })

            }
            catch (error) {
                console.log("Payment processing failed:", error);
                res.status(500).send
                    ({ message: 'Falled to record payment' })
            }
        })

        app.post('/create-payment-intent', async (req, res) => {
            const amountInCents = req.body.amountInCents

            try {
                const paymentIntent = await stripe.paymentIntents.create({

                    amount: amountInCents, // amount in cents
                    currency: 'usd',
                    payment_method_types: ['card'],
                });

                res.json({ clientSecret: paymentIntent.client_secret });
            } catch (error) {
                res.status(500).json({ error: error.message });
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

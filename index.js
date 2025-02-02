const express = require('express')
const cors = require('cors')
const app = express()
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jcr26.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message:'unauthorized access'})
  } 
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if(error){
      return res.status(403).send({error: true, message:'unauthorized access'})
    }
    req.decoded = decoded;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();

    const volunteerCollection = client.db('bdVolunteer').collection('volunteers');
    const bookingCollection = client.db('bdVolunteer').collection('bookings');
  
    // jwt
    app.post('/jwt', (req, res) =>{
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: '1h' });
      res.send({token});

    
    })


    app.get('/volunteers', async (req, res) => {
      const cursor = volunteerCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/volunteers/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const options = {
        projection: { title: 1, img: 1 }
      };
      const result = await volunteerCollection.findOne(query, options);
      res.send(result);
    })

    // bookings
    app.get('/bookings', verifyJWT, async (req, res) => {
      const decoded = req.decoded;
      
      if(decoded.email !== req.query.email){
        return res.status(403).send({error: true, message:'forbidden access'})
      }

      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const cursor = bookingCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })


    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    })

    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result)
    })

    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateBooking = req.body;
      console.log(updateBooking);
      const updateDoc = {
        $set: {
          status: updateBooking.status
        }
      }
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);

    })






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Volunteer is coming')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
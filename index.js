const express = require('express');
const app = express();
const cors = require('cors');
var ObjectId = require('mongodb').ObjectId;
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT||5000;

// midleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ulqow.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run(){

    try{
    await client.connect();
    
   const productCollection = client.db('tools_mart').collection('products'); 
   const orderCollection = client.db('tools_mart').collection('orders'); 
 
   app.get('/product', async (req, res)=>{
       const query = {};
       const cursor = productCollection.find(query);
       const products = await cursor.toArray();
       res.send(products);
   })
   app.get('/purchase/:id', async(req, res) => {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const product = await productCollection.findOne(query);
    res.send(product);
  })

  // Order api
  app.post('/orders', async(req, res) =>{
    const order = req.body;
    console.log('adding new user', order);
    const result = await orderCollection.insertOne(order);
    res.send(result)
});
// order get api
  app.get('/orders', async(req,res)=>{
    const userEmail =req.query.userEmail;
    const query = {userEmail:userEmail};
    const orders = await orderCollection.find(query).toArray();
    res.send(orders);
    
  })

  // delete api
  app.delete('/dashboard/:id', async (req, res)=>{
    const id = req.params.id;
    const query = {_id: ObjectId(id)};
    const result = await orderCollection.deleteOne(query);
    res.send(result);

})

    }
finally{

}
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello tools mart World!')
})

app.listen(port, () => {
  console.log(`Tools mart app listening on port ${port}`)
})
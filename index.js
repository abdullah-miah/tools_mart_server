const express = require('express');
const app = express();
const cors = require('cors');
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
 
   app.get('/product', async (req, res)=>{
       const query = {};
       const cursor = productCollection.find(query);
       const products = await cursor.toArray();
       res.send(products);
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
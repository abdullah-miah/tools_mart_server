const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
var ObjectId = require('mongodb').ObjectId;
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT||5000;

// midleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ulqow.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded;
    next();
  });
}

async function run(){

    try{
    await client.connect();
    
  //  const productsCollection = client.db('tools_mart').collection('products'); 
   const orderCollection = client.db('tools_mart').collection('orders'); 
   const userCollection = client.db('tools_mart').collection('users'); 
   const productsCollection = client.db('tools_mart').collection('product'); 
   const paymentCollection = client.db('tools_mart').collection('payment'); 
   const reviewCollection = client.db('tools_mart').collection('review'); 
 
   app.get('/product', async (req, res)=>{
       const query = {};
       const cursor = productsCollection.find(query);
       const products = await cursor.toArray();
       res.send(products);
   })

   app.get('/myprofile', async(req,res)=>{
     const email =req.query.email;
     const query = ({email:email});
     const user = await userCollection.find(query).toArray();
     res.send(user)
   })
   app.get('/purchase/:id', async(req, res) => {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const product = await productsCollection.findOne(query);
    res.send(product);
  })
  //  app.get('/user/:id', async(req, res) => {
  //   const id = req.params.id;
  //   const query = { _id: ObjectId(id) };
  //   const user = await userCollection.findOne(query);
  //   res.send(user);
  // })

  app.post('/create-payment-intent', verifyJWT, async(req, res) =>{
    const service = req.body;
    const price = service.price;
    const amount = price*100;
    const paymentIntent = await stripe.paymentIntents.create({
      amount : amount,
      currency: 'usd',
      payment_method_types:['card']
    });
    res.send({clientSecret: paymentIntent.client_secret})
  })

  app.patch('/payment/:id', verifyJWT, async(req, res) =>{
    const id  = req.params.id;
    const payment = req.body;
    const filter = {_id: ObjectId(id)};
    const updatedDoc = {
      $set: {
        paid: true,
        transactionId: payment.transactionId
      }
    }

    const result = await paymentCollection.insertOne(payment);
    const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
    res.send({result,updatedOrder});
  })


  // Order api
  app.post('/orders', async(req, res) =>{
    const order = req.body;
    const result = await orderCollection.insertOne(order);
    res.send(result)
});
  app.post('/review', async(req, res) =>{
    const review = req.body;
    const result = await reviewCollection.insertOne(review);
    res.send(result)
});
app.get('/payment/:id', async(req, res) =>{
  const id = req.params.id;
  const query = {_id: ObjectId(id)};
  const payment = await orderCollection.findOne(query);
  res.send(payment);
})

app.get('/clientReview', async(req,res)=>{
  const review = await reviewCollection.find().toArray();
  res.send(review);
})
app.get('/alluser', async (req,res)=>{
  const user = await userCollection.find().toArray();
  res.send(user)
})

// order get api
  app.get('/orders', verifyJWT, async(req,res)=>{
    const userEmail =req.query.userEmail;
    const decodedEmail =req.decoded.email;
    if(userEmail === decodedEmail){
      const query = {userEmail:userEmail};
    const orders = await orderCollection.find(query).toArray();
    return res.send(orders);
    }else{
      return res.status(403).send({meassage: 'Forbiden access'})
    }
    
    
  });
  app.get('/products', verifyJWT, async(req,res)=>{
    const userEmail =req.query.userEmail;
    const decodedEmail =req.decoded.email;
    if(userEmail === decodedEmail){
      const query = {userEmail:userEmail};
    const products = await productsCollection.find(query).toArray();
    return res.send(products);
    }else{
      return res.status(403).send({meassage: 'Forbiden access'})
    }
    
    
  });
  app.get('/admin/:email', async(req, res) =>{
    const email = req.params.email;
    const user = await userCollection.findOne({email: email});
    const isAdmin = user.role === 'admin';
    res.send({admin: isAdmin})
  })

  // app.put('/user/admin/:email', verifyJWT, async(req,res)=>{
  //   const email = req.params.email;
  //   const filter ={email:email};
  //   const updateDoc ={
  //     $set: {role: 'admin'},
  //   };
  //   const result = await userCollection.updateOne(filter, updateDoc);
  //   res.send(result)
  // });
  app.put('/user/admin/:email', verifyJWT, async (req, res) => {
    const email = req.params.email;
    const requester = req.decoded.email;
    const requesterAccount = await userCollection.findOne({ email: requester });
    if (requesterAccount.role === 'admin') {
      const filter = { email: email };
      const updateDoc = {
        $set: { role: 'admin' },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    }
    else{
      res.status(403).send({message: 'forbidden'});
    }

  })
  app.post('/products',async (req, res) => {
    const product = req.body;
    const result = await productsCollection.insertOne(product);
    res.send(result);
  });


  //  user put
  app.put('/user/:email', async(req,res)=>{
    const email = req.params.email;
    const user =req.body;
    const filter ={email:email};
    const options ={ upsert: true};
    const updateDoc ={
      $set: user,
    };
    const result = await userCollection.updateOne(filter, updateDoc, options);
   const token=jwt.sign({email: email},process.env.ACCESS_TOKEN_SECRET,{expiresIn: '1h'})
    res.send({result,token})
  });

  app.put('/updatedProducts/:id', async (req, res)=>{
    const id = req.params.id;
    const updatedProduct = req.body;
    const filter ={_id: ObjectId(id)};
    const options = { upsert: true}
    const udatedDoc ={
        $set:{
            price: updatedProduct.price,
            min_Quantity: updatedProduct.min_Quantity,
            available_Quantity: updatedProduct.available_Quantity,
        }
    };
    const result = await productsCollection.updateOne(filter, udatedDoc, options)
} )
  // delete api
  app.delete('/dashboard/:id', async (req, res)=>{
    const id = req.params.id;
    const query = {_id: ObjectId(id)};
    const result = await orderCollection.deleteOne(query);
    res.send(result);

})
  app.delete('/deleteUsers/:id', async (req, res)=>{
    const id = req.params.id;
    const query = {_id: ObjectId(id)};
    const result = await userCollection.deleteOne(query);
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
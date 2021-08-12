const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient } = require("mongodb");
const uri = "mongodb+srv://User:ej2QoSI2P3KQIC7U@userdatabase.foixv.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const client = new MongoClient(uri);
const mongo = require('mongodb');

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

//Middleware to handle post requests
app.use(express.urlencoded({
  extended: true
}));
//Handle create user requests
app.post('/api/users', function(req, res) {
  const username = req.body.username;
  async function insertUser() {
    let result;
    try {
      await client.connect();
      const database = client.db("UserDatabase");
      const users = database.collection("users");
      // check if there is a user with the same username
      if (await users.findOne({ username: username })) {
        res.json({ error: "Username already taken" });
        return;
      } else {
        // create a document to be inserted
        const doc = { username: username };
        result = await users.insertOne(doc);
        res.json({ username: username, _id: result.insertedId.toString() })
      }
    } finally {
      await client.close();
    }
  }
  insertUser().catch(console.dir);
})
//Handle add exercise requests
app.post('/api/users/:_id/exercises', function(req, res, next) {
  async function addExercise() {
    try {
      await client.connect();
      const database = client.db("UserDatabase");
      const users = database.collection("users");
      // check if the provided object id is valid
      let o_id;
      try {
        o_id = new mongo.ObjectId(req.params['_id']);
      } catch (error) {
        next(new Error('Invalid user Id: ' + error));
        return;
      }
      // check if there is a description
      if (req.body.description.length == 0) {
        next(new Error('You must provide a description'));
        return;
      }
      // check it the duration is valid
      let duration = req.body.duration;
      if (!duration) {
        next(new Error('You must provide a duration'));
        return;
      } else {
        if (/^\d+$/.test(duration)) {
          duration = parseInt(duration);
        } else {
          next(new Error('You must provide a number for the duration'));
          return;
        }
      }
      // Create a date object
      let date;
      if (!req.body.date) {
        date = new Date();
      } else {
        date = new Date(req.body.date);
      }
      let exerciseObject = {
        description: req.body.description,
        duration: duration,
        date: date.getTime(),
      };
      // create a filter for a user to update
      const filter = { "_id": o_id };
      // create a document that sets the plot of the movie
      const updateDoc = { $push: { exercises: exerciseObject } };
      const result = await users.updateOne(filter, updateDoc, { new: true });
      // check if there was found any user
      let username;
      if (result.matchedCount === 0) {
        res.json({ error: "No users found with the given id" });
        return;
      } else {
        //Find the username to include it in the response
        try {
          await client.connect();
          const database = client.db("UserDatabase");
          const users = database.collection("users");
          const user = await users.findOne({ "_id": o_id });
          username = user.username;
        } finally {
          await client.close();
        }
      }
      res.json({
        _id: req.params['_id'],
        username: username,
        date: date.toDateString(),
        duration: duration,
        description: req.body.description
      });
    } finally {
      await client.close();
    }
  }
  addExercise().catch(console.dir);
})
//Handle get request of all users in the database
app.get('/api/users', function(req, res) {
  async function findAllUsers() {
    let usersArray = [];
    try {
      await client.connect();
      const database = client.db("UserDatabase");
      const users = database.collection("users");
      const options = {
        // Include only the `title` and `username` fields in the returned document
        projection: { _id: 1, username: 1 },
      };
      const cursor = await users.find({}, options);
      // replace console.dir with your callback to access individual elements
      await cursor.forEach(function(item) {
        usersArray.push(item)
      });
    } finally {
      res.json(usersArray)
      await client.close();
    }
  }
  findAllUsers().catch(console.dir);
})
//Handle get request of a certain user 
app.get('/api/users/:_id/logs', function(req, res, next) {
  let fromDate;
  if (req.query.from) {
    fromDate = new Date(req.query.from).getTime()
  }
  let toDate;
  if (req.query.to) {
    toDate = new Date(req.query.to).getTime()
  }
  let limit = req.query.limit;
  async function findACertainUser() {
    let user;
    try {
      await client.connect();
      const database = client.db("UserDatabase");
      const users = database.collection("users");
      let o_id;
      try {
        o_id = new mongo.ObjectId(req.params['_id']);
      } catch (error) {
        next(new Error('Invalid user Id: ' + error));
        return;
      }
      user = await users.findOne({ "_id": o_id });
    } finally {
      let exercises = [];
      user.exercises.forEach(function (item) {
        if (fromDate && fromDate >= item.date) {
          return;
        }
        if (toDate && toDate <= item.date) {
          return;
        }
        if (limit && limit <= exercises.length) {
          return;
        }
        exercises.push({
          description: item.description,
          duration: item.duration,
          date: new Date(item.date).toDateString()
          })
      })
      res.json({
        _id: req.params['_id'],
        username: user.username,
        count: exercises.length,
        log: exercises
      })
      await client.close();
    }
  }
  findACertainUser().catch(console.dir);
})
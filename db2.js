const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mysql = require('mysql');
const cors = require('cors');
const port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'yourusername',
  password: 'yourpassword',
  database: 'yourdatabase'
});

app.use(express.json());
app.use(cors());

// add new user
app.post('/users', (req, res) => {
  const { UserID, FirstName, LastName, ProfilePicture, Bio } = req.body;
  const sql = `INSERT INTO Users (UserID, FirstName, LastName, ProfilePicture, Bio) 
               VALUES (${UserID}, '${FirstName}', '${LastName}', '${ProfilePicture}', '${Bio}')`;

  connection.query(sql, (error, results) => {
    if (error) throw error;
    console.log(`New user with ID ${UserID} has been added to the database.`);
    res.send('User added successfully.');
  });
});


// get a user
app.get('/users/:id', (req, res) => {
  const userID = req.params.id;
  const sql = `SELECT * FROM Users WHERE UserID = ${userID}`;

  connection.query(sql, (error, results) => {
    if (error) throw error;
    if (results.length === 0) {
      res.status(404).send('User not found.');
    } else {
      res.send(results[0]);
    }
  });
});


// get friends list
app.get('/users/:id/friends', (req, res) => {
  const userID = req.params.id;
  const sql = `SELECT Users.UserID, Users.FirstName, Users.LastName
               FROM Friends
               JOIN Users ON Friends.FriendID = Users.UserID
               WHERE Friends.UserID = ${userID}`;

  connection.query(sql, (error, results) => {
    if (error) throw error;
    if (results.length === 0) {
      res.status(404).send('User has no friends.');
    } else {
      res.send(results);
    }
  });
});



// adding new friend

app.post('/users/:id/friends', (req, res) => {
  const userID = req.params.id;
  const friendID = req.body.friendID;

  // Check if friendID is already a friend of userID
  const checkSQL = `SELECT * FROM Friends WHERE UserID = ${userID} AND FriendID = ${friendID}`;
  connection.query(checkSQL, (error, results) => {
    if (error) throw error;
    if (results.length > 0) {
      res.status(400).send('User is already friends with this friend.');
    } else {
      // Insert new friend record into Friends table
      const insertSQL = `INSERT INTO Friends (UserID, FriendID) VALUES (${userID}, ${friendID})`;
      connection.query(insertSQL, (error, results) => {
        if (error) throw error;
        res.send('Friend added successfully.');
      });
    }
  });
});


// create group
app.post('/groups', (req, res) => {
  const groupName = req.body.groupName;
  const groupDesc = req.body.groupDescription;
  const memberIDs = req.body.memberIDs;

  // Insert new group record into Groups table
  const insertSQL = `INSERT INTO Groups (GroupName, GroupDescription) VALUES ('${groupName}', '${groupDesc}')`;
  connection.query(insertSQL, (error, results) => {
    if (error) throw error;
    const groupID = results.insertId;

    // Insert new user-group records into User_Groups table
    let userGroupSQL = 'INSERT INTO User_Groups (UserID, GroupID) VALUES ';
    for (let i = 0; i < memberIDs.length; i++) {
      userGroupSQL += `(${memberIDs[i]}, ${groupID}), `;
    }
    userGroupSQL = userGroupSQL.slice(0, -2); // Remove last comma and space
    connection.query(userGroupSQL, (error, results) => {
      if (error) throw error;
      res.send('Group created successfully.');
    });
  });
});



// get groups by user

app.get('/groups/:userID', (req, res) => {
  const userID = req.params.userID;

  const sql = `
    SELECT Groups.GroupID, Groups.GroupName, Groups.GroupDescription
    FROM Groups
    INNER JOIN User_Groups ON Groups.GroupID = User_Groups.GroupID
    WHERE User_Groups.UserID = ${userID}
  `;
  connection.query(sql, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});



// create a page
app.post('/pages', (req, res) => {
  const { pageID, pageName, pageDescription } = req.body;

  const sql = `
    INSERT INTO Pages (PageID, PageName, PageDescription)
    VALUES (${pageID}, '${pageName}', '${pageDescription}')
  `;
  connection.query(sql, (error, results) => {
    if (error) throw error;
    res.json({ message: 'Page created successfully' });
  });
});


// Create a new like
app.post('/likes', (req, res) => {
  const { userID, pageID } = req.body;

  const sql = `
    INSERT INTO Likes (UserID, PageID)
    VALUES (${userID}, ${pageID})
  `;
  connection.query(sql, (error, results) => {
    if (error) throw error;
    res.json({ message: 'Like added successfully' });
  });
});

// Get the details of a user's likes
app.get('/likes/:userID', (req, res) => {
  const userID = req.params.userID;

  const sql = `
    SELECT Users.UserID, Users.FirstName, Users.LastName, Pages.PageID, Pages.PageName
    FROM Likes
    INNER JOIN Users ON Likes.UserID = Users.UserID
    INNER JOIN Pages ON Likes.PageID = Pages.PageID
    WHERE Likes.UserID = ${userID}
  `;
  connection.query(sql, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});



// Add a new post
app.post('/posts', (req, res) => {
  const { userID, content } = req.body;

  const post = {
    userID,
    content,
    datePosted: new Date()
  };

  const query = 'INSERT INTO Posts SET ?';
  connection.query(query, post, (err, result) => {
    if (err) {
      res.status(500).send(err);
    } else {
      post.postID = result.insertId;
      res.send(post);
    }
  });
});

// Get all posts
app.get('/posts', (req, res) => {
  const query = 'SELECT * FROM Posts';
  connection.query(query, (err, result) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.send(result);
    }
  });
});

// Get comments for a specific post
app.get('/posts/:postId/comments', (req, res) => {
  const { postId } = req.params;

  const query = 'SELECT * FROM Comments WHERE PostID = ?';
  connection.query(query, [postId], (err, result) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.send(result);
    }
  });
});

// Add a new comment to a post
app.post('/posts/:postId/comments', (req, res) => {
  const { postId } = req.params;
  const { userID, content } = req.body;

  const comment = {
    postID: postId,
    userID,
    content,
    datePosted: new Date()
  };

  const query = 'INSERT INTO Comments SET ?';
  connection.query(query, comment, (err, result) => {
    if (err) {
      res.status(500).send(err);
    } else {
      comment.commentID = result.insertId;
      res.send(comment);
    }
  });
});


// GET request to get all events
app.get('/events', (req, res) => {
  connection.query('SELECT * FROM Events', (error, results, fields) => {
    if (error) throw error;
    res.send(results);
  });
});

// POST request to create a new event
app.post('/events', (req, res) => {
  const { EventID, EventName, EventDescription, EventDate, Location } = req.body;
  const sql = 'INSERT INTO Events (EventID, EventName, EventDescription, EventDate, Location) VALUES (?, ?, ?, ?, ?)';
  const values = [EventID, EventName, EventDescription, EventDate, Location];

  connection.query(sql, values, (error, results, fields) => {
    if (error) throw error;
    res.send(`Event with ID ${EventID} has been added.`);
  });
});

// GET request to get all events for a user
app.get('/users/:userID/events', (req, res) => {
  const userID = req.params.userID;
  const sql = 'SELECT Events.EventID, EventName, EventDescription, EventDate, Location FROM User_Events JOIN Events ON User_Events.EventID = Events.EventID WHERE User_Events.UserID = ?';
  
  connection.query(sql, [userID], (error, results, fields) => {
    if (error) throw error;
    res.send(results);
  });
});

// POST request to add a user to an event
app.post('/users/:userID/events/:eventID', (req, res) => {
  const userID = req.params.userID;
  const eventID = req.params.eventID;
  const sql = 'INSERT INTO User_Events (UserID, EventID) VALUES (?, ?)';

  connection.query(sql, [userID, eventID], (error, results, fields) => {
    if (error) throw error;
    res.send(`User with ID ${userID} has been added to the event with ID ${eventID}.`);
  });
});



//post a marketplace item  
app.post('/marketplace', (req, res) => {
  const { seller_id, item_name, item_description, price, location } = req.body;

  // validate required fields
  if (!seller_id || !item_name || !price) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  // construct SQL query to insert new item into Marketplace table
  const sql = `INSERT INTO Marketplace (SellerID, ItemName, ItemDescription, Price, Location)
               VALUES (?, ?, ?, ?, ?)`;

  // execute SQL query
  connection.query(sql, [seller_id, item_name, item_description, price, location], (err, result) => {
    if (err) throw err;
    console.log('New item added to Marketplace table.');
    res.status(201).json({ message: 'Item added successfully.' });
  });
});

// POST method to add a new message
app.post('/messages', (req, res) => {
  const { senderID, receiverID, messageContent, dateSent } = req.body;

  const newMessage = {
    senderID,
    receiverID,
    messageContent,
    dateSent
  };

  connection.query('INSERT INTO Messages SET ?', newMessage, (error, results) => {
    if (error) {
      console.error('Error adding message to database: ', error);
      res.status(500).send('Error adding message to database');
    } else {
      console.log('Message added to database successfully');
      res.status(201).send('Message added to database successfully');
    }
  });
});

// GET method to retrieve all messages
app.get('/messages', (req, res) => {
  connection.query('SELECT * FROM Messages', (error, results) => {
    if (error) {
      console.error('Error retrieving messages from database: ', error);
      res.status(500).send('Error retrieving messages from database');
    } else {
      console.log('Messages retrieved from database successfully');
      res.status(200).json(results);
    }
  });
});


app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

// [START appengine_websockets_app]

  // Initialize Firebase
 
const {Datastore} = require('@google-cloud/datastore');
const datastore = new Datastore();
const DB= require('node-json-db');
const Con =require('node-json-db/dist/lib/JsonDBConfig');

var db=new DB.JsonDB(new Con.Config("final", true, true, '/'));

const app = require('express')();
app.set('view engine', 'pug');
app.enable('trust proxy');
const server = require('http').Server(app);
const io = require('socket.io')(server);

app.get('/', (req, res) => {
  res.render('index.pug');
});
io.on('connection', socket => {
  socket.on('info',user=>{
    io.emit('event', user+'  connected');
    const s1='/MNIT/'+user;
    db.push(s1,socket.id,false);
    console.log(user);
    console.log(socket.id);
  
  socket.on('disconnect', function () {
    var s2='/MNIT/'+user;
    io.emit('event',user+'  disconnect');
    db.delete(s2);
  });
  socket.on('room join',room=>{
    io.emit('event',user+'  joined room ' +room );
    socket.join(room);
  });
  socket.on('receiver chat message', msg => {
    console.log(socket.id);
      try{
      datastore.save({
        key:datastore.key('personalchat'),
        data:{message:msg.mes}
      }).then(()=>{
     var data= db.getData('/MNIT/'+msg.rid);
     console.log(data);
     io.to(`${data}`).emit("receiver chat message",{sid:msg.sid,message:msg.mes});
     //socket.to(`${msg.roomid}`).emit("chat message",{id:msg.sid,message:msg.mes,roomid:msg.roomid});
      }).catch((err)=>{
        console.log(err.toString());
      });
      
    }
    catch(e){
      console.log(e.toString());
    }
  });
    socket.on('room chat message', msg => {
    console.log(socket.id);
    console.log("message recieved");
      try{
      datastore.save({
        key:datastore.key('personalchat'),
        data:{message:msg.mes}
      }).then(()=>{
        console.log(msg.roomid);
     socket.to(`${msg.roomid}`).emit("room chat message",{sid:msg.sid,message:msg.mes,roomid:msg.roomid});
      }).catch((err)=>{
        console.log(err.toString());
      });
    }
    catch(e){
      console.log(e.toString());
    }
  });

});
});
if (module === require.main) {
  const PORT = process.env.PORT || 8080;
  server.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');
  });
}
// [END appengine_websockets_app]

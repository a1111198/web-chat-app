"use strict";
////client disconnect is left till now//
const DB = require("node-json-db");
const Con = require("node-json-db/dist/lib/JsonDBConfig");
var db = new DB.JsonDB(new Con.Config("final", true, true, "/"));
const app = require("express")();
app.enable("trust proxy");
app.set("view engine", "pug");
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { Client } = require("pg");
app.get("/", (req, res) => {
  res.render("index.pug");
});
if (module === require.main) {
  const PORT = process.env.PORT || 80;
  server.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    console.log("Press Ctrl+C to quit.");
  });
}
console.log("server started");
io.on("connection", (socket) => {
  var userid = "";
  try {
    if (socket.handshake.headers["userid"] != null) {
      userid = socket.handshake.headers["userid"];
    } else {
      userid = socket.handshake.headers.referer.substring(59);
    }
    console.log(userid);
    try {
      const s1 = "/" + userid;
      db.push(s1, socket.id, false);
      console.log(socket.id);
      const client = new Client({
        user: "***",
        host: "****",
        database: "******",
        password: "********",
        port: 5432,
      });
      client.connect();
      socket.on("send_message", (msg) => {
        console.log(msg);
        if (typeof msg == "string") {
          msg = JSON.parse(msg);
        }
        var message = msg.message;
        var receiverid = msg.receiverid;
        var senderid = msg.senderid;
        var messageid = msg.messageid;
        console.log("message  " + message);
        console.log("receiverid  " + receiverid);
        console.log("senderid  " + senderid);
        console.log("messageid " + messageid);
        var values = [messageid, senderid, receiverid, message];
        var query = `insert into chats(time,id,fromid,toid,message) values((select now()),$1,$2,$3,$4)`;
        client
          .query(query, values)
          .then((res) => {
            try {
              var datas = db.getData("/" + senderid);
              try {
                io.to(`${datas}`).emit(
                  "sent_callback",
                  JSON.stringify({
                    callback: "sent",
                    message: message,
                    senderid: senderid,
                    receiverid: receiverid,
                    messageid: messageid,
                  })
                );

                console.log("callback sent");
                try {
                  var datar = db.getData("/" + receiverid);
                  io.to(`${datar}`).emit(
                    "receive_message",
                    JSON.stringify({
                      receiverid: msg.receiverid,
                      messageid: msg.messageid,
                      senderid: msg.senderid,
                      message: msg.message,
                    })
                  );
                  try {
                    io.to(`${datas}`).emit(
                      "receive_callback",
                      JSON.stringify({
                        callback: "received",
                        message: message,
                        senderid: senderid,
                        receiverid: receiverid,
                        messageid: messageid,
                      })
                    );
                    console.log("callback received");
                  } catch (err) {
                    io.to(`${datas}`).emit(
                      "error_handler",
                      JSON.stringify({
                        error: err.toString(),
                      })
                    );
                    //unable to send receive callback
                    console.log(err);
                  }
                } catch (err) {
                  // unable to send message to receiver

                  io.to(`${datas}`).emit(
                    "error_handler",
                    JSON.stringify({
                      error: err.toString(),
                    })
                  );

                  console.log(err);
                }
              } catch (err) {
                //unable to send callback

                io.to(`${datas}`).emit(
                  "error_handler",
                  JSON.stringify({
                    error: err.toString(),
                  })
                );
                console.log(err);
              }
            } catch (err) {
              // unable to retrive sender id
              console.log(err);
            }
          })
          .catch((err) => {
            //unable to push data at database
            io.to(`${datas}`).emit(
              "error_handler",
              JSON.stringify({
                error: err.toString(),
              })
            );
            console.log(err);
          });
      });
    } catch (err) {
      //unable to push userid in table
      console.log(err);
    }
    socket.on("typing", (msg) => {
      try {
        var datar = db.getData("/" + msg.receiverid);
        io.to(`${socket.id}`).emit(
          "typing",
          JSON.stringify({
            typerid: msg.senderid,
            status: "typing",
          })
        );
      } catch (err) {
        // unable to show typing status
        console.log(err);
      }
    });

    socket.on("disconnect", function () {
      var s2 = "/" + userid;
      db.delete(s2);
      console.log(userid + " disconnected");
      // to disconnect database client
    });
  } catch (err) {
    //  unable to get userid
    console.log(err);
  }
});

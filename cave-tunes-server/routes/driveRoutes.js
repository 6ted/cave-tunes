const express = require("express");

const router = express.Router();

const drive =
require("../services/googleOAuthDrive");



router.get("/login",(req,res)=>{


const url =
drive.getAuthURL();


res.redirect(url);


});





router.get("/callback",async(req,res)=>{


const code =
req.query.code;


const {tokens} =
await drive.oauth2Client.getToken(code);



console.log(tokens);


res.send(
"Google Drive Connected Successfully"
);


});



module.exports=router;
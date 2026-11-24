const {google} = require("googleapis");
const stream = require("stream");


const oauth2Client = new google.auth.OAuth2(

process.env.GOOGLE_CLIENT_ID,

process.env.GOOGLE_CLIENT_SECRET,

process.env.GOOGLE_REDIRECT_URI

);



function getAuthURL(){


return oauth2Client.generateAuthUrl({

access_type:"offline",

scope:[
"https://www.googleapis.com/auth/drive"
],

prompt:"consent"

});


}



function setCredentials(tokens){

oauth2Client.setCredentials(tokens);

}



const drive = google.drive({

version:"v3",

auth:oauth2Client

});





async function uploadFile(file, folderId){


const bufferStream =
new stream.PassThrough();


bufferStream.end(file.buffer);



const response =
await drive.files.create({

requestBody:{


name:file.originalname,


parents:[
folderId
]


},


media:{


mimeType:file.mimetype,

body:bufferStream


},


fields:"id,name"


});




await drive.permissions.create({

fileId:
response.data.id,


requestBody:{


role:"reader",

type:"anyone"


}


});



return {

id:
response.data.id,


url:
`https://drive.google.com/uc?export=download&id=${response.data.id}`

};


}



module.exports={
getAuthURL,
setCredentials,
uploadFile
};
// ======================================================
// CAVE TUNES
// PROFESSIONAL AUDIO PROCESSOR SERVICE
// ======================================================

const mm = require("music-metadata");
const NodeID3 = require("node-id3");
const fs = require("fs");
const path = require("path");


// ======================================================
// FORMAT DURATION
// ======================================================

function formatDuration(seconds) {

    if (!seconds || isNaN(seconds)) {

        return "0:00";

    }


    const minutes = Math.floor(seconds / 60);

    const remainingSeconds =
        Math.floor(seconds % 60);


    return `${minutes}:${remainingSeconds
        .toString()
        .padStart(2, "0")}`;

}



// ======================================================
// ANALYZE AUDIO METADATA
// ======================================================

async function analyzeAudio(filePath) {


    try {


        const metadata =
            await mm.parseFile(filePath);



        const format =
            metadata.format;



        const common =
            metadata.common;



        return {


            title:
                common.title || null,


            artist:
                common.artist || null,


            album:
                common.album || null,


           genre:
                Array.isArray(common.genre)
                ?
                common.genre[0]
                :
                common.genre || "",



            year:
                common.year || null,



            duration:
                formatDuration(
                    format.duration
                ),



            durationSeconds:
                format.duration || 0,



            bitrate:
                format.bitrate
                ?
                Math.round(
                    format.bitrate / 1000
                )
                :
                null,



            sampleRate:
                format.sampleRate || null,



            channels:
                format.numberOfChannels || null,



            codec:
                format.codec || null,



            extension:
                path.extname(filePath)
                .replace(".","")
                .toLowerCase()


        };


    }

    catch(error){


        console.error(
            "Audio analysis error:",
            error.message
        );


        throw error;


    }


}




// ======================================================
// EMBED COVER + ID3 TAGS
// ======================================================

async function embedMetadata({

    audioPath,

    coverPath,

    metadata

}){


try{


let image = null;



// ======================================
// COVER ARTWORK
// ======================================


if(
    coverPath &&
    fs.existsSync(coverPath)
){


    const extension =
    path.extname(
        coverPath
    )
    .toLowerCase();



    let mime =
    "image/jpeg";



    if(extension === ".png"){

        mime =
        "image/png";

    }


    if(extension === ".webp"){

        mime =
        "image/webp";

    }



    image = {


        mime,


        type:{

            id:3,

            name:
            "front cover"

        },


        description:
        "Cave Tunes Artwork",



        imageBuffer:
        fs.readFileSync(
            coverPath
        )


    };


}






// ======================================
// ID3 TAGS
// ======================================


const tags = {


title:
metadata.title || "",



artist:
metadata.artist || "",



album:
metadata.album || "",



genre:

Array.isArray(metadata.genre)

?

metadata.genre.join(",")

:

metadata.genre || "",




year:

metadata.year

?

String(metadata.year)

:

"",




copyright:

metadata.copyright_owner || "",




composer:

metadata.composer || "",




publisher:

metadata.record_label || "",



comment:

{

language:"eng",

text:
"Distributed by Cave Tunes"

}




};





if(image){

    tags.image =
    image;

}






const result =
NodeID3.write(

    tags,

    audioPath

);





if(!result){

throw new Error(
"ID3 metadata write failed"
);

}





console.log(
"✅ Cover + metadata embedded"
);



return true;



}

catch(error){


console.error(
"Metadata embedding failed:",
error.message
);



throw error;


}



}



// ======================================================
// PROCESS COMPLETE AUDIO
// ======================================================

async function processAudio({

    audioPath,

    coverPath,

    metadata

}){


    const audioInfo =
        await analyzeAudio(
            audioPath
        );



    await embedMetadata({

        audioPath,

        coverPath,

        metadata:{
            ...audioInfo,
            ...metadata
        }

    });



    return audioInfo;


}



// ======================================================
// EXPORTS
// ======================================================

module.exports = {


    analyzeAudio,


    embedMetadata,


    processAudio,


    formatDuration


};
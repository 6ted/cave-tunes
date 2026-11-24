// ======================================================
// CAVE TUNES
// AUDIO CONVERTER SERVICE
// Converts uploads to MP3
// Optimized for large files
// ======================================================


const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

const path = require("path");
const fs = require("fs");



// ======================================================
// SET FFMPEG BINARY
// ======================================================

if(ffmpegPath){

    ffmpeg.setFfmpegPath(
        ffmpegPath
    );

}




// ======================================================
// CONVERT TO MP3
// ======================================================


function convertToMp3(audioFile){


return new Promise((resolve,reject)=>{


    try{


        if(
            !audioFile ||
            !audioFile.path
        ){

            return reject(
                new Error(
                    "Invalid audio file"
                )
            );

        }



        // ==========================================
        // MAKE SURE AUDIO FOLDER EXISTS
        // ==========================================


        const outputFolder =
        path.join(
            __dirname,
            "..",
            "uploads",
            "audio"
        );


        if(
            !fs.existsSync(outputFolder)
        ){

            fs.mkdirSync(
                outputFolder,
                {
                    recursive:true
                }
            );

        }





        const outputName =

        `${Date.now()}-converted.mp3`;



        const outputPath =

        path.join(

            outputFolder,

            outputName

        );





        console.log(
            "🎵 Starting MP3 conversion:"
        );

        console.log(
            audioFile.path
        );







        ffmpeg(audioFile.path)


        // MP3 encoder

        .audioCodec(
            "libmp3lame"
        )


        // High quality streaming

        .audioBitrate(
            "320k"
        )


        .audioFrequency(
            44100
        )


        .audioChannels(
            2
        )



        // Metadata compatible

        .format(
            "mp3"
        )



        // ==========================================
        // START
        // ==========================================

        .on(
            "start",
            command=>{


                console.log(
                    "FFmpeg command:"
                );


                console.log(
                    command
                );


            }

        )





        // ==========================================
        // PROGRESS
        // ==========================================


        .on(
            "progress",
            progress=>{


                if(progress.percent){

                    console.log(

                        `Conversion ${Math.round(progress.percent)}%`

                    );

                }


            }

        )







        // ==========================================
        // SUCCESS
        // ==========================================


        .on(
            "end",
            ()=>{


                console.log(
                    "✅ MP3 conversion completed"
                );



                if(
                    !fs.existsSync(outputPath)
                ){

                    return reject(

                        new Error(
                            "Converted file missing"
                        )

                    );

                }





                const convertedFile = {


    ...audioFile,


    filename:
    outputName,


    path:
    outputPath,



    url:
    "/uploads/audio/" + outputName,



    mimetype:
    "audio/mpeg",



    // KEEP ORIGINAL SONG NAME
    originalname:
    audioFile.originalname,



    size:

    fs.statSync(
        outputPath
    ).size



};


                resolve(
                    convertedFile
                );


            }

        )







        // ==========================================
        // ERROR
        // ==========================================


        .on(
            "error",
            error=>{


                console.error(
                    "❌ FFmpeg ERROR:",
                    error.message
                );



                // remove broken output

                if(
                    fs.existsSync(outputPath)
                ){

                    fs.unlinkSync(
                        outputPath
                    );

                }



                reject(error);


            }

        )





        .save(
            outputPath
        );



    }


    catch(error){


        reject(error);


    }


});


}




module.exports = {

    convertToMp3

};
// ======================================================
// CAVE TUNES
// PROFESSIONAL METADATA BUILDER
// ======================================================


function normalizeReleaseType(type){


    if(!type)
    return "single";


    const value =
    String(type)
    .trim()
    .toLowerCase();



    if(
        value.includes("album")
    ){

        return "album";

    }



    if(
        value.includes("ep")
    ){

        return "ep";

    }



    if(
        value.includes("podcast")
    ){

        return "podcast";

    }



    return "single";


}





function buildSongMetadata({

    body,

    userId,

    audioFile,

    coverFile,

    lyricsFile,

    audioInfo

}) {



// =====================================
// SONG TITLE LOGIC
// Single uses uploaded title
// Album / EP use original audio filename
// =====================================

let title = body.title?.trim();

const releaseType = normalizeReleaseType(
    body.release_type
);


if(
    releaseType === "album" ||
    releaseType === "ep"
){

    title =
    audioFile.originalname
    .replace(/\.[^/.]+$/, "")
    .trim();

}




return {



user_id:userId,



// =====================================
// SONG DETAILS
// =====================================


title,

song_title:title,


artist_name:

body.artist_name?.trim()
|| null,


featured_artists:

body.featured_artists
|| null,



album_name:

body.album_name?.trim()
|| null,


ep_name:

body.ep_name?.trim()
|| null,


release_type:

normalizeReleaseType(
    body.release_type
),



genre:

body.genre || null,


subgenre:

body.subgenre || null,


country:

body.country || null,


language:

body.language || null,



description:

body.description || null,



explicit:

body.explicit || false,



release_date:

body.release_date || null,





// =====================================
// FILES
// =====================================


audio_file_id:

audioFile.filename,



cover_file_id:

coverFile
?
coverFile.filename
:
null,




audio_url:

`/uploads/audio/${audioFile.filename}`,




cover_url:

coverFile

?

`/uploads/covers/${coverFile.filename}`

:

null,





lyrics_file_url:

lyricsFile

?

`/uploads/lyrics/${lyricsFile.filename}`

:

null,




lyrics_url:

lyricsFile

?

`/uploads/lyrics/${lyricsFile.filename}`

:

null,






// =====================================
// AUDIO INFO
// =====================================


duration:

audioInfo.duration
|| "0:00",



duration_seconds:

audioInfo.durationSeconds
|| 0,



bitrate:

audioInfo.bitrate
|| null,



file_size:

audioFile.size,



bpm:

body.bpm
?
Number(body.bpm)
:
null,



music_key:

body.music_key
|| null,






// =====================================
// COPYRIGHT
// =====================================


copyright_owner:

body.copyright_owner
|| null,



copyright_year:

body.copyright_year
|| null,



isrc:

body.isrc
|| null,



upc:

body.upc
|| null,






// =====================================
// CREDITS
// =====================================


producer:

body.producer
|| null,


composer:

body.composer
|| null,


songwriter:

body.songwriter
|| null,


record_label:

body.record_label
|| null,


mix_engineer:

body.mix_engineer
|| null,


master_engineer:

body.master_engineer
|| null,






// =====================================
// LYRICS
// =====================================


lyrics:

body.lyrics
|| null,






// =====================================
// DISTRIBUTION
// =====================================


platforms:

Array.isArray(body.platforms)

?

body.platforms

:

[],




youtube_monetization:

body.youtube_monetization === true ||
body.youtube_monetization === "true",



streaming_royalties:

body.streaming_royalties === true ||
body.streaming_royalties === "true",



download_sales:

body.download_sales === true ||
body.download_sales === "true",






// =====================================
// EXTRA MEDIA
// =====================================


dolby_file_url:null,


canvas_video_url:null,







// =====================================
// STATS
// =====================================


plays:0,


downloads:0,


likes:0,






// =====================================
// STATUS
// =====================================


status:"published"



};


}



module.exports={

buildSongMetadata

};
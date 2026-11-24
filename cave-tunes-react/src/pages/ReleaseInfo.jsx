import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Music,
  User,
  Calendar
} from "lucide-react";

import { useUpload } from "../context/useUpload.jsx";

import "../styles/UploadStudio.css";



function ReleaseInfo() {


  const navigate = useNavigate();


  const {
    releaseData,
    updateReleaseData
  } = useUpload();




 const countries = [

  "Afghanistan",
  "Albania",
  "Algeria",
  "Angola",
  "Argentina",
  "Australia",
  "Austria",
  "Belgium",
  "Botswana",
  "Brazil",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cameroon",
  "Canada",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Congo",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "Ethiopia",
  "Finland",
  "France",
  "Germany",
  "Ghana",
  "Greece",
  "Guatemala",
  "Guinea",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Ireland",
  "Israel",
  "Italy",
  "Ivory Coast",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kenya",
  "South Korea",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Mali",
  "Mexico",
  "Morocco",
  "Mozambique",
  "Namibia",
  "Netherlands",
  "New Zealand",
  "Niger",
  "Nigeria",
  "Norway",
  "Pakistan",
  "Panama",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Singapore",
  "Slovakia",
  "Somalia",
  "South Africa",
  "Spain",
  "Sudan",
  "Sweden",
  "Switzerland",
  "Tanzania",
  "Thailand",
  "Tunisia",
  "Turkey",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe"

];





const genres = [

  "Afrobeat",
  "Afropop",
  "Afro House",
  "Amapiano",
  "African Gospel",
  "Traditional African",
  "Highlife",
  "Kwaito",
  "Makossa",
  "Soukous",
  "Bongo Flava",
  "Mbalax",

  "Hip Hop",
  "Trap",
  "Drill",
  "Boom Bap",
  "Rap",
  "Alternative Hip Hop",

  "R&B",
  "Soul",
  "Neo Soul",
  "Funk",
  "Blues",

  "Pop",
  "Dance Pop",
  "Electropop",
  "Indie Pop",

  "Rock",
  "Alternative Rock",
  "Metal",
  "Punk Rock",

  "Reggae",
  "Dancehall",
  "Ska",

  "Jazz",
  "Fusion",
  "Classical",
  "Orchestra",

  "Electronic",
  "EDM",
  "House",
  "Deep House",
  "Tech House",
  "Techno",
  "Trance",
  "Drum & Bass",

  "Country",
  "Folk",
  "Acoustic",

  "Latin",
  "Salsa",
  "Reggaeton",

  "K-Pop",
  "J-Pop",

  "Lo-fi",
  "local music",
  "Chill",
  "Ambient",
  "Instrumental",

  "Soundtrack",
  "Podcast",
  "Spoken Word"

];




  const [formData,setFormData] = useState({

   

    release_type:
    releaseData.release_type || "single",



    artist_name:
    releaseData.artist_name || "",

featured_artists: Array.isArray(releaseData.featured_artists)
  ? releaseData.featured_artists
  : releaseData.featured_artists
    ? releaseData.featured_artists.split(",").map(name => name.trim()).filter(Boolean)
    : [],

    country:
    releaseData.country || "",



    genre:
    releaseData.genre || "",



    language:
    releaseData.language || "",



        title:
    releaseData.title || "",


    album_name:
    releaseData.release_type === "album"
    ?
    releaseData.album_name || ""
    :
    "",


    ep_name:
    releaseData.release_type === "ep"
    ?
    releaseData.ep_name || ""
    :
    "",

    release_date:
    releaseData.release_date || ""


  });



 const [featuredArtistInput, setFeaturedArtistInput] = useState("");



  function handleChange(e){


    setFormData({

      ...formData,

      [e.target.name]:
      e.target.value

    });


  }

function addFeaturedArtist() {
  const artist = featuredArtistInput.trim();

  if (!artist) return;

  const alreadyExists = formData.featured_artists.some(
    name => name.toLowerCase() === artist.toLowerCase()
  );

  if (alreadyExists) {
    setFeaturedArtistInput("");
    return;
  }

  setFormData(prev => ({
    ...prev,
    featured_artists: [
      ...prev.featured_artists,
      artist
    ]
  }));

  setFeaturedArtistInput("");
}


function removeFeaturedArtist(index) {
  setFormData(prev => ({
    ...prev,
    featured_artists: prev.featured_artists.filter(
      (_, i) => i !== index
    )
  }));
}




function handleContinue(){

let finalData = {
...formData
};


if (formData.release_type === "ep") {
  finalData.ep_name =
    formData.ep_name ||
    formData.title;
}


updateReleaseData(finalData);


navigate("/track-upload");

}








return (

<div className="upload-studio">





<div className="upload-title">


<Music size={42}/>


<div>


<h1>
Release Information
</h1>


<p>
Tell us about your music release
</p>


</div>


</div>









<div className="upload-section">


<h2>
Release Type
</h2>



<div className="release-options">


{

[

{
label:"Single",
value:"single"
},

{
label:"EP",
value:"ep"
},

{
label:"Album",
value:"album"
},

{
label:"Podcast",
value:"podcast"
}


].map(type=>(


<button


key={type.value}


className={

formData.release_type === type.value

?

"selected"

:

""

}



onClick={()=>


setFormData({

...formData,

release_type:
type.value

})


}



>


{type.label}


</button>


))


}



</div>


</div>









<div className="upload-section">


<h2>

<User size={22}/>

Artist Details

</h2>





<input

name="artist_name"

placeholder="Artist Name"

value={
formData.artist_name
}

onChange={handleChange}

/>


<div className="featured-artists-field">

  <label>
    Featured Artists
    <span className="optional-label">Optional</span>
  </label>

  <div className="featured-artist-input">

    <input
      type="text"
      placeholder="Enter featured artist name"
      value={featuredArtistInput}
      onChange={(e) => setFeaturedArtistInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          addFeaturedArtist();
        }
      }}
    />

    <button
      type="button"
      onClick={addFeaturedArtist}
    >
      Add
    </button>

  </div>

  <div className="featured-artists-list">

    {formData.featured_artists.map((artist, index) => (

      <div className="featured-artist-tag" key={`${artist}-${index}`}>

        <span>{artist}</span>

        <button
          type="button"
          onClick={() => removeFeaturedArtist(index)}
          aria-label={`Remove ${artist}`}
        >
          ×
        </button>

      </div>

    ))}

  </div>

  <small>
    Add one or more artists featured on this release.
  </small>

</div>



<select

name="country"

value={
formData.country
}

onChange={handleChange}

>


<option value="">

Select Country

</option>



{

countries.map(country=>(


<option

key={country}

value={country}

>

{country}

</option>


))


}


</select>







<select

name="genre"

value={
formData.genre
}

onChange={handleChange}

>


<option value="">

Select Genre

</option>




{

genres.map(genre=>(


<option

key={genre}

value={genre}

>

{genre}

</option>


))


}


</select>








<select

name="language"

value={
formData.language
}

onChange={handleChange}

>


<option value="">
  Select Language
</option>

<option value="English">
  English
</option>

<option value="Chichewa">
  Chichewa
</option>

<option value="French">
  French
</option>

<option value="Portuguese">
  Portuguese
</option>

<option value="Spanish">
  Spanish
</option>

<option value="Arabic">
  Arabic
</option>

<option value="Swahili">
  Swahili
</option>

<option value="Zulu">
  Zulu
</option>

<option value="Xhosa">
  Xhosa
</option>

<option value="Afrikaans">
  Afrikaans
</option>

<option value="Amharic">
  Amharic
</option>

<option value="Hausa">
  Hausa
</option>

<option value="Yoruba">
  Yoruba
</option>

<option value="Igbo">
  Igbo
</option>

<option value="Shona">
  Shona
</option>

<option value="Tumbuka">
  Tumbuka
</option>

<option value="Tonga">
  Tonga
</option>

<option value="Nyanja">
  Nyanja
</option>

<option value="Lingala">
  Lingala
</option>

<option value="Somali">
  Somali
</option>

<option value="Hindi">
  Hindi
</option>

<option value="Bengali">
  Bengali
</option>

<option value="Chinese">
  Chinese
</option>

<option value="Japanese">
  Japanese
</option>

<option value="Korean">
  Korean
</option>

<option value="Thai">
  Thai
</option>

<option value="Vietnamese">
  Vietnamese
</option>

<option value="Indonesian">
  Indonesian
</option>

<option value="Malay">
  Malay
</option>

<option value="Turkish">
  Turkish
</option>

<option value="Italian">
  Italian
</option>

<option value="German">
  German
</option>

<option value="Dutch">
  Dutch
</option>

<option value="Russian">
  Russian
</option>

<option value="Ukrainian">
  Ukrainian
</option>

<option value="Greek">
  Greek
</option>

<option value="Hebrew">
  Hebrew
</option>

<option value="Persian">
  Persian
</option>

<option value="Kurdish">
  Kurdish
</option>

<option value="Other">
  Other
</option>


</select>





</div>









<div className="upload-section">


<h2>

<Music size={22}/>

Release Details

</h2>





<input

name="title"

placeholder="Song / Release Title"

value={
formData.title
}

onChange={handleChange}

/>




{
formData.release_type === "album" && (

<input

name="album_name"

placeholder="Album Name"

value={formData.album_name}

onChange={handleChange}

/>

)
}




{
formData.release_type === "ep" && (

<input

name="ep_name"

placeholder="EP Name"

value={formData.ep_name}

onChange={handleChange}

/>

)
}





<label>

<Calendar size={18}/>

Release Date

</label>





<input

type="date"

name="release_date"

value={
formData.release_date
}

onChange={handleChange}

/>





</div>









<button

className="next-button"

onClick={handleContinue}

>

Continue To Track Upload →

</button>






</div>

);


}



export default ReleaseInfo;
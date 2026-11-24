import { 
  useEffect,
  useState
} from "react";


import { 
  useNavigate 
} from "react-router-dom";


import {
  Plus,
  Music,
  Clock,
  CheckCircle,
  Loader
} from "lucide-react";


import "../styles/UploadStudio.css";



function UploadStudio(){


const navigate =
useNavigate();



const [uploads,setUploads] =
useState([]);


const [loading,setLoading] =
useState(true);



const [error,setError] =
useState("");




// ======================================================
// LOAD MY RELEASES
// ======================================================


useEffect(()=>{


async function loadUploads(){


try{


setLoading(true);



const token =
localStorage.getItem("token");



const response =
await fetch(

"http://localhost:5000/api/music/my-uploads",

{

headers:{

Authorization:
`Bearer ${token}`

}

}

);



const data =
await response.json();



if(!response.ok){

throw new Error(
data.message ||
"Unable to load uploads"
);

}



setUploads(
data.songs || []
);



}

catch(err){


console.error(
"UPLOAD LOAD ERROR:",
err
);


setError(
err.message
);


}

finally{


setLoading(false);


}


}



loadUploads();


},[]);





// ======================================================
// FILTER RELEASES
// ======================================================


const drafts =
uploads.filter(
(song)=>

String(song.status)
.toLowerCase()
===
"draft"

);



const published =
uploads.filter(
(song)=>

String(song.status)
.toLowerCase()
!=="draft"

);







return (

<div className="upload-studio">





{/* HEADER */}


<div className="upload-title">


<Music size={42}/>


<div>


<h1>
Cave Tunes Upload Studio
</h1>


<p>
Create, manage and distribute your music
</p>


</div>


</div>







<button

className="next-button"

onClick={()=>navigate(
"/release-info"
)}

>

<Plus size={22}/>

Create New Release


</button>








{

loading &&

<div className="upload-section">

<h2>

<Loader className="spin"/>

Loading releases...

</h2>

</div>

}






{

error &&

<div className="upload-section">

<h2>
{error}
</h2>

</div>

}








{/* DRAFTS */}



<div className="upload-section">


<h2>

<Clock size={22}/>

Draft Releases

</h2>





{

!loading &&
drafts.length === 0 &&

<p>
No draft releases
</p>

}





{

drafts.map((release)=>(


<div
    className="release-card"
    key={release.id}
    onClick={() => navigate(`/release-manager/${release.id}`)}
    style={{ cursor: "pointer" }}
>


<Music/>


<div>


<h3>

{release.title}

</h3>


<p>

{
release.status
}

</p>


</div>


</div>


))


}



</div>













{/* PUBLISHED */}



<div className="upload-section">


<h2>


<CheckCircle size={22}/>


My Releases


</h2>





{

!loading &&
published.length===0 &&

<p>
No uploaded releases yet
</p>

}





{

published.map((song)=>(


<div
    className="release-card"
    key={song.id}
    onClick={() => navigate(`/release-manager/${song.id}`)}
    style={{ cursor: "pointer" }}
>


<Music/>


<div>


<h3>

{song.title}

</h3>


<p>

{song.artist_name}

</p>


<p>

Status:
{" "}
{song.status}

</p>



</div>


</div>


))


}



</div>





</div>

);


}



export default UploadStudio;
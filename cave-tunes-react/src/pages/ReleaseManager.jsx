import {
    useEffect,
    useState
} from "react";

import {
    useParams,
    useNavigate
} from "react-router-dom";


import {
    Save,
    Trash2,
    Loader
} from "lucide-react";


import "../styles/ReleaseManager.css";


function ReleaseManager(){


   const { songId: id } = useParams();

    const navigate = useNavigate();


    const API =
    "http://localhost:5000";



    const [song,setSong] =
    useState(null);


    const [loading,setLoading] =
    useState(true);


    const [saving,setSaving] =
    useState(false);


    const [coverUploading,setCoverUploading] =
    useState(false);


    const [message,setMessage] =
    useState("");



    const [coverFile,setCoverFile] =
    useState(null);



    // =====================================
    // LOAD SONG
    // =====================================

    useEffect(()=>{


        async function loadRelease(){


            try{


                const response =
                await fetch(
                    `${API}/api/music/${id}`
                );


                const data =
                await response.json();



                if(data.success){

                    setSong(
                        data.song
                    );

                }


            }

            catch(error){

                console.error(
                    "LOAD ERROR:",
                    error
                );

            }

            finally{

                setLoading(false);

            }


        }


        loadRelease();


    },[id]);







    // =====================================
    // UPDATE LOCAL DATA
    // =====================================

    function updateField(
        field,
        value
    ){


        setSong(prev => ({

            ...prev,

            [field]:value

        }));


    }








    // =====================================
    // SAVE DETAILS
    // =====================================


    async function saveRelease(){


        try{


            setSaving(true);


            const token =
            localStorage.getItem(
                "token"
            );



            const response =
            await fetch(

                `${API}/api/music/${id}`,

                {

                    method:"PUT",

                    headers:{


                        "Content-Type":
                        "application/json",


                        Authorization:
                        `Bearer ${token}`

                    },


                    body:JSON.stringify({

                        title:
                        song.title,


                        genre:
                        song.genre,


                        album_name:
                        song.album_name,

                        ep_name:
                        song.ep_name

                    })

                }

            );



            const data =
            await response.json();



            if(data.success){


                setSong(
                    data.song
                );


                setMessage(
                    "Release updated successfully"
                );


            }


        }


        catch(error){


            console.error(
                "SAVE ERROR:",
                error
            );


        }


        finally{

            setSaving(false);

        }


    }









    // =====================================
    // COVER UPLOAD
    // =====================================


    async function replaceCover(){


        if(!coverFile){

            setMessage(
                "Please select a cover image first"
            );

            return;

        }



        try{


            setCoverUploading(true);



            const token =
            localStorage.getItem(
                "token"
            );



            const formData =
            new FormData();



            formData.append(
                "cover",
                coverFile
            );



            const response =
            await fetch(

                `${API}/api/music/${id}/cover`,

                {

                    method:"PUT",

                    headers:{


                        Authorization:
                        `Bearer ${token}`

                    },


                    body:formData

                }

            );



            const data =
            await response.json();



            if(data.success){


                setSong(
                    data.song
                );


                setMessage(
                    "Cover updated successfully"
                );


                setCoverFile(null);


            }


            else{


                setMessage(
                    "Cover update failed"
                );


            }


        }


        catch(error){


            console.error(
                "COVER ERROR:",
                error
            );


        }


        finally{


            setCoverUploading(false);


        }


    }









    // =====================================
    // DELETE
    // =====================================


    async function deleteRelease(){


        const confirmDelete =
        window.confirm(
            "Delete this release permanently?"
        );


        if(!confirmDelete)
        return;



        try{


            const token =
            localStorage.getItem(
                "token"
            );



            await fetch(

                `${API}/api/music/${id}`,

                {

                    method:"DELETE",

                    headers:{

                        Authorization:
                        `Bearer ${token}`

                    }

                }

            );



            navigate(
                "/upload"
            );


        }


        catch(error){


            console.error(
                "DELETE ERROR:",
                error
            );


        }


    }










    if(loading){


        return (

            <div className="loading">

                <Loader/>

                Loading release...

            </div>

        );

    }






    if(!song){


        return (

            <h2>
                Release not found
            </h2>

        );

    }







    return (

        <div className="release-manager">



            <div className="release-header">



                <img

                className="release-cover"

                src={

                    song.cover_url

                    ?

                    `${API}${song.cover_url}`

                    :

                    "/default-cover.png"

                }

                alt={song.title}

                />





                <div className="release-info">



                    <input

                    value={
                        song.title || ""
                    }

                    onChange={
                        e =>
                        updateField(
                            "title",
                            e.target.value
                        )
                    }

                    />





                    <p>
                    Artist:
                    {" "}
                    {song.artist_name}
                    </p>





                    <input

                    value={
                        song.genre || ""
                    }

                    onChange={
                        e =>
                        updateField(
                            "genre",
                            e.target.value
                        )
                    }

                    />





                    <p>
                    Release Type:
                    {" "}
                    {song.release_type}
                    </p>




                    <span className="release-status">

                    {song.status}

                    </span>



                </div>



            </div>









            <div className="release-stats">


                <div className="stat-card">

                    <h3>
                    {song.plays || 0}
                    </h3>

                    <p>
                    Plays
                    </p>

                </div>



                <div className="stat-card">

                    <h3>
                    {song.downloads || 0}
                    </h3>

                    <p>
                    Downloads
                    </p>

                </div>



                <div className="stat-card">

                    <h3>
                    {song.likes || 0}
                    </h3>

                    <p>
                    Likes
                    </p>

                </div>


            </div>









            <div className="cover-manager">



                <input

                id="cover"

                type="file"

                accept="image/*"

                hidden

                onChange={
                    e =>
                    setCoverFile(
                        e.target.files[0]
                    )
                }

                />



                <label

                htmlFor="cover"

                className="release-button primary-button"

                >

                Choose Cover

                </label>




                <button

                className="release-button primary-button"

                onClick={replaceCover}

                disabled={
                    coverUploading
                }

                >

                <Save size={18}/>

                {

                coverUploading

                ?

                "Uploading..."

                :

                "Upload Cover"

                }


                </button>



            </div>










            <div className="release-actions">



                <button

                className="release-button primary-button"

                onClick={saveRelease}

                disabled={saving}

                >

                <Save size={18}/>


                {

                saving

                ?

                "Saving..."

                :

                "Save Changes"

                }


                </button>





                <button

                className="release-button danger-button"

                onClick={deleteRelease}

                >

                <Trash2 size={18}/>

                Delete Release


                </button>



            </div>





            {

            message &&

            <p className="success-message">

                {message}

            </p>

            }



        </div>

    );


}


export default ReleaseManager;
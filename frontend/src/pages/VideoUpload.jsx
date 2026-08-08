import { useState } from "react";
import RiskResult from "./RiskResult";
import "./VideoUpload.css";


function VideoUpload(){


    const [video, setVideo] = useState(null);

    const [loading, setLoading] = useState(false);

    const [result, setResult] = useState(null);





    const uploadVideo = async()=>{


        if(!video){

            alert("Please select video");

            return;

        }



        const formData = new FormData();


        formData.append(
            "file",
            video
        );



        try{


            setLoading(true);

            setResult(null);



            const response = await fetch(

                "http://127.0.0.1:8000/video/upload",

                {

                    method:"POST",

                    body:formData

                }

            );



            const data = await response.json();



            console.log(
                "Analysis Result:",
                data
            );





            if(response.ok && data.status==="success"){



                // Save report for history page

                localStorage.setItem(

                    "latestReport",

                    JSON.stringify(data)

                );



                setResult(data);



            }

            else{


                alert(

                    data.message ||

                    "Analysis failed"

                );


            }



        }


        catch(error){


            console.log(error);


            alert(

                "Backend connection failed"

            );


        }



        finally{


            setLoading(false);


        }



    };








    return(


        <div className="upload-page">



            {

            !result &&

            (

            <>



            <h1>

                Upload Athlete Video

            </h1>





            <div className="upload-card">



                <h2>

                    AI Motion Analysis

                </h2>




                <p>

                    Upload athlete movement video for biomechanical analysis and injury risk prediction.

                </p>





                <input


                    type="file"


                    accept="video/*"


                    onChange={(e)=>

                        setVideo(
                            e.target.files[0]
                        )

                    }


                />







                <button

                    onClick={uploadVideo}

                    disabled={loading}

                >


                    {

                    loading

                    ?

                    "Analyzing Video..."

                    :

                    "Analyze Injury Risk"

                    }



                </button>





            </div>



            </>

            )

            }







            {

            result &&


            (

                <RiskResult

                    result={result}

                />


            )

            }





        </div>


    );


}



export default VideoUpload;
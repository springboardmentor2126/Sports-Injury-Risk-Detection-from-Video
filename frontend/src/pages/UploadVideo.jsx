import VideoUpload from "../components/VideoUpload";

export default function UploadVideo(){

    return(

        <div
            style={{
                maxWidth:"900px",
                margin:"40px auto",
                padding:"30px"
            }}
        >

            <h1>

                Upload Training Video

            </h1>

            <p>

                Upload an athlete movement video for AI biomechanical analysis.

            </p>

            <VideoUpload/>

        </div>

    );

}
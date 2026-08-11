import { useRef, useState } from "react";
import api from "../services/api";
import { FaCloudUploadAlt } from "react-icons/fa";
import { ClipLoader } from "react-spinners";

export default function VideoUpload({ onUploadSuccess }) {

    const inputRef = useRef();

    const [selectedFile, setSelectedFile] = useState(null);
    const [videoURL, setVideoURL] = useState(null);

    const [analysis, setAnalysis] = useState(null);

    const [loading, setLoading] = useState(false);

    const [message, setMessage] = useState("");

    function chooseFile() {

        inputRef.current.click();

    }

    async function analyzeVideo() {

        if (!selectedFile) {

            alert("Please select a video first.");

            return;

        }

        setLoading(true);

        setMessage("");

        const formData = new FormData();

        formData.append("file", selectedFile);

        const token = localStorage.getItem("token");

        try {

            const response = await api.post(

                "/video/upload",

                formData,

                {

                    headers: {

                        Authorization: `Bearer ${token}`,

                        "Content-Type": "multipart/form-data"

                    }

                }

            );

            setAnalysis(response.data.analysis);

            setMessage("✅ Analysis Completed Successfully");

            if (onUploadSuccess) {

                onUploadSuccess(response.data.analysis);

            }

            setTimeout(() => {

                setMessage("");

            }, 3000);

        }

        catch (err) {

            console.log(err);

            setMessage("❌ Upload Failed");

        }

        setLoading(false);

    }

    return (

        <div className="video-upload">

            <input

                type="file"

                accept="video/*"

                ref={inputRef}

                style={{ display: "none" }}

                onChange={(e) => {

                    const file = e.target.files[0];

                    setSelectedFile(file);

                    setAnalysis(null);

                    setMessage("");

                    if (file) {

                        setVideoURL(

                            URL.createObjectURL(file)

                        );

                    }

                }}

            />

            <div

                className="upload-box"

                onClick={chooseFile}

            >

                <FaCloudUploadAlt

                    size={60}

                    color="#2563eb"

                />

                <h3>

                    Select Training Video

                </h3>

                <p>

                    MP4 • AVI • MOV

                </p>

            </div>

            {

                selectedFile &&

                <>

                    <br />

                    <p>

                        <strong>

                            Selected File:

                        </strong>

                        {" "}

                        {selectedFile.name}

                    </p>

                </>

            }

            {

                videoURL &&

                <video

                    controls

                    width="100%"

                    style={{

                        marginTop: 20,

                        borderRadius: 12,

                        maxHeight: "420px"

                    }}

                >

                    <source

                        src={videoURL}

                    />

                </video>

            }

            {

                selectedFile &&

                <div

                    style={{

                        marginTop: 20

                    }}

                >

                    <button

                        onClick={analyzeVideo}

                        disabled={loading}

                    >

                        {

                            loading

                                ?

                                <ClipLoader

                                    size={18}

                                    color="#ffffff"

                                />

                                :

                                "Analyze Video"

                        }

                    </button>

                </div>

            }

            {

                message &&

                <p

                    style={{

                        marginTop: 20,

                        fontWeight: "bold",

                        color: message.includes("Failed")

                            ? "red"

                            : "green"

                    }}

                >

                    {message}

                </p>

            }

            {

                analysis &&

                <div

                    style={{

                        marginTop: 25,

                        background: "#ffffff",

                        borderRadius: "12px",

                        padding: "20px",

                        textAlign: "left",

                        boxShadow: "0 2px 10px rgba(0,0,0,0.1)"

                    }}

                >

                    <h2>

                        Analysis Result

                    </h2>

                    <hr />

                    <p><strong>Frames Processed:</strong> {analysis.frames_processed}</p>

                    <p><strong>Pose Frames:</strong> {analysis.pose_detected_frames}</p>

                    <hr />

                    <p><strong>Left Knee:</strong> {Number(analysis.left_knee_angle).toFixed(1)}°</p>

                    <p><strong>Right Knee:</strong> {Number(analysis.right_knee_angle).toFixed(1)}°</p>

                    <p><strong>Left Hip:</strong> {Number(analysis.left_hip_angle).toFixed(1)}°</p>

                    <p><strong>Right Hip:</strong> {Number(analysis.right_hip_angle).toFixed(1)}°</p>

                    <p><strong>Left Shoulder:</strong> {Number(analysis.left_shoulder_angle).toFixed(1)}°</p>

                    <p><strong>Right Shoulder:</strong> {Number(analysis.right_shoulder_angle).toFixed(1)}°</p>

                    <p><strong>Left Elbow:</strong> {Number(analysis.left_elbow_angle).toFixed(1)}°</p>

                    <p><strong>Right Elbow:</strong> {Number(analysis.right_elbow_angle).toFixed(1)}°</p>

                    <hr />

                    <p><strong>Posture Symmetry:</strong> {Number(analysis.posture_symmetry).toFixed(1)}%</p>

                    <p><strong>Movement Quality:</strong> {analysis.movement_quality}</p>

                    <p><strong>Injury Risk:</strong> {analysis.injury_risk}</p>

                    <hr />

                    <p><strong>AI Recommendation</strong></p>

                    <p>{analysis.recommendation}</p>

                </div>

            }

        </div>

    );

}
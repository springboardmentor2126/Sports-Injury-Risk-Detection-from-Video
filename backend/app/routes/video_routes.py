from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
import os
import traceback
from datetime import datetime


from app.services.tracker import track_pose
from app.services.biomechanics import analyze_posture
from app.services.assessment import analyze_movement
from app.services.report import generate_report
from app.services.risk_prediction import predict_injury_risk



router = APIRouter(
    prefix="/video",
    tags=["Video"]
)



UPLOAD_FOLDER = "uploads"


os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)




@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...)
):

    try:


        # ===============================
        # Save Uploaded Video
        # ===============================


        video_path = os.path.join(
            UPLOAD_FOLDER,
            file.filename
        )


        with open(video_path, "wb") as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )


        print("Video saved:", video_path)




        # ===============================
        # Pose Detection
        # ===============================


        landmarks = track_pose(
            video_path
        )


        if len(landmarks) == 0:


            return {

                "status": "failed",

                "message": "No human pose detected"

            }






        # ===============================
        # Frame Analysis
        # ===============================


        all_results = []



        for index, frame_landmarks in enumerate(landmarks):


            biomechanics = analyze_posture(
                frame_landmarks
            )


            assessment = analyze_movement(
                biomechanics
            )



            all_results.append({

                "frame": index + 1,

                "biomechanics": biomechanics,

                "assessment": assessment

            })







        # ===============================
        # Average Biomechanics
        # ===============================


        average_biomechanics = {


            "left_knee_angle":

            sum(
                x["biomechanics"]["left_knee_angle"]
                for x in all_results
            ) / len(all_results),



            "right_knee_angle":

            sum(
                x["biomechanics"]["right_knee_angle"]
                for x in all_results
            ) / len(all_results),



            "hip_angle":

            sum(
                x["biomechanics"]["hip_angle"]
                for x in all_results
            ) / len(all_results),



            "ankle_angle":

            sum(
                x["biomechanics"]["ankle_angle"]
                for x in all_results
            ) / len(all_results),



            "shoulder_angle":

            sum(
                x["biomechanics"]["shoulder_angle"]
                for x in all_results
            ) / len(all_results)

        }








        # ===============================
        # Movement Assessment
        # ===============================


        average_assessment = analyze_movement(

            average_biomechanics

        )








        # ===============================
        # Injury Risk Prediction
        # Milestone 3
        # ===============================


        risk_analysis = predict_injury_risk({


            "knee_angle":

            average_biomechanics["left_knee_angle"],



            "trunk_lean":

            average_biomechanics["shoulder_angle"],



            "hip_angle":

            average_biomechanics["hip_angle"],



            "training_load":

            "high"

        })








        # ===============================
        # Recommendation Workflow
        # Milestone 3
        # ===============================


        recommendations = {


            "posture_correction":

            "Improve landing posture and maintain knee alignment.",



            "exercise_plan":

            "Perform strength training, mobility exercises and hip stabilization drills.",



            "recovery_plan":

            "Reduce training load and maintain proper recovery."

        }








        # ===============================
        # Generate Report
        # ===============================


        report = generate_report(

            "Athlete",

            average_biomechanics,

            average_assessment

        )








        # ===============================
        # Save Report Data
        # Milestone 3
        # ===============================


        report_data = {


            "athlete":

            "Athlete",



            "date":

            datetime.now().strftime(
                "%Y-%m-%d %H:%M"
            ),



            "risk_score":

            risk_analysis["risk_score"],



            "risk_level":

            risk_analysis["risk_level"],



            "issues":

            risk_analysis["issues"],



            "recommendations":

            recommendations,



            "biomechanics":

            average_biomechanics

        }








        # ===============================
        # Final Response
        # ===============================


        return {


            "status":

            "success",



            "frames_detected":

            len(landmarks),



            "frames_analyzed":

            len(all_results),



            "average_biomechanics":

            average_biomechanics,



            "movement_assessment":

            average_assessment,



            "risk_analysis":

            risk_analysis,



            "recommendations":

            recommendations,



            "report_data":

            report_data,



            "report":

            report,



            "frame_results":

            all_results

        }






    except Exception as e:


        print(
            traceback.format_exc()
        )


        raise HTTPException(

            status_code=500,

            detail=str(e)

        )
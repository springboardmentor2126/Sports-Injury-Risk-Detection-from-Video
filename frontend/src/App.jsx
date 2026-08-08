import { BrowserRouter, Routes, Route } from "react-router-dom";


import Login from "./pages/Login";
import Register from "./pages/Register";


import AthleteDashboard from "./pages/AthleteDashboard";
import AthleteProfile from "./pages/AthleteProfile";


import CoachDashboard from "./pages/CoachDashboard";


import VideoUpload from "./pages/VideoUpload";
import InjuryReports from "./pages/InjuryReports";
import AthletePerformance from "./pages/AthletePerformance";


import Report from "./pages/Report";



function App(){


    return(


        <BrowserRouter>


            <Routes>


                {/* Login */}

                <Route

                    path="/"

                    element={<Login />}

                />



                {/* Register */}

                <Route

                    path="/register"

                    element={<Register />}

                />




                {/* Athlete Dashboard */}

                <Route

                    path="/dashboard"

                    element={<AthleteDashboard />}

                />




                {/* Athlete Profile */}

                <Route

                    path="/athlete-profile"

                    element={<AthleteProfile />}

                />




                {/* Coach Dashboard */}

                <Route

                    path="/coach-dashboard"

                    element={<CoachDashboard />}

                />




                {/* Video Upload */}

                <Route

                    path="/upload-video"

                    element={<VideoUpload />}

                />




                {/* Reports */}

                <Route

                    path="/injury-reports"

                    element={<InjuryReports />}

                />




                {/* Performance */}

                <Route

                    path="/athlete-performance"

                    element={<AthletePerformance />}

                />




                {/* Single Report */}

                <Route

                    path="/report"

                    element={<Report />}

                />



            </Routes>


        </BrowserRouter>


    );


}



export default App;
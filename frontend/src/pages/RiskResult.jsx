import "./RiskResult.css";


function RiskResult({ result }) {


    const risk = result.risk_analysis;

    const biomechanics = result.average_biomechanics;



    return (

        <div className="risk-result">


            {/* Risk Summary */}

            <div className="risk-summary">


                <div className="risk-circle">


                    <h1>
                        {risk.risk_score}
                    </h1>


                    <span>
                        {risk.risk_level}
                    </span>


                </div>




                <div className="movement-analysis">


                    <h2>
                        Movement Analysis
                    </h2>



                    <ul>

                        {
                            risk.issues.map(
                                (issue, index) => (

                                    <li key={index}>
                                        {issue}
                                    </li>

                                )
                            )
                        }

                    </ul>


                </div>


            </div>





            {/* Recommendation Section */}


            <div className="recommendations">


                <div className="recommend-card">


                    <h3>
                        POSTURE CORRECTION
                    </h3>


                    <p>
                        {risk.recommendations.posture_correction}
                    </p>


                </div>





                <div className="recommend-card">


                    <h3>
                        EXERCISE PLAN
                    </h3>


                    <p>
                        {risk.recommendations.exercise_plan}
                    </p>


                </div>





                <div className="recommend-card">


                    <h3>
                        RECOVERY PLAN
                    </h3>


                    <p>
                        {risk.recommendations.recovery_plan}
                    </p>


                </div>



            </div>





            {/* Biomechanical Metrics */}


            <div className="metrics-section">


                <h2>
                    Biomechanical Metrics
                </h2>




                <div className="metrics-grid">



                    <div className="metric-card">

                        <h3>
                            Knee Angle
                        </h3>

                        <p>
                            {biomechanics.left_knee_angle?.toFixed(2)}°
                        </p>

                    </div>




                    <div className="metric-card">

                        <h3>
                            Hip Angle
                        </h3>

                        <p>
                            {biomechanics.hip_angle?.toFixed(2)}°
                        </p>

                    </div>





                    <div className="metric-card">

                        <h3>
                            Ankle Angle
                        </h3>

                        <p>
                            {biomechanics.ankle_angle?.toFixed(2)}°
                        </p>

                    </div>





                    <div className="metric-card">

                        <h3>
                            Shoulder Angle
                        </h3>

                        <p>
                            {biomechanics.shoulder_angle?.toFixed(2)}°
                        </p>

                    </div>



                </div>



            </div>




        </div>

    );

}



export default RiskResult;
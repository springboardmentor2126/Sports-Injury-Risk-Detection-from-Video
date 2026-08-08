import os
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle
)

# ---------------------------------------------------------
# Generate Biomechanics PDF Report
# ---------------------------------------------------------

def generate_biomechanics_report(
    athlete_name,
    filename,
    total_frames,
    detected_frames,
    metrics,
    movement_quality,
    output_folder="reports",
    athlete_profile=None,
    injury_risks=None,
    risk_score_summary=None
):
    os.makedirs(output_folder, exist_ok=True)

    report_path = os.path.join(
        output_folder,
        f"{athlete_name.replace(' ','_')}_report.pdf"
    )

    # Use a clean 0.75-inch margin (54 points)
    document = SimpleDocTemplate(
        report_path,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Title'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#0F172A'),
        alignment=0, # Left-aligned
        spaceAfter=15
    )
    
    h1_style = ParagraphStyle(
        'Heading1',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#1E3A8A'),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'Body',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceAfter=8
    )

    elements = []

    # 1. Header & Title
    elements.append(Paragraph("<b>Sports Injury Risk Analysis Report</b>", title_style))
    elements.append(Spacer(1, 10))

    # 2. Athlete Information Table
    profile = athlete_profile or {}
    athlete_data = [
        [
            Paragraph("<b>Athlete Information</b>", h1_style), 
            Paragraph("<b>Session Metadata</b>", h1_style)
        ],
        [
            Paragraph(f"<b>Name / ID:</b> {athlete_name} (ID: {profile.get('athlete_id', 'N/A')})", body_style),
            Paragraph(f"<b>Video File:</b> {filename}", body_style)
        ],
        [
            Paragraph(f"<b>Sport / Position:</b> {profile.get('sport_type', 'N/A')} ({profile.get('position', 'N/A')})", body_style),
            Paragraph(f"<b>Processed:</b> {datetime.now().strftime('%d-%m-%Y %H:%M')}", body_style)
        ],
        [
            Paragraph(f"<b>Age / Ht / Wt:</b> {profile.get('age', 'N/A')} yrs / {profile.get('height', 'N/A')} cm / {profile.get('weight', 'N/A')} kg", body_style),
            Paragraph(f"<b>Pose Detection Frames:</b> {detected_frames} / {total_frames} frames", body_style)
        ]
    ]
    
    info_table = Table(athlete_data, colWidths=[250, 250])
    info_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LINEBELOW', (0,0), (1,0), 1, colors.HexColor('#CBD5E1')),
        ('LINEBELOW', (0,3), (1,3), 1, colors.HexColor('#94A3B8'))
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 15))

    # 3. Overall Risk Score & Summary
    if risk_score_summary:
        score = risk_score_summary.get("overall_score", 0.0)
        level = risk_score_summary.get("risk_level", "Low")
        breakdown = risk_score_summary.get("breakdown", {})
        
        # Color coding risk level
        level_colors = {
            "Low": "#22C55E",
            "Moderate": "#F59E0B",
            "High": "#EF4444",
            "Critical": "#991B1B"
        }
        level_color = level_colors.get(level, "#000000")
        
        elements.append(Paragraph("<b>Injury Risk Evaluation</b>", h1_style))
        
        risk_data = [
            [
                Paragraph(f"<font size=28 color='{level_color}'><b>{score}%</b></font><br/><b>OVERALL RISK SCORE: {level.upper()}</b>", body_style),
                Paragraph(
                    f"<b>Weighted Risk Score Factors:</b><br/>"
                    f"• Biomechanical Deviations (35%): {breakdown.get('biomechanical_deviations', 0)}%<br/>"
                    f"• Movement Asymmetry (20%): {breakdown.get('movement_asymmetry', 0)}%<br/>"
                    f"• Historical Injury Factors (20%): {breakdown.get('historical_factors', 0)}%<br/>"
                    f"• Training Load Indicators (15%): {breakdown.get('training_load', 0)}%<br/>"
                    f"• Fatigue Indicators (10%): {breakdown.get('fatigue', 0)}%", 
                    body_style
                )
            ]
        ]
        risk_table = Table(risk_data, colWidths=[200, 300])
        risk_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('PADDING', (0,0), (-1,-1), 12),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0'))
        ]))
        elements.append(risk_table)
        elements.append(Spacer(1, 15))

    # 4. Specific Injury Category Predictions
    if injury_risks:
        elements.append(Paragraph("<b>Predicted Injury Profile</b>", h1_style))
        
        injury_table_data = [
            ["Injury Category", "Risk Level", "Probability", "Primary Contributing Factors"]
        ]
        
        for name, data in injury_risks.items():
            prob = data.get("probability", 0.0)
            lvl = data.get("risk_level", "Low")
            reasons = "<br/>".join(f"• {r}" for r in data.get("reasons", []))
            
            # Format name nicely
            display_name = name
            if name == "LowerBack": display_name = "Lower Back"
            
            injury_table_data.append([
                Paragraph(f"<b>{display_name}</b>", body_style),
                Paragraph(lvl, body_style),
                Paragraph(f"{prob}%", body_style),
                Paragraph(reasons, body_style)
            ])
            
        injury_table = Table(injury_table_data, colWidths=[90, 70, 70, 270])
        injury_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E3A8A')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0,0), (-1,-1), 6)
        ]))
        
        # Color coding text in table header
        for col in range(4):
            injury_table.setStyle(TableStyle([
                (f'TEXTCOLOR', (col, 0), (col, 0), colors.white)
            ]))
            
        elements.append(injury_table)
        elements.append(Spacer(1, 15))

    # 5. Biomechanical Joint Performance Table
    elements.append(Paragraph("<b>Biomechanical Joint Performance</b>", h1_style))
    
    # Check if metrics / range_of_motion are available
    rom_data = [
        ["Joint / Muscle", "Average Angle", "Min / Max Reached", "Range of Motion", "ROM Status"]
    ]
    
    rom_dict = movement_quality.get("range_of_motion", {}) if isinstance(movement_quality, dict) else {}
    if not rom_dict and isinstance(metrics, dict) and "left_knee" in metrics:
        # Check if sequence ROM exists in metrics
        rom_dict = metrics
        
    # If ROM is detailed (sequence-based)
    if rom_dict and isinstance(list(rom_dict.values())[0], dict):
        for joint, stats in rom_dict.items():
            rom_data.append([
                Paragraph(joint.replace("_"," ").title(), body_style),
                Paragraph(f"{stats.get('avg', 0.0)}°", body_style),
                Paragraph(f"{stats.get('min', 0.0)}° - {stats.get('max', 0.0)}°", body_style),
                Paragraph(f"{stats.get('rom', 0.0)}°", body_style),
                Paragraph(f"<b>{stats.get('status', 'Normal')}</b>", body_style)
            ])
    else:
        # Fallback to single-frame/old format
        for joint, angle in metrics.items():
            rom_data.append([
                Paragraph(joint.replace("_"," ").title(), body_style),
                Paragraph(f"{angle}°", body_style),
                Paragraph("N/A", body_style),
                Paragraph("N/A", body_style),
                Paragraph("Normal", body_style)
            ])
            
    rom_table = Table(rom_data, colWidths=[120, 95, 110, 95, 80])
    rom_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#475569')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('PADDING', (0,0), (-1,-1), 5)
    ]))
    elements.append(rom_table)
    elements.append(Spacer(1, 15))

    # 6. Corrective Exercises & Recommendations
    elements.append(Paragraph("<b>Corrective Recommendations</b>", h1_style))
    
    from utils.injury_risk_engine import generate_corrective_recommendations
    if injury_risks:
        recs = generate_corrective_recommendations(injury_risks)
        for rec in recs:
            elements.append(Paragraph(f"<b>{rec['category']}</b> (Freq: {rec['frequency']})", ParagraphStyle('RecCat', parent=body_style, fontName='Helvetica-Bold')))
            for ex in rec['exercises']:
                elements.append(Paragraph(f"• {ex}", body_style))
            elements.append(Spacer(1, 5))
    else:
        # Fallback
        for recommendation in movement_quality.get("feedback", ["Movement pattern appears normal."]):
            elements.append(Paragraph(f"• {recommendation}", body_style))
            
    elements.append(Spacer(1, 15))

    # 7. Footer
    elements.append(
        Paragraph(
            "<i>This is an AI-generated biomechanical screening report. Decisions regarding athletic "
            "training and clinical rehabilitation should be made in consultation with certified medical professionals.</i>",
            ParagraphStyle('FooterText', parent=body_style, fontName='Helvetica-Oblique', fontSize=8, leading=10, textColor=colors.HexColor('#64748B'))
        )
    )

    document.build(elements)
    return report_path
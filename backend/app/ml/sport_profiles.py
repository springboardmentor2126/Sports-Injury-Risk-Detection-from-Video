"""
sport_profiles.py
=================
Clinically-bounded biomechanical profiles for all 16 sports on the platform.

Sources:
- Journal of Biomechanics (2018-2023)
- American Journal of Sports Medicine � injury risk thresholds
- British Journal of Sports Medicine � sport-specific motion analysis
- NSCA guidelines / ACSM clinical ranges

Each metric defines Gaussian sampling params (mean, std) for four risk levels:
  normal / moderate / high / critical

All generated values are hard-clamped to abs_min/abs_max (anatomically impossible
values are excluded to prevent XGBoost learning garbage patterns).
"""

from dataclasses import dataclass, field
from typing import Tuple


@dataclass
class JointProfile:
    """Gaussian sampling parameters for one biomechanical measurement."""
    normal:   Tuple[float, float] = (150.0, 5.0)
    moderate: Tuple[float, float] = (138.0, 6.0)
    high:     Tuple[float, float] = (122.0, 7.0)
    critical: Tuple[float, float] = (100.0, 8.0)
    abs_min:  float = 0.0
    abs_max:  float = 185.0


@dataclass
class SportProfile:
    sport_key:         str = ""
    display_name:      str = ""
    knee_flexion:      JointProfile = field(default_factory=JointProfile)
    hip_angle:         JointProfile = field(default_factory=JointProfile)
    elbow_angle:       JointProfile = field(default_factory=JointProfile)
    shoulder_rotation: JointProfile = field(default_factory=JointProfile)
    trunk_lean:        JointProfile = field(default_factory=JointProfile)
    knee_valgus_angle: JointProfile = field(default_factory=JointProfile)
    symmetry:          JointProfile = field(default_factory=JointProfile)
    flag_rate_normal:   float = 0.03
    flag_rate_moderate: float = 0.18
    flag_rate_high:     float = 0.45
    flag_rate_critical: float = 0.78


SPORT_PROFILES: dict = {

    "BASKETBALL": SportProfile(
        sport_key="BASKETBALL", display_name="Basketball",
        knee_flexion=JointProfile(normal=(130.0,8.0), moderate=(110.0,8.0), high=(90.0,7.0),  critical=(70.0,6.0),  abs_min=40.0, abs_max=185.0),
        hip_angle=JointProfile(   normal=(155.0,7.0), moderate=(140.0,8.0), high=(125.0,7.0), critical=(110.0,8.0), abs_min=60.0, abs_max=185.0),
        elbow_angle=JointProfile( normal=(120.0,12.0),moderate=(100.0,10.0),high=(80.0,9.0),  critical=(60.0,8.0),  abs_min=30.0, abs_max=185.0),
        shoulder_rotation=JointProfile(normal=(90.0,12.0), moderate=(110.0,10.0),high=(130.0,10.0),critical=(150.0,10.0),abs_min=0.0,abs_max=180.0),
        trunk_lean=JointProfile(  normal=(12.0,4.0),  moderate=(22.0,5.0),  high=(32.0,5.0),  critical=(42.0,6.0),  abs_min=0.0,  abs_max=70.0),
        knee_valgus_angle=JointProfile(normal=(172.0,3.0),moderate=(165.0,3.0),high=(158.0,4.0),critical=(148.0,5.0),abs_min=120.0,abs_max=185.0),
        symmetry=JointProfile(    normal=(92.0,4.0),  moderate=(80.0,5.0),  high=(68.0,6.0),  critical=(55.0,7.0),  abs_min=0.0,  abs_max=100.0),
    ),

    "SOCCER": SportProfile(
        sport_key="SOCCER", display_name="Soccer",
        knee_flexion=JointProfile(normal=(138.0,7.0), moderate=(118.0,7.0), high=(98.0,7.0),  critical=(78.0,7.0),  abs_min=50.0, abs_max=185.0),
        hip_angle=JointProfile(   normal=(162.0,6.0), moderate=(148.0,7.0), high=(132.0,7.0), critical=(115.0,8.0), abs_min=70.0, abs_max=185.0),
        elbow_angle=JointProfile( normal=(140.0,10.0),moderate=(125.0,10.0),high=(108.0,9.0), critical=(88.0,8.0),  abs_min=40.0, abs_max=185.0),
        shoulder_rotation=JointProfile(normal=(75.0,10.0), moderate=(90.0,10.0), high=(108.0,10.0),critical=(128.0,10.0),abs_min=0.0,abs_max=170.0),
        trunk_lean=JointProfile(  normal=(10.0,3.0),  moderate=(20.0,4.0),  high=(30.0,4.0),  critical=(42.0,5.0),  abs_min=0.0,  abs_max=65.0),
        knee_valgus_angle=JointProfile(normal=(173.0,3.0),moderate=(166.0,3.0),high=(158.0,4.0),critical=(147.0,5.0),abs_min=120.0,abs_max=185.0),
        symmetry=JointProfile(    normal=(90.0,4.0),  moderate=(78.0,5.0),  high=(65.0,6.0),  critical=(50.0,8.0),  abs_min=0.0,  abs_max=100.0),
    ),

    "TENNIS": SportProfile(
        sport_key="TENNIS", display_name="Tennis",
        knee_flexion=JointProfile(normal=(140.0,7.0), moderate=(122.0,7.0), high=(103.0,7.0), critical=(82.0,7.0),  abs_min=50.0, abs_max=185.0),
        hip_angle=JointProfile(   normal=(158.0,6.0), moderate=(142.0,7.0), high=(126.0,7.0), critical=(110.0,8.0), abs_min=60.0, abs_max=185.0),
        elbow_angle=JointProfile( normal=(130.0,12.0),moderate=(108.0,10.0),high=(85.0,9.0),  critical=(60.0,8.0),  abs_min=30.0, abs_max=185.0),
        shoulder_rotation=JointProfile(normal=(158.0,8.0), moderate=(172.0,5.0), high=(178.0,4.0), critical=(183.0,3.0), abs_min=60.0,abs_max=185.0),
        trunk_lean=JointProfile(  normal=(18.0,5.0),  moderate=(28.0,5.0),  high=(38.0,5.0),  critical=(50.0,6.0),  abs_min=0.0,  abs_max=75.0),
        knee_valgus_angle=JointProfile(normal=(171.0,3.0),moderate=(164.0,3.0),high=(157.0,4.0),critical=(147.0,5.0),abs_min=120.0,abs_max=185.0),
        symmetry=JointProfile(    normal=(82.0,5.0),  moderate=(70.0,5.0),  high=(58.0,6.0),  critical=(45.0,7.0),  abs_min=0.0,  abs_max=100.0),
    ),

    "BASEBALL": SportProfile(
        sport_key="BASEBALL", display_name="Baseball",
        knee_flexion=JointProfile(normal=(145.0,7.0), moderate=(128.0,7.0), high=(108.0,7.0), critical=(88.0,7.0),  abs_min=50.0, abs_max=185.0),
        hip_angle=JointProfile(   normal=(155.0,7.0), moderate=(138.0,7.0), high=(120.0,7.0), critical=(103.0,8.0), abs_min=60.0, abs_max=185.0),
        elbow_angle=JointProfile( normal=(100.0,10.0),moderate=(78.0,9.0),  high=(58.0,8.0),  critical=(40.0,6.0),  abs_min=15.0, abs_max=185.0),
        shoulder_rotation=JointProfile(normal=(165.0,7.0), moderate=(175.0,4.0), high=(180.0,3.0), critical=(184.0,2.0), abs_min=80.0,abs_max=185.0),
        trunk_lean=JointProfile(  normal=(22.0,5.0),  moderate=(32.0,5.0),  high=(44.0,6.0),  critical=(56.0,7.0),  abs_min=0.0,  abs_max=80.0),
        knee_valgus_angle=JointProfile(normal=(170.0,3.0),moderate=(163.0,3.0),high=(156.0,4.0),critical=(147.0,5.0),abs_min=120.0,abs_max=185.0),
        symmetry=JointProfile(    normal=(80.0,5.0),  moderate=(68.0,5.0),  high=(56.0,6.0),  critical=(42.0,7.0),  abs_min=0.0,  abs_max=100.0),
    ),

    "AMERICAN_FOOTBALL": SportProfile(
        sport_key="AMERICAN_FOOTBALL", display_name="American Football",
        knee_flexion=JointProfile(normal=(132.0,8.0), moderate=(112.0,8.0), high=(92.0,7.0),  critical=(72.0,7.0),  abs_min=40.0, abs_max=185.0),
        hip_angle=JointProfile(   normal=(150.0,8.0), moderate=(133.0,8.0), high=(115.0,7.0), critical=(97.0,8.0),  abs_min=50.0, abs_max=185.0),
        elbow_angle=JointProfile( normal=(115.0,12.0),moderate=(93.0,10.0), high=(72.0,9.0),  critical=(52.0,8.0),  abs_min=20.0, abs_max=185.0),
        shoulder_rotation=JointProfile(normal=(95.0,12.0), moderate=(115.0,10.0),high=(135.0,10.0),critical=(155.0,10.0),abs_min=0.0,abs_max=180.0),
        trunk_lean=JointProfile(  normal=(25.0,6.0),  moderate=(38.0,6.0),  high=(50.0,6.0),  critical=(63.0,7.0),  abs_min=0.0,  abs_max=80.0),
        knee_valgus_angle=JointProfile(normal=(170.0,4.0),moderate=(162.0,4.0),high=(154.0,5.0),critical=(143.0,6.0),abs_min=110.0,abs_max=185.0),
        symmetry=JointProfile(    normal=(88.0,5.0),  moderate=(75.0,5.0),  high=(62.0,6.0),  critical=(48.0,8.0),  abs_min=0.0,  abs_max=100.0),
    ),

    "VOLLEYBALL": SportProfile(
        sport_key="VOLLEYBALL", display_name="Volleyball",
        knee_flexion=JointProfile(normal=(128.0,8.0), moderate=(108.0,8.0), high=(88.0,7.0),  critical=(68.0,7.0),  abs_min=40.0, abs_max=185.0),
        hip_angle=JointProfile(   normal=(152.0,7.0), moderate=(136.0,7.0), high=(120.0,7.0), critical=(104.0,8.0), abs_min=60.0, abs_max=185.0),
        elbow_angle=JointProfile( normal=(125.0,10.0),moderate=(105.0,9.0), high=(83.0,8.0),  critical=(62.0,7.0),  abs_min=30.0, abs_max=185.0),
        shoulder_rotation=JointProfile(normal=(130.0,10.0),moderate=(148.0,9.0),high=(162.0,8.0),critical=(176.0,6.0),abs_min=50.0,abs_max=185.0),
        trunk_lean=JointProfile(  normal=(14.0,4.0),  moderate=(24.0,5.0),  high=(34.0,5.0),  critical=(46.0,6.0),  abs_min=0.0,  abs_max=70.0),
        knee_valgus_angle=JointProfile(normal=(171.0,3.0),moderate=(163.0,3.0),high=(155.0,4.0),critical=(145.0,5.0),abs_min=120.0,abs_max=185.0),
        symmetry=JointProfile(    normal=(90.0,4.0),  moderate=(78.0,5.0),  high=(65.0,6.0),  critical=(50.0,8.0),  abs_min=0.0,  abs_max=100.0),
    ),

    "TRACK": SportProfile(
        sport_key="TRACK", display_name="Track & Field",
        knee_flexion=JointProfile(normal=(142.0,6.0), moderate=(124.0,6.0), high=(105.0,6.0), critical=(84.0,6.0),  abs_min=55.0, abs_max=185.0),
        hip_angle=JointProfile(   normal=(165.0,5.0), moderate=(150.0,6.0), high=(135.0,6.0), critical=(118.0,7.0), abs_min=80.0, abs_max=185.0),
        elbow_angle=JointProfile( normal=(90.0,8.0),  moderate=(72.0,7.0),  high=(55.0,7.0),  critical=(38.0,6.0),  abs_min=20.0, abs_max=185.0),
        shoulder_rotation=JointProfile(normal=(65.0,8.0),  moderate=(80.0,8.0),  high=(98.0,8.0),  critical=(115.0,9.0), abs_min=0.0, abs_max=160.0),
        trunk_lean=JointProfile(  normal=(8.0,3.0),   moderate=(16.0,3.0),  high=(24.0,4.0),  critical=(34.0,5.0),  abs_min=0.0,  abs_max=60.0),
        knee_valgus_angle=JointProfile(normal=(174.0,2.0),moderate=(167.0,3.0),high=(160.0,3.0),critical=(150.0,4.0),abs_min=130.0,abs_max=185.0),
        symmetry=JointProfile(    normal=(94.0,3.0),  moderate=(84.0,4.0),  high=(72.0,5.0),  critical=(57.0,6.0),  abs_min=0.0,  abs_max=100.0),
        flag_rate_normal=0.02, flag_rate_moderate=0.14, flag_rate_high=0.40, flag_rate_critical=0.72,
    ),

    "SWIMMING": SportProfile(
        sport_key="SWIMMING", display_name="Swimming",
        knee_flexion=JointProfile(normal=(145.0,7.0), moderate=(128.0,7.0), high=(110.0,7.0), critical=(90.0,7.0),  abs_min=50.0, abs_max=185.0),
        hip_angle=JointProfile(   normal=(160.0,6.0), moderate=(145.0,7.0), high=(128.0,7.0), critical=(112.0,8.0), abs_min=70.0, abs_max=185.0),
        elbow_angle=JointProfile( normal=(110.0,10.0),moderate=(90.0,9.0),  high=(70.0,8.0),  critical=(50.0,7.0),  abs_min=20.0, abs_max=185.0),
        shoulder_rotation=JointProfile(normal=(150.0,8.0), moderate=(165.0,6.0), high=(175.0,5.0), critical=(182.0,3.0), abs_min=60.0,abs_max=185.0),
        trunk_lean=JointProfile(  normal=(10.0,3.0),  moderate=(18.0,4.0),  high=(27.0,4.0),  critical=(38.0,5.0),  abs_min=0.0,  abs_max=60.0),
        knee_valgus_angle=JointProfile(normal=(172.0,3.0),moderate=(165.0,3.0),high=(157.0,4.0),critical=(147.0,5.0),abs_min=120.0,abs_max=185.0),
        symmetry=JointProfile(    normal=(93.0,3.0),  moderate=(82.0,4.0),  high=(70.0,5.0),  critical=(56.0,7.0),  abs_min=0.0,  abs_max=100.0),
    ),

    "BOXING": SportProfile(
        sport_key="BOXING", display_name="Boxing",
        knee_flexion=JointProfile(normal=(148.0,7.0), moderate=(130.0,7.0), high=(112.0,7.0), critical=(92.0,7.0),  abs_min=55.0, abs_max=185.0),
        hip_angle=JointProfile(   normal=(155.0,7.0), moderate=(138.0,7.0), high=(120.0,7.0), critical=(103.0,8.0), abs_min=60.0, abs_max=185.0),
        elbow_angle=JointProfile( normal=(155.0,12.0),moderate=(138.0,11.0),high=(115.0,10.0),critical=(88.0,9.0),  abs_min=30.0, abs_max=185.0),
        shoulder_rotation=JointProfile(normal=(100.0,12.0),moderate=(118.0,11.0),high=(135.0,10.0),critical=(155.0,10.0),abs_min=30.0,abs_max=180.0),
        trunk_lean=JointProfile(  normal=(15.0,4.0),  moderate=(25.0,5.0),  high=(36.0,5.0),  critical=(48.0,6.0),  abs_min=0.0,  abs_max=70.0),
        knee_valgus_angle=JointProfile(normal=(172.0,3.0),moderate=(165.0,3.0),high=(157.0,4.0),critical=(147.0,5.0),abs_min=120.0,abs_max=185.0),
        symmetry=JointProfile(    normal=(85.0,5.0),  moderate=(73.0,5.0),  high=(60.0,6.0),  critical=(46.0,7.0),  abs_min=0.0,  abs_max=100.0),
    ),

    "WRESTLING": SportProfile(
        sport_key="WRESTLING", display_name="Wrestling",
        knee_flexion=JointProfile(normal=(105.0,10.0),moderate=(82.0,8.0),  high=(62.0,7.0),  critical=(45.0,6.0),  abs_min=30.0, abs_max=185.0),
        hip_angle=JointProfile(   normal=(128.0,10.0),moderate=(108.0,9.0), high=(88.0,8.0),  critical=(68.0,8.0),  abs_min=40.0, abs_max=185.0),
        elbow_angle=JointProfile( normal=(110.0,12.0),moderate=(88.0,10.0), high=(66.0,9.0),  critical=(45.0,8.0),  abs_min=20.0, abs_max=185.0),
        shoulder_rotation=JointProfile(normal=(110.0,12.0),moderate=(130.0,11.0),high=(150.0,10.0),critical=(168.0,9.0),abs_min=40.0,abs_max=185.0),
        trunk_lean=JointProfile(  normal=(35.0,8.0),  moderate=(50.0,8.0),  high=(62.0,7.0),  critical=(73.0,7.0),  abs_min=0.0,  abs_max=90.0),
        knee_valgus_angle=JointProfile(normal=(168.0,4.0),moderate=(160.0,4.0),high=(150.0,5.0),critical=(140.0,6.0),abs_min=110.0,abs_max=185.0),
        symmetry=JointProfile(    normal=(80.0,6.0),  moderate=(65.0,6.0),  high=(52.0,7.0),  critical=(38.0,8.0),  abs_min=0.0,  abs_max=100.0),
        flag_rate_normal=0.06, flag_rate_moderate=0.22, flag_rate_high=0.52, flag_rate_critical=0.82,
    ),

    "RUGBY": SportProfile(
        sport_key="RUGBY", display_name="Rugby",
        knee_flexion=JointProfile(normal=(133.0,8.0), moderate=(113.0,8.0), high=(93.0,7.0),  critical=(72.0,7.0),  abs_min=40.0, abs_max=185.0),
        hip_angle=JointProfile(   normal=(148.0,8.0), moderate=(130.0,8.0), high=(113.0,7.0), critical=(95.0,8.0),  abs_min=50.0, abs_max=185.0),
        elbow_angle=JointProfile( normal=(112.0,12.0),moderate=(90.0,10.0), high=(68.0,9.0),  critical=(48.0,8.0),  abs_min=20.0, abs_max=185.0),
        shoulder_rotation=JointProfile(normal=(98.0,12.0), moderate=(118.0,11.0),high=(138.0,10.0),critical=(158.0,10.0),abs_min=0.0,abs_max=180.0),
        trunk_lean=JointProfile(  normal=(22.0,6.0),  moderate=(35.0,6.0),  high=(48.0,6.0),  critical=(62.0,7.0),  abs_min=0.0,  abs_max=80.0),
        knee_valgus_angle=JointProfile(normal=(170.0,3.0),moderate=(162.0,4.0),high=(153.0,5.0),critical=(142.0,6.0),abs_min=110.0,abs_max=185.0),
        symmetry=JointProfile(    normal=(86.0,5.0),  moderate=(73.0,5.0),  high=(60.0,6.0),  critical=(46.0,7.0),  abs_min=0.0,  abs_max=100.0),
    ),

    "HOCKEY": SportProfile(
        sport_key="HOCKEY", display_name="Hockey",
        knee_flexion=JointProfile(normal=(130.0,8.0), moderate=(110.0,8.0), high=(90.0,7.0),  critical=(70.0,7.0),  abs_min=40.0, abs_max=185.0),
        hip_angle=JointProfile(   normal=(140.0,8.0), moderate=(122.0,8.0), high=(104.0,8.0), critical=(86.0,8.0),  abs_min=50.0, abs_max=185.0),
        elbow_angle=JointProfile( normal=(118.0,10.0),moderate=(97.0,9.0),  high=(75.0,8.0),  critical=(55.0,7.0),  abs_min=25.0, abs_max=185.0),
        shoulder_rotation=JointProfile(normal=(88.0,10.0), moderate=(108.0,10.0),high=(128.0,10.0),critical=(148.0,10.0),abs_min=0.0,abs_max=175.0),
        trunk_lean=JointProfile(  normal=(28.0,5.0),  moderate=(40.0,5.0),  high=(52.0,5.0),  critical=(64.0,6.0),  abs_min=0.0,  abs_max=80.0),
        knee_valgus_angle=JointProfile(normal=(170.0,3.0),moderate=(162.0,4.0),high=(153.0,5.0),critical=(142.0,6.0),abs_min=110.0,abs_max=185.0),
        symmetry=JointProfile(    normal=(85.0,5.0),  moderate=(72.0,5.0),  high=(59.0,6.0),  critical=(44.0,8.0),  abs_min=0.0,  abs_max=100.0),
    ),

    "BADMINTON": SportProfile(
        sport_key="BADMINTON", display_name="Badminton",
        knee_flexion=JointProfile(normal=(136.0,8.0), moderate=(115.0,8.0), high=(94.0,7.0),  critical=(73.0,7.0),  abs_min=45.0, abs_max=185.0),
        hip_angle=JointProfile(   normal=(155.0,7.0), moderate=(138.0,7.0), high=(120.0,7.0), critical=(103.0,8.0), abs_min=60.0, abs_max=185.0),
        elbow_angle=JointProfile( normal=(120.0,12.0),moderate=(98.0,10.0), high=(76.0,9.0),  critical=(55.0,8.0),  abs_min=25.0, abs_max=185.0),
        shoulder_rotation=JointProfile(normal=(145.0,9.0), moderate=(160.0,7.0), high=(172.0,5.0), critical=(181.0,3.0), abs_min=55.0,abs_max=185.0),
        trunk_lean=JointProfile(  normal=(16.0,4.0),  moderate=(26.0,5.0),  high=(37.0,5.0),  critical=(49.0,6.0),  abs_min=0.0,  abs_max=70.0),
        knee_valgus_angle=JointProfile(normal=(171.0,3.0),moderate=(163.0,3.0),high=(155.0,4.0),critical=(145.0,5.0),abs_min=120.0,abs_max=185.0),
        symmetry=JointProfile(    normal=(84.0,5.0),  moderate=(72.0,5.0),  high=(59.0,6.0),  critical=(45.0,7.0),  abs_min=0.0,  abs_max=100.0),
    ),

    "GYMNASTICS": SportProfile(
        sport_key="GYMNASTICS", display_name="Gymnastics",
        knee_flexion=JointProfile(normal=(110.0,15.0),moderate=(85.0,12.0), high=(62.0,10.0), critical=(42.0,8.0),  abs_min=20.0, abs_max=185.0),
        hip_angle=JointProfile(   normal=(120.0,15.0),moderate=(95.0,12.0), high=(75.0,10.0), critical=(55.0,9.0),  abs_min=20.0, abs_max=185.0),
        elbow_angle=JointProfile( normal=(150.0,12.0),moderate=(130.0,11.0),high=(105.0,10.0),critical=(78.0,9.0),  abs_min=20.0, abs_max=185.0),
        shoulder_rotation=JointProfile(normal=(160.0,10.0),moderate=(173.0,7.0),high=(180.0,4.0),critical=(185.0,2.0),abs_min=60.0,abs_max=185.0),
        trunk_lean=JointProfile(  normal=(25.0,8.0),  moderate=(40.0,8.0),  high=(58.0,8.0),  critical=(72.0,8.0),  abs_min=0.0,  abs_max=90.0),
        knee_valgus_angle=JointProfile(normal=(168.0,4.0),moderate=(158.0,4.0),high=(148.0,5.0),critical=(137.0,6.0),abs_min=100.0,abs_max=185.0),
        symmetry=JointProfile(    normal=(90.0,5.0),  moderate=(78.0,5.0),  high=(64.0,6.0),  critical=(50.0,7.0),  abs_min=0.0,  abs_max=100.0),
        flag_rate_normal=0.05, flag_rate_moderate=0.20, flag_rate_high=0.50, flag_rate_critical=0.80,
    ),

    "CYCLING": SportProfile(
        sport_key="CYCLING", display_name="Cycling",
        knee_flexion=JointProfile(normal=(142.0,6.0), moderate=(124.0,6.0), high=(106.0,6.0), critical=(85.0,6.0),  abs_min=50.0, abs_max=185.0),
        hip_angle=JointProfile(   normal=(155.0,6.0), moderate=(138.0,6.0), high=(120.0,6.0), critical=(103.0,7.0), abs_min=60.0, abs_max=185.0),
        elbow_angle=JointProfile( normal=(130.0,10.0),moderate=(110.0,9.0), high=(88.0,8.0),  critical=(65.0,7.0),  abs_min=30.0, abs_max=185.0),
        shoulder_rotation=JointProfile(normal=(70.0,8.0),  moderate=(85.0,8.0),  high=(102.0,8.0), critical=(118.0,9.0), abs_min=0.0, abs_max=155.0),
        trunk_lean=JointProfile(  normal=(20.0,4.0),  moderate=(30.0,4.0),  high=(42.0,5.0),  critical=(54.0,6.0),  abs_min=0.0,  abs_max=70.0),
        knee_valgus_angle=JointProfile(normal=(173.0,3.0),moderate=(166.0,3.0),high=(158.0,4.0),critical=(148.0,5.0),abs_min=125.0,abs_max=185.0),
        symmetry=JointProfile(    normal=(91.0,4.0),  moderate=(80.0,4.0),  high=(68.0,5.0),  critical=(54.0,6.0),  abs_min=0.0,  abs_max=100.0),
    ),

    "CRICKET": SportProfile(
        sport_key="CRICKET", display_name="Cricket",
        knee_flexion=JointProfile(normal=(128.0,12.0),moderate=(105.0,10.0),high=(82.0,9.0),  critical=(60.0,8.0),  abs_min=35.0, abs_max=185.0),
        hip_angle=JointProfile(   normal=(150.0,8.0), moderate=(130.0,8.0), high=(112.0,8.0), critical=(93.0,8.0),  abs_min=50.0, abs_max=185.0),
        elbow_angle=JointProfile( normal=(115.0,10.0),moderate=(93.0,9.0),  high=(72.0,8.0),  critical=(52.0,7.0),  abs_min=20.0, abs_max=185.0),
        shoulder_rotation=JointProfile(normal=(155.0,9.0), moderate=(168.0,6.0), high=(176.0,4.0), critical=(182.0,3.0), abs_min=70.0,abs_max=185.0),
        trunk_lean=JointProfile(  normal=(20.0,5.0),  moderate=(32.0,5.0),  high=(44.0,6.0),  critical=(57.0,7.0),  abs_min=0.0,  abs_max=80.0),
        knee_valgus_angle=JointProfile(normal=(170.0,3.0),moderate=(162.0,3.0),high=(154.0,4.0),critical=(143.0,5.0),abs_min=120.0,abs_max=185.0),
        symmetry=JointProfile(    normal=(82.0,5.0),  moderate=(70.0,5.0),  high=(57.0,6.0),  critical=(43.0,7.0),  abs_min=0.0,  abs_max=100.0),
    ),

    "OTHER": SportProfile(
        sport_key="OTHER", display_name="Other",
        knee_flexion=JointProfile(normal=(140.0,8.0), moderate=(122.0,8.0), high=(102.0,7.0), critical=(82.0,7.0),  abs_min=45.0, abs_max=185.0),
        hip_angle=JointProfile(   normal=(155.0,7.0), moderate=(138.0,7.0), high=(120.0,7.0), critical=(103.0,8.0), abs_min=60.0, abs_max=185.0),
        elbow_angle=JointProfile( normal=(125.0,12.0),moderate=(105.0,10.0),high=(83.0,9.0),  critical=(62.0,8.0),  abs_min=25.0, abs_max=185.0),
        shoulder_rotation=JointProfile(normal=(95.0,10.0), moderate=(115.0,10.0),high=(135.0,10.0),critical=(155.0,10.0),abs_min=0.0,abs_max=180.0),
        trunk_lean=JointProfile(  normal=(12.0,4.0),  moderate=(22.0,5.0),  high=(33.0,5.0),  critical=(45.0,6.0),  abs_min=0.0,  abs_max=70.0),
        knee_valgus_angle=JointProfile(normal=(172.0,3.0),moderate=(165.0,3.0),high=(157.0,4.0),critical=(147.0,5.0),abs_min=120.0,abs_max=185.0),
        symmetry=JointProfile(    normal=(88.0,5.0),  moderate=(76.0,5.0),  high=(63.0,6.0),  critical=(48.0,7.0),  abs_min=0.0,  abs_max=100.0),
    ),
}

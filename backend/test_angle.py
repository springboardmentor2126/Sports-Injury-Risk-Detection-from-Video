from ai.angle_calculator import AngleCalculator

# Example coordinates
hip = (300, 250)
knee = (300, 350)
ankle = (350, 450)

angle = AngleCalculator.calculate_angle(
    hip,
    knee,
    ankle
)

print("Knee Angle:", angle)
import math


def calculate_angle(a, b, c):
    """
    Calculate angle between three points.

    a = first point
    b = joint point
    c = third point
    """

    radians = math.atan2(
        c[1] - b[1],
        c[0] - b[0]
    ) - math.atan2(
        a[1] - b[1],
        a[0] - b[0]
    )

    angle = abs(radians * 180.0 / math.pi)

    if angle > 180:
        angle = 360 - angle

    return angle
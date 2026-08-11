import numpy as np


class AngleCalculator:

    @staticmethod
    def calculate_angle(a, b, c):
        """
        Calculate angle ABC in degrees.
        a, b, c are (x, y) coordinates.
        """

        a = np.array(a)
        b = np.array(b)
        c = np.array(c)

        ba = a - b
        bc = c - b

        cosine = np.dot(ba, bc) / (
            np.linalg.norm(ba) * np.linalg.norm(bc)
        )

        cosine = np.clip(cosine, -1.0, 1.0)

        angle = np.degrees(np.arccos(cosine))

        return round(float(angle), 2)
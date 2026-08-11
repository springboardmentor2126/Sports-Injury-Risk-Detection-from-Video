from predict import predict_injury

sample = {

    "left_knee":130,
    "right_knee":128,

    "left_hip":165,
    "right_hip":162,

    "left_shoulder":170,
    "right_shoulder":168,

    "left_elbow":145,
    "right_elbow":143,

    "symmetry":92,

    "age":23,

    "experience":5,

    "previous_injuries":1,

    "movement":1
}

print(predict_injury(sample))
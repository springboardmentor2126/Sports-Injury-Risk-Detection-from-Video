from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from database.db import db
from models.athlete import Athlete

athlete = Blueprint("athlete", __name__)


# Create Athlete Profile
@athlete.route("/create", methods=["POST"])
@jwt_required()
def create_profile():

    current_user = int(get_jwt_identity())

    data = request.get_json()

    existing = Athlete.query.filter_by(user_id=current_user).first()

    if existing:
        return jsonify({"message": "Athlete profile already exists"}), 400

    athlete_data = Athlete(
        user_id=current_user,
        age=data["age"],
        gender=data["gender"],
        height=data["height"],
        weight=data["weight"],
        sport=data["sport"],
        experience=data["experience"],
        dominant_leg=data["dominant_leg"],
        medical_history=data["medical_history"]
    )

    db.session.add(athlete_data)
    db.session.commit()

    return jsonify({"message": "Athlete Profile Created Successfully"}), 201


# Get Athlete Profile
@athlete.route("/<int:user_id>", methods=["GET"])
@jwt_required()
def get_profile(user_id):

    athlete_data = Athlete.query.filter_by(user_id=user_id).first()

    if athlete_data is None:
        return jsonify({"message": "Profile not found"}), 404

    return jsonify({
        "id": athlete_data.id,
        "user_id": athlete_data.user_id,
        "age": athlete_data.age,
        "gender": athlete_data.gender,
        "height": athlete_data.height,
        "weight": athlete_data.weight,
        "sport": athlete_data.sport,
        "experience": athlete_data.experience,
        "dominant_leg": athlete_data.dominant_leg,
        "medical_history": athlete_data.medical_history,
        "created_at": athlete_data.created_at
    })


# Update Athlete Profile
@athlete.route("/update/<int:user_id>", methods=["PUT"])
@jwt_required()
def update_profile(user_id):

    athlete_data = Athlete.query.filter_by(user_id=user_id).first()

    if athlete_data is None:
        return jsonify({"message": "Profile not found"}), 404

    data = request.get_json()

    athlete_data.age = data["age"]
    athlete_data.gender = data["gender"]
    athlete_data.height = data["height"]
    athlete_data.weight = data["weight"]
    athlete_data.sport = data["sport"]
    athlete_data.experience = data["experience"]
    athlete_data.dominant_leg = data["dominant_leg"]
    athlete_data.medical_history = data["medical_history"]

    db.session.commit()

    return jsonify({"message": "Profile Updated Successfully"})


# Delete Athlete Profile
@athlete.route("/delete/<int:user_id>", methods=["DELETE"])
@jwt_required()
def delete_profile(user_id):

    athlete_data = Athlete.query.filter_by(user_id=user_id).first()

    if athlete_data is None:
        return jsonify({"message": "Profile not found"}), 404

    db.session.delete(athlete_data)
    db.session.commit()

    return jsonify({"message": "Profile Deleted Successfully"})


# Get All Athletes
@athlete.route("/all", methods=["GET"])
@jwt_required()
def get_all_athletes():

    athletes = Athlete.query.all()

    return jsonify([
        {
            "id": athlete.id,
            "user_id": athlete.user_id,
            "age": athlete.age,
            "gender": athlete.gender,
            "height": athlete.height,
            "weight": athlete.weight,
            "sport": athlete.sport,
            "experience": athlete.experience,
            "dominant_leg": athlete.dominant_leg,
            "medical_history": athlete.medical_history,
            "created_at": athlete.created_at
        }
        for athlete in athletes
    ])
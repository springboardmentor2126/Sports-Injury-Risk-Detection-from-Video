from flask import Blueprint, request, jsonify
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token

from database.db import db
from models.user import User

auth = Blueprint("auth", __name__)
bcrypt = Bcrypt()


@auth.route("/register", methods=["POST"])
def register():

    data = request.get_json()

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"message": "Email already exists"}), 400

    hashed_password = bcrypt.generate_password_hash(
        data["password"]
    ).decode("utf-8")

    user = User(
        name=data["name"],
        email=data["email"],
        password=hashed_password,
        role=data["role"]
    )

    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "Registration Successful"}), 201


@auth.route("/login", methods=["POST"])
def login():

    data = request.get_json()

    user = User.query.filter_by(email=data["email"]).first()

    if user and bcrypt.check_password_hash(
        user.password,
        data["password"]
    ):

        token = create_access_token(identity=str(user.id))

        return jsonify({
            "token": token,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role
            }
        })

    return jsonify({"message": "Invalid email or password"}), 401
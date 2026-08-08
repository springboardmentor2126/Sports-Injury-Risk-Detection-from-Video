from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html


from app.database.connection import get_connection

from app.routes.user_routes import router as user_router
from app.routes.video_routes import router as video_router



app = FastAPI(
    title="Sports Injury Risk Detection API",
    version="1.0.0",
    docs_url=None,
    redoc_url=None
)



app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174"
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)



@app.on_event("startup")
def startup():

    connection = get_connection()

    if connection:

        print("Database connection successful!")

        connection.close()



# Custom Swagger
@app.get("/docs", include_in_schema=False)
def swagger():

    return get_swagger_ui_html(

        openapi_url="/openapi.json",

        title="Sports Injury Risk Detection API"

    )



# Custom ReDoc
@app.get("/redoc", include_in_schema=False)
def redoc():

    return get_redoc_html(

        openapi_url="/openapi.json",

        title="Sports Injury Risk Detection API"

    )



# Routes

app.include_router(user_router)

app.include_router(video_router)



@app.get("/")
def home():

    return {

        "message":
        "Welcome to Sports Injury Risk Detection API"

    }
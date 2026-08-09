import os


def get_app_settings() -> dict:
    return {
        'app_name': os.getenv('APP_NAME', 'Sports Injury Risk Detection API'),
        'app_env': os.getenv('APP_ENV', 'development'),
        'host': os.getenv('APP_HOST', '127.0.0.1'),
        'port': int(os.getenv('APP_PORT', '8000')),
    }

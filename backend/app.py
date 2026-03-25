from __future__ import annotations

from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from .config import Config
from .extensions import db, jwt, migrate
from .routes import api


def create_app() -> Flask:
    load_dotenv()
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, origins=app.config["CORS_ORIGINS"], supports_credentials=False)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    app.register_blueprint(api)

    @app.get("/health")
    def health():
        return jsonify({"ok": True})

    @app.errorhandler(404)
    def not_found(_e):
        return jsonify({"error": "Not found"}), 404

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)


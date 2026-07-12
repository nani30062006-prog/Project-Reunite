"""
Project Reunite — Flask Backend
AI-Powered Missing Person Identification System

REST API Endpoints:
    GET    /                        — Welcome
    GET    /api/health              — Health check
    POST   /api/cases               — Create case (with optional photo)
    GET    /api/cases               — List all cases
    GET    /api/cases/<case_id>     — Get single case
    PUT    /api/cases/<case_id>     — Update case
    DELETE /api/cases/<case_id>     — Delete case
    GET    /api/stats               — Dashboard statistics
"""

import os
import uuid
import logging
from datetime import datetime

from flask import Flask, request, jsonify
from flask_cors import CORS
import boto3
from botocore.exceptions import ClientError


# ===========================================================
# CONFIGURATION
# ===========================================================

app = Flask(__name__)

# CORS — allow frontend origins
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://127.0.0.1:5500", "http://localhost:5500",
                     "http://127.0.0.1:3000", "http://localhost:3000",
                     "null"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# AWS Configuration
REGION = os.environ.get("AWS_REGION", "us-east-1")
TABLE_NAME = os.environ.get("DYNAMODB_TABLE", "projectReuniteCases")
BUCKET_NAME = os.environ.get("S3_BUCKET", "project-reunite-images-2006")

# File Upload Limits
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)


# ===========================================================
# AWS CLIENTS
# ===========================================================

try:
    dynamodb = boto3.resource("dynamodb", region_name=REGION)
    table = dynamodb.Table(TABLE_NAME)
    s3 = boto3.client("s3", region_name=REGION)
    logger.info("AWS clients initialized (region=%s, table=%s, bucket=%s)",
                REGION, TABLE_NAME, BUCKET_NAME)
except Exception as e:
    logger.error("Failed to initialize AWS clients: %s", e)
    dynamodb = None
    table = None
    s3 = None


# ===========================================================
# HELPERS
# ===========================================================

def error_response(message, status_code=400):
    """Return a standardized error JSON response."""
    return jsonify({"success": False, "error": message}), status_code


def validate_case_data(data):
    """Validate required fields for a case."""
    errors = []
    required = ["personName", "age", "gender", "contact", "location", "missingDate"]

    for field in required:
        val = data.get(field, "")
        if not val or (isinstance(val, str) and not val.strip()):
            errors.append(f"{field} is required")

    # Age validation
    try:
        age = int(data.get("age", -1))
        if age < 0 or age > 120:
            errors.append("Age must be between 0 and 120")
    except (ValueError, TypeError):
        errors.append("Age must be a valid number")

    # Phone validation (basic)
    contact = data.get("contact", "")
    if contact and len(contact.strip()) < 7:
        errors.append("Contact number is too short")

    return errors


def validate_file(file):
    """Validate uploaded file type and size."""
    if not file or not file.filename:
        return None  # No file is OK (optional)

    # Check extension
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        return "Invalid file type. Allowed: JPEG, PNG, WebP"

    # Check MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        return "Invalid file MIME type"

    # Check size (read and seek back)
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > MAX_FILE_SIZE:
        return f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"

    return None


def upload_to_s3(file):
    """Upload file to S3 and return the public URL."""
    filename = f"{uuid.uuid4()}_{file.filename}"

    s3.upload_fileobj(
        file,
        BUCKET_NAME,
        filename,
        ExtraArgs={"ContentType": file.content_type}
    )

    url = f"https://{BUCKET_NAME}.s3.{REGION}.amazonaws.com/{filename}"
    logger.info("File uploaded to S3: %s", url)
    return url


def delete_from_s3(photo_url):
    """Delete a file from S3 given its URL."""
    if not photo_url or BUCKET_NAME not in photo_url:
        return

    try:
        key = photo_url.split(f"{BUCKET_NAME}.s3.{REGION}.amazonaws.com/")[-1]
        s3.delete_object(Bucket=BUCKET_NAME, Key=key)
        logger.info("Deleted from S3: %s", key)
    except Exception as e:
        logger.warning("Failed to delete from S3: %s", e)


# ===========================================================
# ROUTES
# ===========================================================

@app.route("/")
def home():
    """Welcome endpoint."""
    return jsonify({
        "project": "Project Reunite",
        "version": "1.0.0",
        "status": "Backend Running",
        "endpoints": [
            "GET /api/health",
            "POST /api/cases",
            "GET /api/cases",
            "GET /api/cases/<case_id>",
            "PUT /api/cases/<case_id>",
            "DELETE /api/cases/<case_id>",
            "GET /api/stats"
        ]
    })


@app.route("/api/health")
def health():
    """Health check endpoint."""
    status = {
        "success": True,
        "message": "Backend Working",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "dynamodb": "unknown",
            "s3": "unknown"
        }
    }

    # Check DynamoDB
    try:
        if table:
            table.table_status
            status["services"]["dynamodb"] = "connected"
    except Exception:
        status["services"]["dynamodb"] = "error"

    # Check S3
    try:
        if s3:
            s3.head_bucket(Bucket=BUCKET_NAME)
            status["services"]["s3"] = "connected"
    except Exception:
        status["services"]["s3"] = "error"

    return jsonify(status)


# --- CREATE CASE ---
@app.route("/api/cases", methods=["POST"])
def create_case():
    """Create a new missing person case."""
    try:
        # Handle both JSON and FormData
        if request.content_type and "multipart/form-data" in request.content_type:
            data = request.form.to_dict()
            photo_file = request.files.get("photo")
        else:
            data = request.get_json(silent=True) or {}
            photo_file = None

        # Validate
        errors = validate_case_data(data)
        if errors:
            return error_response("; ".join(errors), 400)

        # Validate file if present
        if photo_file:
            file_error = validate_file(photo_file)
            if file_error:
                return error_response(file_error, 400)

        # Generate case ID if not provided
        case_id = data.get("caseId") or f"PR-{uuid.uuid4().hex[:8].upper()}"

        # Upload photo to S3
        photo_url = ""
        if photo_file:
            try:
                photo_url = upload_to_s3(photo_file)
            except Exception as e:
                logger.error("S3 upload failed: %s", e)
                return error_response("Photo upload failed", 500)

        # Build item
        item = {
            "caseId": case_id,
            "personName": data.get("personName", "").strip(),
            "age": str(data.get("age", "")),
            "gender": data.get("gender", ""),
            "contact": data.get("contact", "").strip(),
            "location": data.get("location", "").strip(),
            "missingDate": data.get("missingDate", ""),
            "info": data.get("info", "").strip(),
            "photo": photo_url,
            "status": data.get("status", "active"),
            "createdAt": datetime.utcnow().isoformat(),
            "updatedAt": datetime.utcnow().isoformat()
        }

        # Save to DynamoDB
        table.put_item(Item=item)
        logger.info("Case created: %s", case_id)

        return jsonify({
            "success": True,
            "message": "Case created successfully",
            "caseId": case_id,
            "photoUrl": photo_url
        }), 201

    except ClientError as e:
        logger.error("DynamoDB error: %s", e)
        return error_response("Database error", 500)
    except Exception as e:
        logger.error("Unexpected error creating case: %s", e)
        return error_response("Internal server error", 500)


# --- LIST ALL CASES ---
@app.route("/api/cases", methods=["GET"])
def list_cases():
    """List all cases with optional search."""
    try:
        search = request.args.get("q", "").strip().lower()

        response = table.scan()
        items = response.get("Items", [])

        # Handle pagination for large datasets
        while "LastEvaluatedKey" in response:
            response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
            items.extend(response.get("Items", []))

        # Search filter
        if search:
            items = [i for i in items if
                     search in (i.get("personName", "")).lower() or
                     search in (i.get("location", "")).lower() or
                     search in (i.get("caseId", "")).lower()]

        # Sort by createdAt descending
        items.sort(key=lambda x: x.get("createdAt", ""), reverse=True)

        return jsonify({
            "success": True,
            "cases": items,
            "total": len(items)
        })

    except ClientError as e:
        logger.error("DynamoDB error: %s", e)
        return error_response("Database error", 500)
    except Exception as e:
        logger.error("Error listing cases: %s", e)
        return error_response("Internal server error", 500)


# --- GET SINGLE CASE ---
@app.route("/api/cases/<case_id>", methods=["GET"])
def get_case(case_id):
    """Get a single case by ID."""
    try:
        response = table.get_item(Key={"caseId": case_id})
        item = response.get("Item")

        if not item:
            return error_response("Case not found", 404)

        return jsonify({
            "success": True,
            "case": item
        })

    except ClientError as e:
        logger.error("DynamoDB error: %s", e)
        return error_response("Database error", 500)
    except Exception as e:
        logger.error("Error getting case: %s", e)
        return error_response("Internal server error", 500)


# --- UPDATE CASE ---
@app.route("/api/cases/<case_id>", methods=["PUT"])
def update_case(case_id):
    """Update an existing case."""
    try:
        data = request.get_json(silent=True) or {}

        # Check case exists
        existing = table.get_item(Key={"caseId": case_id}).get("Item")
        if not existing:
            return error_response("Case not found", 404)

        # Build update expression
        update_parts = []
        expression_values = {}
        expression_names = {}

        updatable_fields = [
            "personName", "age", "gender", "contact",
            "location", "missingDate", "info", "status"
        ]

        for field in updatable_fields:
            if field in data:
                safe_name = f"#{field}"
                safe_value = f":{field}"
                update_parts.append(f"{safe_name} = {safe_value}")
                expression_names[safe_name] = field
                expression_values[safe_value] = str(data[field]).strip() if isinstance(data[field], str) else data[field]

        if not update_parts:
            return error_response("No fields to update", 400)

        # Add updatedAt
        update_parts.append("#updatedAt = :updatedAt")
        expression_names["#updatedAt"] = "updatedAt"
        expression_values[":updatedAt"] = datetime.utcnow().isoformat()

        table.update_item(
            Key={"caseId": case_id},
            UpdateExpression="SET " + ", ".join(update_parts),
            ExpressionAttributeNames=expression_names,
            ExpressionAttributeValues=expression_values
        )

        logger.info("Case updated: %s", case_id)

        return jsonify({
            "success": True,
            "message": "Case updated successfully"
        })

    except ClientError as e:
        logger.error("DynamoDB error: %s", e)
        return error_response("Database error", 500)
    except Exception as e:
        logger.error("Error updating case: %s", e)
        return error_response("Internal server error", 500)


# --- DELETE CASE ---
@app.route("/api/cases/<case_id>", methods=["DELETE"])
def delete_case(case_id):
    """Delete a case and its S3 photo."""
    try:
        # Get case first (to delete S3 photo)
        existing = table.get_item(Key={"caseId": case_id}).get("Item")
        if not existing:
            return error_response("Case not found", 404)

        # Delete S3 photo
        photo_url = existing.get("photo", "")
        if photo_url:
            delete_from_s3(photo_url)

        # Delete from DynamoDB
        table.delete_item(Key={"caseId": case_id})
        logger.info("Case deleted: %s", case_id)

        return jsonify({
            "success": True,
            "message": "Case deleted successfully"
        })

    except ClientError as e:
        logger.error("DynamoDB error: %s", e)
        return error_response("Database error", 500)
    except Exception as e:
        logger.error("Error deleting case: %s", e)
        return error_response("Internal server error", 500)


# --- STATS ---
@app.route("/api/stats")
def get_stats():
    """Get dashboard statistics."""
    try:
        response = table.scan(Select="COUNT")
        total = response.get("Count", 0)

        # Get all items for detailed stats
        all_response = table.scan()
        items = all_response.get("Items", [])

        active = sum(1 for i in items if i.get("status") != "resolved")
        resolved = total - active

        return jsonify({
            "success": True,
            "stats": {
                "total": total,
                "active": active,
                "resolved": resolved
            }
        })

    except ClientError as e:
        logger.error("DynamoDB error: %s", e)
        return error_response("Database error", 500)
    except Exception as e:
        logger.error("Error getting stats: %s", e)
        return error_response("Internal server error", 500)


# ===========================================================
# RUN
# ===========================================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "true").lower() == "true"

    logger.info("Starting Project Reunite Backend on port %d (debug=%s)", port, debug)

    app.run(
        host="0.0.0.0",
        port=port,
        debug=debug
    )
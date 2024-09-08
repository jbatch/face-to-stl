from concurrent.futures import ThreadPoolExecutor
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import cv2
import numpy as np
import base64
from PIL import Image
from stl import mesh
import tempfile
import os
import logging
import time
from functools import lru_cache
import psutil

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

logger.debug("Starting app initialization")
start_time = time.time()

app = Flask(__name__, static_folder="client/build")
CORS(app)

logger.debug(f"Flask app initialized in {time.time() - start_time:.2f} seconds")


def log_memory_usage():
    process = psutil.Process(os.getpid())
    mem_info = process.memory_info()
    logger.debug(f"Memory usage: {mem_info.rss / 1024 / 1024:.2f} MB")


# Lazy-loaded rembg model
@lru_cache(maxsize=1)
def get_rembg_model():
    logger.debug("Loading rembg model (u2net_lite)")
    log_memory_usage()
    from rembg import new_session

    log_memory_usage()

    return new_session("u2net_lite")


def remove_background(image):
    # Convert cv2 image to PIL Image
    pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

    # Use the model to remove the background
    model = get_rembg_model()
    from rembg import remove

    # Remove background
    pil_image_nobg = remove(pil_image, session=model)

    # Convert back to numpy array
    np_image_nobg = np.array(pil_image_nobg)

    # Convert to grayscale
    gray = cv2.cvtColor(np_image_nobg, cv2.COLOR_RGBA2GRAY)

    return gray


def apply_threshold(image, threshold_value):
    # Apply threshold to make it monochrome
    _, binary = cv2.threshold(image, threshold_value, 255, cv2.THRESH_BINARY)

    # Apply morphological operations to clean up the result
    kernel = np.ones((3, 3), np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

    return binary


def generate_stl(
    image,
    base_height=5,
    image_height=2,
    pixel_size=0.1,
    object_height=40,
    object_width=70,
):
    # Get image dimensions
    height, width = image.shape

    # Calculate scaling factors
    scale_x = object_width / (width * pixel_size)
    scale_y = object_height / (height * pixel_size)

    # Create 3D points for base and top
    x = np.arange(width) * pixel_size * scale_x
    y = np.arange(height) * pixel_size * scale_y
    xx, yy = np.meshgrid(x, y)

    # Create base points
    base_points = np.dstack((xx, yy, np.zeros_like(xx)))

    # Create top points
    top_z = np.where(image > 0, base_height + image_height, base_height)
    top_points = np.dstack((xx, yy, top_z))

    # Combine all points
    points = np.vstack((base_points.reshape(-1, 3), top_points.reshape(-1, 3)))

    # Create faces (rest of the function remains the same)
    faces = []

    # Base faces
    for i in range(height - 1):
        for j in range(width - 1):
            v1 = i * width + j
            v2 = (i + 1) * width + j
            v3 = i * width + (j + 1)
            v4 = (i + 1) * width + (j + 1)
            faces.extend([[v1, v2, v3], [v3, v2, v4]])

    # Top faces
    top_offset = height * width
    for i in range(height - 1):
        for j in range(width - 1):
            v1 = top_offset + i * width + j
            v2 = top_offset + (i + 1) * width + j
            v3 = top_offset + i * width + (j + 1)
            v4 = top_offset + (i + 1) * width + (j + 1)
            faces.extend([[v1, v3, v2], [v2, v3, v4]])

    # Side faces
    for i in range(height - 1):
        v1 = i * width
        v2 = (i + 1) * width
        v3 = top_offset + i * width
        v4 = top_offset + (i + 1) * width
        faces.extend([[v1, v2, v3], [v2, v4, v3]])

        v1 = (i + 1) * width - 1
        v2 = (i + 2) * width - 1
        v3 = top_offset + (i + 1) * width - 1
        v4 = top_offset + (i + 2) * width - 1
        faces.extend([[v1, v3, v2], [v2, v3, v4]])

    for j in range(width - 1):
        v1 = j
        v2 = j + 1
        v3 = top_offset + j
        v4 = top_offset + j + 1
        faces.extend([[v1, v3, v2], [v2, v3, v4]])

        v1 = (height - 1) * width + j
        v2 = (height - 1) * width + j + 1
        v3 = top_offset + (height - 1) * width + j
        v4 = top_offset + (height - 1) * width + j + 1
        faces.extend([[v1, v2, v3], [v2, v4, v3]])

    # Create the mesh
    faces = np.array(faces)
    cube = mesh.Mesh(np.zeros(faces.shape[0], dtype=mesh.Mesh.dtype))
    for i, f in enumerate(faces):
        for j in range(3):
            cube.vectors[i][j] = points[f[j], :]

    # Ensure consistent normals
    cube.normals = None
    cube.update_normals()

    return cube


@app.route("/process-images", methods=["POST"])
def process_images():
    log_memory_usage()
    logger.debug("Starting image processing")
    if "image" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    # Read the image
    img = cv2.imdecode(np.frombuffer(file.read(), np.uint8), cv2.IMREAD_UNCHANGED)

    # Get parameters from the request
    min_threshold = int(request.form.get("min_threshold", 64))
    max_threshold = int(request.form.get("max_threshold", 192))
    num_thresholds = int(request.form.get("num_thresholds", 5))

    # Generate equally spaced thresholds
    thresholds = np.linspace(min_threshold, max_threshold, num_thresholds).astype(int)

    # Remove background once
    gray_no_bg = remove_background(img)

    # Process images in parallel
    with ThreadPoolExecutor() as executor:
        processed_images = list(
            executor.map(lambda t: apply_threshold(gray_no_bg, t), thresholds)
        )

    # Convert processed images to base64
    img_base64_list = []
    for processed_img in processed_images:
        _, buffer = cv2.imencode(".png", processed_img)
        img_base64 = base64.b64encode(buffer).decode("utf-8")
        img_base64_list.append(img_base64)

    log_memory_usage()
    logger.debug("Image processing completed")

    return jsonify(
        {"processedImages": img_base64_list, "thresholds": thresholds.tolist()}
    )


@app.route("/generate-stl", methods=["POST"])
def generate_stl_file():
    if "image" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    # Read the image
    img = cv2.imdecode(np.frombuffer(file.read(), np.uint8), cv2.IMREAD_UNCHANGED)

    # Get parameters from the request
    object_height = float(request.form.get("object_height", 70))
    object_width = float(request.form.get("object_width", 40))

    # Generate STL file
    logger.debug("Generating STL")
    stl_mesh = generate_stl(img, object_height=object_height, object_width=object_width)

    # Save STL to a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".stl") as tmp_file:
        stl_mesh.save(tmp_file.name)

        # Read the temporary file and encode to base64
        with open(tmp_file.name, "rb") as f:
            stl_base64 = base64.b64encode(f.read()).decode("utf-8")

    # Remove the temporary file
    os.unlink(tmp_file.name)

    return jsonify({"stlFile": stl_base64})


# Serve React App
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    if path != "" and os.path.exists(app.static_folder + "/" + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, "index.html")


logger.debug(f"Total app initialization time: {time.time() - start_time:.2f} seconds")

if __name__ == "__main__":
    # This block will only execute if the script is run directly
    # It won't run when the application is started by Gunicorn
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)

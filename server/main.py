import io
import os
import cv2
import numpy as np
import base64
import tempfile
import logging
import time
from functools import lru_cache
import psutil
from concurrent.futures import ThreadPoolExecutor
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from PIL import Image
from generate_stl import generate_stl, generate_stl_from_heightmap
from color import quantize_colors

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


@lru_cache(maxsize=1)
def get_rembg_model():
    logger.debug("Loading rembg model (u2net_lite)")
    log_memory_usage()
    from rembg import new_session

    log_memory_usage()
    return new_session("u2net_lite")


def remove_background(image, remove_bg=True):
    if remove_bg:
        pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        model = get_rembg_model()
        from rembg import remove

        pil_image_nobg = remove(pil_image, session=model)
        np_image_nobg = np.array(pil_image_nobg)

        gray = cv2.cvtColor(np_image_nobg, cv2.COLOR_RGBA2GRAY)
    else:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    return gray


def apply_threshold(image, threshold_value):
    _, binary = cv2.threshold(image, threshold_value, 255, cv2.THRESH_BINARY)
    kernel = np.ones((3, 3), np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
    return binary


@app.route("/process-images", methods=["POST"])
def process_images():
    log_memory_usage()
    logger.debug("Starting image processing")
    if "image" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    img = cv2.imdecode(np.frombuffer(file.read(), np.uint8), cv2.IMREAD_UNCHANGED)

    min_threshold = int(request.form.get("min_threshold", 64))
    max_threshold = int(request.form.get("max_threshold", 192))
    num_thresholds = int(request.form.get("num_thresholds", 5))
    remove_bg = request.form.get("remove_bg", "true").lower() == "true"  # Add this line

    thresholds = np.linspace(min_threshold, max_threshold, num_thresholds).astype(int)

    gray_no_bg = remove_background(img, remove_bg)

    with ThreadPoolExecutor() as executor:
        processed_images = list(
            executor.map(lambda t: apply_threshold(gray_no_bg, t), thresholds)
        )

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
    bend_factor = float(request.form.get("bend_factor", 0))
    invert_mask = request.form.get("invert_mask", "false").lower() == "true"

    # Generate STL file
    logger.debug("Generating STL")
    stl_mesh = generate_stl(
        img,
        object_height=object_height,
        object_width=object_width,
        bend_factor=bend_factor,
        invert_mask=invert_mask,
    )

    # Save STL to a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".stl") as tmp_file:
        stl_mesh.export(tmp_file.name)

        # Read the temporary file and encode to base64
        with open(tmp_file.name, "rb") as f:
            stl_base64 = base64.b64encode(f.read()).decode("utf-8")

    # Remove the temporary file
    os.unlink(tmp_file.name)

    return jsonify({"stlFile": stl_base64})


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    if path != "" and os.path.exists(app.static_folder + "/" + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, "index.html")


@app.route("/static-stl", methods=["GET"])
def get_static_stl():
    stl_file_path = "../client/public/output.stl"  # Make sure this matches the path where your generate_stl.py script saves the file
    if os.path.exists(stl_file_path):
        return send_file(stl_file_path, as_attachment=True)
    else:
        return jsonify({"error": "STL file not found"}), 404


@app.route("/quantize-colors", methods=["POST"])
def quantize_image_colors():
    if "image" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    # Get the number of colors from the request
    n_colors = int(
        request.form.get("n_colors", 4)
    )  # Default to 4 colors if not specified

    # Read the image
    img = Image.open(file.stream)

    # Quantize colors
    quantized_img, color_palette = quantize_colors(img, n_colors)

    # Convert the quantized image to base64
    buffered = io.BytesIO()
    quantized_img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()

    return jsonify({"quantized_image": img_str, "color_palette": color_palette})


@app.route("/generate-stl-from-heightmap", methods=["POST"])
def generate_stl_from_heightmap_api():
    if "image" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    # Get parameters from the request
    color_palette = request.form.get("color_palette")
    if not color_palette:
        return jsonify({"error": "Color palette not provided"}), 400

    try:
        color_palette = [
            tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))
            for h in color_palette.split(",")
        ]
    except ValueError:
        return jsonify({"error": "Invalid color palette format"}), 400

    object_height = float(request.form.get("object_height", 40))
    object_width = float(request.form.get("object_width", 70))

    # Read the image
    img = Image.open(file.stream)

    # Convert to numpy array
    height_map_image = np.array(img)

    # Generate STL
    stl_mesh = generate_stl_from_heightmap(
        height_map_image,
        color_palette,
        object_height=object_height,
        object_width=object_width,
    )

    # Save STL to a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".stl") as tmp_file:
        stl_mesh.export(tmp_file.name)

        # Read the temporary file and encode to base64
        with open(tmp_file.name, "rb") as f:
            stl_base64 = base64.b64encode(f.read()).decode("utf-8")

    # Remove the temporary file
    os.unlink(tmp_file.name)

    return jsonify({"stlFile": stl_base64})


logger.debug(f"Total app initialization time: {time.time() - start_time:.2f} seconds")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)

import numpy as np
import cv2
import trimesh


def calculate_reduction_factor(current_faces, target_faces):
    if current_faces <= target_faces:
        return 1.0  # No reduction needed
    return min(0.99, 1 - (target_faces / current_faces))


def generate_stl(
    image_path,
    output_path,
    base_height=5,
    image_height=2,
    pixel_size=0.1,
    object_height=40,
    object_width=70,
    simplification_factor=1,
    target_faces=10000,
):
    # Read the image
    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)

    # Apply threshold to make it binary
    _, image = cv2.threshold(image, 128, 255, cv2.THRESH_BINARY)

    # Simplify the image if factor > 1
    if simplification_factor > 1:
        height, width = image.shape
        new_height, new_width = (
            height // simplification_factor,
            width // simplification_factor,
        )
        image = cv2.resize(
            image, (new_width, new_height), interpolation=cv2.INTER_NEAREST
        )

    # Get image dimensions
    height, width = image.shape

    # Calculate scaling factors
    scale_x = object_width / (width * pixel_size)
    scale_y = object_height / (height * pixel_size)

    # Create 3D points for base and top
    x = np.arange(width) * pixel_size * scale_x * simplification_factor
    y = np.arange(height) * pixel_size * scale_y * simplification_factor
    xx, yy = np.meshgrid(x, y)

    # Create base points
    base_points = np.dstack((xx, yy, np.zeros_like(xx)))

    # Create top points
    top_z = np.where(image > 0, base_height + image_height, base_height)
    top_points = np.dstack((xx, yy, top_z))

    # Combine all points
    points = np.vstack((base_points.reshape(-1, 3), top_points.reshape(-1, 3)))

    # Create faces
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
    for i in range(height):
        for j in range(width):
            if (
                i == 0
                or i == height - 1
                or j == 0
                or j == width - 1
                or image[i, j] != image[i - 1, j]
                or image[i, j] != image[i, j - 1]
            ):
                v1 = i * width + j
                v2 = top_offset + i * width + j

                if j < width - 1:
                    v3 = i * width + j + 1
                    v4 = top_offset + i * width + j + 1
                    faces.extend([[v1, v3, v2], [v2, v3, v4]])

                if i < height - 1:
                    v3 = (i + 1) * width + j
                    v4 = top_offset + (i + 1) * width + j
                    faces.extend([[v1, v2, v3], [v2, v4, v3]])

    # Create the mesh
    faces = np.array(faces)

    # Create a trimesh object
    mesh_trimesh = trimesh.Trimesh(vertices=points, faces=faces)

    # Calculate the reduction factor
    original_face_count = len(mesh_trimesh.faces)
    reduction_factor = calculate_reduction_factor(original_face_count, target_faces)

    # Simplify the mesh
    mesh_simplified = mesh_trimesh.simplify_quadric_decimation(reduction_factor)

    # Save the simplified mesh as STL
    mesh_simplified.export(output_path, file_type="stl")

    print(f"Original number of faces: {original_face_count}")
    print(f"Target number of faces: {target_faces}")
    print(f"Actual number of faces after simplification: {len(mesh_simplified.faces)}")
    print(f"Calculated reduction factor: {reduction_factor}")


if __name__ == "__main__":
    input_image_path = "../client/public/danny_mask.png"
    output_stl_path = "../client/public/output.stl"

    generate_stl(
        input_image_path, output_stl_path, simplification_factor=1, target_faces=100000
    )
    print(f"STL file generated and saved as {output_stl_path}")

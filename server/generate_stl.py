import cv2
import numpy as np
import trimesh
import os


def generate_stl(
    image,
    base_height=5,
    image_height=2,
    pixel_size=0.1,
    object_height=40,
    object_width=70,
    target_reduction=0.9,  # 90% reduction by default
    bend_factor=0.0,
):
    height, width = image.shape

    # Create a grid of points
    x = np.linspace(0, object_width, width)
    y = np.linspace(0, object_height, height)
    xx, yy = np.meshgrid(x, y)

    # Create base points
    base_points = np.column_stack(
        (xx.flatten(), yy.flatten(), np.full(width * height, 0))
    )

    # Create top points
    top_z = base_height + image_height * (image / 255)
    top_points = np.column_stack((xx.flatten(), yy.flatten(), top_z.flatten()))

    # Combine all points
    points = np.vstack((base_points, top_points))

    # Create faces
    faces = []

    # Create base and top faces
    for y in range(height - 1):
        for x in range(width - 1):
            i00 = y * width + x
            i10 = y * width + (x + 1)
            i01 = (y + 1) * width + x
            i11 = (y + 1) * width + (x + 1)

            # Base face (clockwise)
            faces.extend([[i00, i01, i10], [i10, i01, i11]])

            # Top face (counter-clockwise)
            i00_top = i00 + width * height
            i10_top = i10 + width * height
            i01_top = i01 + width * height
            i11_top = i11 + width * height
            faces.extend([[i00_top, i10_top, i01_top], [i10_top, i11_top, i01_top]])

    # Add side faces
    for y in range(height - 1):
        # Left side
        i0 = y * width
        i1 = (y + 1) * width
        i0_top = i0 + width * height
        i1_top = i1 + width * height
        faces.extend([[i0, i0_top, i1], [i1, i0_top, i1_top]])

        # Right side
        i0 = (y + 1) * width - 1
        i1 = (y + 2) * width - 1
        i0_top = i0 + width * height
        i1_top = i1 + width * height
        faces.extend([[i0, i1, i0_top], [i1, i1_top, i0_top]])

    for x in range(width - 1):
        # Front side
        i0 = x
        i1 = x + 1
        i0_top = i0 + width * height
        i1_top = i1 + width * height
        faces.extend([[i0, i1, i0_top], [i1, i1_top, i0_top]])

        # Back side
        i0 = (height - 1) * width + x
        i1 = (height - 1) * width + (x + 1)
        i0_top = i0 + width * height
        i1_top = i1 + width * height
        faces.extend([[i0, i0_top, i1], [i1, i0_top, i1_top]])

    # Create the initial mesh using trimesh
    mesh = trimesh.Trimesh(vertices=points, faces=faces)

    # Print initial mesh information
    print(f"Initial number of faces: {len(mesh.faces)}")

    # Simplify the mesh
    mesh = mesh.simplify_quadric_decimation(target_reduction)

    # Ensure consistent normals
    mesh.fix_normals()

    # Apply bending deformation
    if bend_factor != 0:
        vertices = mesh.vertices
        max_x = vertices[:, 0].max()
        min_x = vertices[:, 0].min()
        center_x = (max_x + min_x) / 2

        # Calculate the displacement for bending
        bend = bend_factor * ((vertices[:, 0] - center_x) / (max_x - center_x)) ** 2

        # Apply the bend to the z-coordinate (assuming z is up)
        vertices[:, 2] -= bend

        mesh.vertices = vertices

    # Rotate the piece to stand up if it is bent
    if bend_factor != 0:
        rotation_matrix = trimesh.transformations.rotation_matrix(
            np.radians(90), [1, 0, 0]
        )
        mesh.apply_transform(rotation_matrix)
        rotation_matrix = trimesh.transformations.rotation_matrix(
            np.radians(180), [0, 1, 0]
        )
        mesh.apply_transform(rotation_matrix)
    else:
        rotation_matrix = trimesh.transformations.rotation_matrix(
            np.radians(180), [0, 0, 1]
        )
        mesh.apply_transform(rotation_matrix)

    return mesh


if __name__ == "__main__":
    # Load the image mask
    input_path = os.path.join("..", "client", "public", "danny_mask.png")
    img = cv2.imread(input_path, cv2.IMREAD_GRAYSCALE)

    if img is None:
        print(f"Error: Unable to load image from {input_path}")
        exit(1)

    # Generate STL
    mesh = generate_stl(
        img, base_height=5, image_height=2, target_reduction=0.9, bend_factor=8
    )

    # Save the STL file
    output_path = os.path.join("..", "client", "public", "output.stl")
    mesh.export(output_path)

    print(f"STL file generated and saved to {output_path}")
    print(f"Final number of faces: {len(mesh.faces)}")

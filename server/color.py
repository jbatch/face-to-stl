import numpy as np
from sklearn.cluster import KMeans
from PIL import Image
from skimage import color


def quantize_colors(image, selected_colors, remap_colors_to_palette=True):
    # Convert image to numpy array
    np_image = np.array(image)

    # Reshape the image to be a list of pixels
    pixels = np_image.reshape((-1, 3))

    # Perform k-means clustering
    n_colors = len(selected_colors)
    kmeans = KMeans(n_clusters=n_colors, random_state=42)
    kmeans.fit(pixels)

    # Get the colors
    quantized_colors = kmeans.cluster_centers_

    # Sort quantized colors by lightness
    lab_colors = color.rgb2lab(quantized_colors.reshape(1, -1, 3)).reshape(-1, 3)
    sorted_indices = np.argsort(lab_colors[:, 0])
    sorted_quantized_colors = quantized_colors[sorted_indices]

    # Sort selected colors by lightness
    selected_colors = np.array(selected_colors)
    lab_selected = color.rgb2lab(selected_colors.reshape(1, -1, 3)).reshape(-1, 3)
    sorted_selected_indices = np.argsort(lab_selected[:, 0])
    sorted_selected_colors = selected_colors[sorted_selected_indices]

    if remap_colors_to_palette:
        # Create a mapping from quantized colors to selected colors
        color_map = {
            tuple(q_color): tuple(s_color)
            for q_color, s_color in zip(sorted_quantized_colors, sorted_selected_colors)
        }

        # Apply the color mapping to the image
        labels = kmeans.labels_
        new_pixels = np.array(
            [color_map[tuple(sorted_quantized_colors[label])] for label in labels],
            dtype=np.uint8,
        )
    else:
        # Use the quantized colors directly
        new_pixels = quantized_colors[kmeans.labels_].astype(np.uint8)

    # Reshape back to the original image shape
    quantized_image = new_pixels.reshape(np_image.shape)

    # Convert back to PIL Image
    quantized_pil = Image.fromarray(quantized_image)

    # Get the color palette (sorted selected colors if remapped, otherwise quantized colors)
    if remap_colors_to_palette:
        color_palette = [
            "{:02x}{:02x}{:02x}".format(int(r), int(g), int(b))
            for r, g, b in sorted_selected_colors
        ]
    else:
        color_palette = [
            "{:02x}{:02x}{:02x}".format(int(r), int(g), int(b))
            for r, g, b in quantized_colors
        ]

    return quantized_pil, color_palette

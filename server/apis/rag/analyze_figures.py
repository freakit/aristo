
import os
from PIL import Image

def analyze_images(directory):
    print(f"Analyzing images in: {directory}")
    files = sorted([f for f in os.listdir(directory) if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
    
    # Print first 5 and last 5 to see the range
    for filename in files[:10]:
        filepath = os.path.join(directory, filename)
        try:
            with Image.open(filepath) as img:
                size_kb = os.path.getsize(filepath) / 1024
                print(f"{filename}: {img.width}x{img.height} ({size_kb:.2f} KB)")
        except Exception as e:
            print(f"{filename}: Error - {e}")

if __name__ == "__main__":
    analyze_images("figures")

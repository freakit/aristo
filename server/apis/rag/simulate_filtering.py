
import os
from pathlib import Path
from PIL import Image

def simulate_filtering(directory):
    print(f"Simulating filtering in: {directory}")
    files = sorted([f for f in os.listdir(directory) if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
    
    kept = 0
    deleted = 0
    
    for filename in files:
        filepath = os.path.join(directory, filename)
        should_delete = False
        reason = ""
        
        try:
            # 1. Check file size
            file_size = os.path.getsize(filepath)
            if file_size < 3 * 1024:
                should_delete = True
                reason = f"Size too small ({file_size} bytes)"
            
            # 2. Check dimensions
            if not should_delete:
                with Image.open(filepath) as img:
                    width, height = img.size
                    if width < 50 or height < 50:
                        should_delete = True
                        reason = f"Dimensions too small ({width}x{height})"
            
            if should_delete:
                print(f"[DELETE] {filename}: {reason}")
                deleted += 1
            else:
                print(f"[KEEP]   {filename}")
                kept += 1
                
        except Exception as e:
            print(f"[ERROR]  {filename}: {e}")

    print(f"\nSummary: Would keep {kept} files, delete {deleted} files.")

if __name__ == "__main__":
    simulate_filtering("figures")

import urllib.request
import gzip
import shutil
import os
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

url = "https://object.pouta.csc.fi/OPUS-OpenSubtitles/v2018/mono/vi.txt.gz"
file_name = "vi.txt.gz"
extracted_file = "vi.txt"

if not os.path.exists(extracted_file):
    if not os.path.exists(file_name):
        print(f"Downloading {url}...")
        try:
            urllib.request.urlretrieve(url, file_name)
            print("Download complete.")
        except Exception as e:
            print(f"Failed to download from OPUS: {e}")
            exit(1)
            
    print(f"Extracting {file_name}...")
    try:
        with gzip.open(file_name, 'rb') as f_in:
            with open(extracted_file, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        print("Extraction complete.")
    except Exception as e:
        print(f"Failed to extract: {e}")
        exit(1)
else:
    print(f"{extracted_file} already exists.")
